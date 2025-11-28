// routes/rma.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper: map DB row -> shape frontend đang dùng
function mapRmaRow(row) {
    return {
        id: row.id,
        rmaNo: row.rma_no,                 // sẽ giải thích ngay bên dưới
        customer: row.buyer_name,
        serial: row.main_pid,
        model: row.model_name,
        status: row.status_actual,
        createdDate: row.rma_date,
        technician: null,
        board: row.board_name ?? null,
        face: row.face ?? null,
        defectSymptom: row.defect_symptom_raw ?? null,
    };
}

/**
 * GET /api/rmas
 * Query: page, limit, search, status
 */
router.get('/', async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', status = '' } = req.query;
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const offset = (page - 1) * limit;

        const params = [];
        let where = 'WHERE 1=1';

        if (search) {
            where += `
        AND (
          rb.main_pid LIKE ? OR
          rb.main_part_number LIKE ? OR
          b.name LIKE ? OR
          m.name LIKE ?
        )`;
            const like = `%${search}%`;
            params.push(like, like, like, like);
        }

        if (status && status !== 'All') {
            // status_actual trong DB: 'IN', 'OUT', 'Processing', ...
            where += ` AND rb.status_actual = ?`;
            params.push(status);
        }

        // Count
        const [countRows] = await pool.query(
            `
      SELECT COUNT(*) as total
      FROM rma_boards rb
      LEFT JOIN buyers b ON rb.buyer_id = b.id
      LEFT JOIN models m ON rb.model_id = m.id
      ${where}
      `,
            params
        );
        const total = countRows[0].total;

        // Data
        const [rows] = await pool.query(
            `
      SELECT
        rb.id,
        DATE_FORMAT(rb.rma_date, '%Y-%m-%d') AS rma_date,
        b.name AS buyer_name,
        m.name AS model_name,
        brd.name AS board_name,
        rb.face,
        rb.defect_symptom_raw,
        rb.main_pid,
        rb.status_actual,
        -- rma_no: ưu tiên dùng Main Work Order, nếu null thì tạo RMA-<id>
        IF(rb.main_work_order IS NOT NULL AND rb.main_work_order <> '',
           rb.main_work_order,
           CONCAT('RMA-', rb.id)
        ) AS rma_no
      FROM rma_boards rb
      LEFT JOIN buyers b ON rb.buyer_id = b.id
      LEFT JOIN models m ON rb.model_id = m.id
      LEFT JOIN boards brd ON rb.board_id = brd.id
      ${where}
      ORDER BY rb.rma_date DESC, rb.id DESC
      LIMIT ? OFFSET ?
      `,
            [...params, limit, offset]
        );

        res.json({
            data: rows.map(mapRmaRow),
            total,
            page,
            limit,
        });
    } catch (err) {
        console.error('GET /api/rmas error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/rmas/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await pool.query(
            `
      SELECT
        rb.*,
        DATE_FORMAT(rb.rma_date, '%Y-%m-%d') AS rma_date_fmt,
        DATE_FORMAT(rb.clear_date, '%Y-%m-%d') AS clear_date_fmt,
        b.name AS buyer_name,
        m.name AS model_name,
        brd.name AS board_name
      FROM rma_boards rb
      LEFT JOIN buyers b ON rb.buyer_id = b.id
      LEFT JOIN models m ON rb.model_id = m.id
      LEFT JOIN boards brd ON rb.board_id = brd.id
      WHERE rb.id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'RMA not found' });
        }

        const row = rows[0];

        // map sang form frontend
        const rma = {
            id: row.id,
            rmaNo:
                row.main_work_order && row.main_work_order !== ''
                    ? row.main_work_order
                    : `RMA-${row.id}`,
            customer: row.buyer_name,
            serial: row.main_pid,
            model: row.model_name,
            status: row.status_actual,
            technician: null, // chưa có field
            createdDate: row.rma_date_fmt,
            // extra field nếu bạn muốn thêm vào UI
            board: row.board_name,
            qty: row.qty,
            defectSymptomRaw: row.defect_symptom_raw,
            defectSymptomFin: row.defect_symptom_fin,
            clearType: row.clear_type,
            paymentStatus: row.payment_status,
            invoiceNo: row.invoice_no,
            clearDate: row.clear_date_fmt,
        };

        res.json(rma);
    } catch (err) {
        console.error('GET /api/rmas/:id error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/rmas
 * Tạo RMA mới (bản ghi mới trong rma_boards)
 * Ở giai đoạn 1 ta làm tối giản: insert vài cột cơ bản
 */
router.post('/', async (req, res) => {
    try {
        const {
            customer, // buyer name
            serial,   // main_pid
            model,    // model name
            status,   // 'IN' | 'OUT' | 'Processing'
        } = req.body;

        if (!customer || !serial || !model) {
            return res
                .status(400)
                .json({ message: 'customer, serial, model are required' });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // đảm bảo tồn tại buyer, model
            const [buyerRows] = await conn.query(
                `SELECT id FROM buyers WHERE name = ?`,
                [customer]
            );
            let buyerId =
                buyerRows.length > 0
                    ? buyerRows[0].id
                    : (await conn.query(`INSERT INTO buyers (name) VALUES (?)`, [
                        customer,
                    ]))[0].insertId;

            const [modelRows] = await conn.query(
                `SELECT id FROM models WHERE name = ?`,
                [model]
            );
            let modelId =
                modelRows.length > 0
                    ? modelRows[0].id
                    : (await conn.query(`INSERT INTO models (name) VALUES (?)`, [
                        model,
                    ]))[0].insertId;

            const [result] = await conn.query(
                `
        INSERT INTO rma_boards (
          year, month, week,
          rma_date, issue_date,
          buyer_id, model_id,
          main_pid,
          qty,
          status_actual
        )
        VALUES (
          YEAR(CURDATE()),
          MONTH(CURDATE()),
          WEEK(CURDATE(), 1),
          CURDATE(),
          CURDATE(),
          ?, ?, ?,
          1,
          ?
        )
        `,
                [buyerId, modelId, serial, status || 'IN']
            );

            const newId = result.insertId;
            await conn.commit();

            res.status(201).json({ id: newId });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('POST /api/rmas error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * PUT /api/rmas/:id
 * Cho phép update một số field chính
 */
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const {
            customer,
            serial,
            model,
            status,
            clearDate,
            clearType,
            paymentStatus,
            invoiceNo,
        } = req.body;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // update buyer/model nếu có
            let buyerId = null;
            if (customer) {
                const [buyerRows] = await conn.query(
                    `SELECT id FROM buyers WHERE name = ?`,
                    [customer]
                );
                buyerId =
                    buyerRows.length > 0
                        ? buyerRows[0].id
                        : (await conn.query(`INSERT INTO buyers (name) VALUES (?)`, [
                            customer,
                        ]))[0].insertId;
            }

            let modelId = null;
            if (model) {
                const [modelRows] = await conn.query(
                    `SELECT id FROM models WHERE name = ?`,
                    [model]
                );
                modelId =
                    modelRows.length > 0
                        ? modelRows[0].id
                        : (await conn.query(`INSERT INTO models (name) VALUES (?)`, [
                            model,
                        ]))[0].insertId;
            }

            const fields = [];
            const params = [];

            if (buyerId) {
                fields.push('buyer_id = ?');
                params.push(buyerId);
            }
            if (modelId) {
                fields.push('model_id = ?');
                params.push(modelId);
            }
            if (serial) {
                fields.push('main_pid = ?');
                params.push(serial);
            }
            if (status) {
                fields.push('status_actual = ?');
                params.push(status);
            }
            if (clearDate) {
                fields.push('clear_date = ?');
                params.push(clearDate);
            }
            if (clearType) {
                fields.push('clear_type = ?');
                params.push(clearType);
            }
            if (paymentStatus) {
                fields.push('payment_status = ?');
                params.push(paymentStatus);
            }
            if (invoiceNo) {
                fields.push('invoice_no = ?');
                params.push(invoiceNo);
            }

            if (fields.length === 0) {
                await conn.rollback();
                return res.status(400).json({ message: 'Nothing to update' });
            }

            const sql = `UPDATE rma_boards SET ${fields.join(', ')} WHERE id = ?`;
            params.push(id);

            await conn.query(sql, params);
            await conn.commit();

            res.json({ message: 'Updated' });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('PUT /api/rmas/:id error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
