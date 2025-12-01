// File: backend/routes/rma.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Đảm bảo đường dẫn tới file db.js đúng

// Helper: Map dữ liệu từ DB sang format Frontend cần
function mapRmaRow(row) {
    return {
        id: row.id,
        rmaNo: row.rma_no, // Logic xử lý rma_no nằm trong câu SQL
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
 * Lấy danh sách RMA (Có phân trang, tìm kiếm, lọc theo ngày/trạng thái)
 */
router.get('/', async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            startDate = '',
            endDate = '',
        } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const offset = (page - 1) * limit;

        const params = [];
        let where = 'WHERE 1=1';

        // 1. Xử lý Tìm kiếm (Search Global)
        const normalizedSearch = search.trim().toLowerCase();
        if (normalizedSearch) {
            where += `
              AND (
                LOWER(rb.main_work_order) LIKE ? OR
                LOWER(rb.main_pid) LIKE ? OR
                LOWER(rb.main_part_number) LIKE ? OR
                LOWER(b.name) LIKE ? OR
                LOWER(m.name) LIKE ? OR
                LOWER(brd.name) LIKE ? OR
                LOWER(rb.face) LIKE ? OR
                LOWER(rb.defect_symptom_raw) LIKE ? OR
                DATE_FORMAT(rb.rma_date, '%Y-%m-%d') LIKE ?
              )`;
            const like = `%${normalizedSearch}%`;
            // Push tham số cho mỗi dấu ? ở trên (9 dấu)
            params.push(like, like, like, like, like, like, like, like, like);
        }

        // 2. Xử lý Lọc theo ngày
        if (startDate) {
            where += ' AND rb.rma_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            where += ' AND rb.rma_date <= ?';
            params.push(endDate);
        }

        // 3. Xử lý Lọc theo trạng thái
        if (status && status !== 'All') {
            where += ` AND rb.status_actual = ?`;
            params.push(status);
        }

        // 4. Query Đếm tổng số bản ghi (Total Count)
        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) as total
            FROM rma_boards rb
            LEFT JOIN buyers b ON rb.buyer_id = b.id
            LEFT JOIN models m ON rb.model_id = m.id
            LEFT JOIN boards brd ON rb.board_id = brd.id
            ${where}
            `,
            params
        );
        const total = countRows[0].total;

        // 5. Query Lấy dữ liệu (Data Pagination)
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
                -- Logic rma_no: Nếu main_work_order rỗng thì tự sinh RMA-<id>
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
 * Lấy chi tiết 1 RMA
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

        // Map sang format chi tiết cho form edit/detail
        const rma = {
            id: row.id,
            rmaNo: row.main_work_order && row.main_work_order !== '' ? row.main_work_order : `RMA-${row.id}`,
            customer: row.buyer_name,
            serial: row.main_pid,
            model: row.model_name,
            status: row.status_actual,
            technician: null,
            createdDate: row.rma_date_fmt,
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
 * Tạo RMA mới (Có Transaction để xử lý Buyer/Model tự động)
 */
router.post('/', async (req, res) => {
    const conn = await pool.getConnection(); // Lấy connection để dùng transaction
    try {
        const {
            customer, // buyer name
            serial,   // main_pid
            model,    // model name
            status,   // 'IN' | 'OUT' | 'Processing'
        } = req.body;

        if (!customer || !serial || !model) {
            return res.status(400).json({ message: 'customer, serial, and model are required' });
        }

        await conn.beginTransaction();

        // 1. Xử lý Buyer (Tìm hoặc Tạo mới)
        const [buyerRows] = await conn.query(`SELECT id FROM buyers WHERE name = ?`, [customer]);
        let buyerId;
        if (buyerRows.length > 0) {
            buyerId = buyerRows[0].id;
        } else {
            const [newBuyer] = await conn.query(`INSERT INTO buyers (name) VALUES (?)`, [customer]);
            buyerId = newBuyer.insertId;
        }

        // 2. Xử lý Model (Tìm hoặc Tạo mới)
        const [modelRows] = await conn.query(`SELECT id FROM models WHERE name = ?`, [model]);
        let modelId;
        if (modelRows.length > 0) {
            modelId = modelRows[0].id;
        } else {
            const [newModel] = await conn.query(`INSERT INTO models (name) VALUES (?)`, [model]);
            modelId = newModel.insertId;
        }

        // 3. Insert vào bảng rma_boards
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

        await conn.commit(); // Lưu thay đổi
        res.status(201).json({ id: result.insertId, message: 'RMA created successfully' });

    } catch (err) {
        await conn.rollback(); // Hoàn tác nếu lỗi
        console.error('POST /api/rmas error', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        conn.release(); // Trả kết nối về pool
    }
});

/**
 * PUT /api/rmas/:id
 * Cập nhật RMA
 */
router.put('/:id', async (req, res) => {
    const conn = await pool.getConnection();
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

        await conn.beginTransaction();

        const fields = [];
        const params = [];

        // Nếu cập nhật tên Customer -> Cần tìm ID hoặc tạo mới
        if (customer) {
            const [buyerRows] = await conn.query(`SELECT id FROM buyers WHERE name = ?`, [customer]);
            let buyerId;
            if (buyerRows.length > 0) {
                buyerId = buyerRows[0].id;
            } else {
                const [newBuyer] = await conn.query(`INSERT INTO buyers (name) VALUES (?)`, [customer]);
                buyerId = newBuyer.insertId;
            }
            fields.push('buyer_id = ?');
            params.push(buyerId);
        }

        // Nếu cập nhật Model -> Cần tìm ID hoặc tạo mới
        if (model) {
            const [modelRows] = await conn.query(`SELECT id FROM models WHERE name = ?`, [model]);
            let modelId;
            if (modelRows.length > 0) {
                modelId = modelRows[0].id;
            } else {
                const [newModel] = await conn.query(`INSERT INTO models (name) VALUES (?)`, [model]);
                modelId = newModel.insertId;
            }
            fields.push('model_id = ?');
            params.push(modelId);
        }

        // Cập nhật các trường thông thường
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
            return res.json({ message: 'Nothing to update' });
        }

        const sql = `UPDATE rma_boards SET ${fields.join(', ')} WHERE id = ?`;
        params.push(id);

        await conn.query(sql, params);
        await conn.commit();

        res.json({ message: 'Updated successfully' });

    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/rmas/:id error', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        conn.release();
    }
});

/**
 * POST /api/rmas/validate
 * Kiểm tra danh sách Serial có tồn tại không (Dùng cho tính năng Check hàng loạt)
 */
router.post('/validate', async (req, res) => {
    try {
        const { serials } = req.body;

        if (!serials || !Array.isArray(serials) || serials.length === 0) {
            return res.json([]);
        }

        const placeholders = serials.map(() => '?').join(',');
        const [rows] = await pool.query(
            `
            SELECT
                rb.id,
                rb.main_pid,
                rb.status_actual,
                rb.rma_date,
                m.name AS model_name,
                b.name AS buyer_name
            FROM rma_boards rb
            LEFT JOIN models m ON rb.model_id = m.id
            LEFT JOIN buyers b ON rb.buyer_id = b.id
            WHERE rb.main_pid IN (${placeholders})
            `,
            serials
        );

        const result = rows.map(row => ({
            id: row.id,
            serial: row.main_pid,
            model: row.model_name,
            customer: row.buyer_name,
            status: row.status_actual,
            createdDate: row.rma_date ? new Date(row.rma_date).toISOString().split('T')[0] : null
        }));

        res.json(result);
    } catch (err) {
        console.error('POST /api/rmas/validate error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/rmas/confirm-clear
 * Chuyển trạng thái hàng loạt sang OUT (Thanh lý/Trả hàng)
 */
router.post('/confirm-clear', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No IDs provided' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const sql = `
            UPDATE rma_boards
            SET status_actual = 'OUT', clear_date = CURDATE()
            WHERE id IN (${placeholders})
        `;

        await pool.query(sql, ids);
        res.json({ message: 'Cleared successfully', count: ids.length });
    } catch (err) {
        console.error('POST /api/rmas/confirm-clear error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;