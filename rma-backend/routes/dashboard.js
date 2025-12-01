// routes/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/dashboard/summary
 * Trả về: total, open, in_progress, closed, pending
 * Map:
 *  - open        = status_actual = 'IN'
 *  - in_progress = status_actual = 'Processing'
 *  - closed      = status_actual = 'OUT'
 *  - pending     = còn lại hoặc NULL
 */
router.get('/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status_actual = 'IN') AS open,
        SUM(status_actual = 'Processing') AS in_progress,
        SUM(status_actual = 'OUT') AS closed,
        SUM(
          status_actual IS NULL OR status_actual NOT IN ('IN','Processing','OUT')
        ) AS pending
      FROM rma_boards
    `);

        res.json(rows[0]);
    } catch (err) {
        console.error('GET /api/dashboard/summary error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/dashboard/trend?range=7d|30d|90d
 * Trả về: [{ date: '2025-11-01', count: 12 }, ...]
 */
router.get('/trend', async (req, res) => {
    try {
        const range = req.query.range || '7d';
        let days = 7;
        if (range === '30d') days = 30;
        if (range === '90d') days = 90;

        const [rows] = await pool.query(
            `
      SELECT
        DATE(rma_date) AS date,
        COUNT(*) AS count
      FROM rma_boards
      WHERE rma_date >= CURDATE() - INTERVAL ? DAY
      GROUP BY DATE(rma_date)
      ORDER BY date
      `,
            [days]
        );

        res.json(rows);
    } catch (err) {
        console.error('GET /api/dashboard/trend error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status_actual = 'IN') AS open,
        SUM(status_actual = 'Processing') AS in_progress,
        SUM(status_actual = 'OUT') AS closed,
        SUM(
          status_actual IS NULL OR status_actual NOT IN ('IN','Processing','OUT')
        ) AS pending
      FROM rma_boards
    `);

        res.json(rows[0]);
    } catch (err) {
        console.error('GET /api/dashboard/summary error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/trend-processing', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                DATE_FORMAT(rma_date, '%Y-%m-%d') AS date,
                COUNT(*) AS count
            FROM rma_boards
            WHERE status_actual = 'Processing'
              AND rma_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE_FORMAT(rma_date, '%Y-%m-%d')
            ORDER BY date ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/dashboard/trend-processing error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/distributions', async (req, res) => {
    try {
        // 1. Query lấy dữ liệu phẳng (Flat data): Buyer - Model - Count
        const [rows] = await pool.query(`
            SELECT 
                COALESCE(b.name, 'Unknown') AS buyer_name,
                COALESCE(m.name, 'Unknown') AS model_name,
                COUNT(*) AS count
            FROM rma_boards rb
            LEFT JOIN buyers b ON rb.buyer_id = b.id
            LEFT JOIN models m ON rb.model_id = m.id
            WHERE rb.status_actual = 'Processing' -- Chỉ lấy trạng thái Processing
            GROUP BY b.name, m.name
        `);

        // 2. Xử lý logic gom nhóm (Grouping) trong Javascript
        const buyerMap = {};

        rows.forEach(row => {
            const bName = row.buyer_name;
            const mName = row.model_name;
            const count = row.count;

            // Nếu Buyer chưa tồn tại trong map thì khởi tạo
            if (!buyerMap[bName]) {
                buyerMap[bName] = {
                    buyer: bName,
                    total: 0,
                    models: []
                };
            }

            // Cộng dồn tổng số lượng cho Buyer
            buyerMap[bName].total += count;

            // Thêm model vào danh sách của Buyer đó
            buyerMap[bName].models.push({
                model: mName,
                value: count
            });
        });

        // Chuyển từ Map sang Array và sắp xếp
        // 1. Sắp xếp Buyer theo tổng số lượng giảm dần
        // 2. Sắp xếp Model bên trong theo số lượng giảm dần
        const combinedData = Object.values(buyerMap)
            .sort((a, b) => b.total - a.total)
            .map(item => ({
                ...item,
                models: item.models.sort((a, b) => b.value - a.value)
            }));


        // 3. Lấy Top 10 Defect (giữ nguyên logic cũ nếu bạn vẫn muốn hiển thị bảng Defect riêng)
        const [defects] = await pool.query(`
            SELECT defect_symptom_raw AS label, COUNT(*) AS value
            FROM rma_boards
            WHERE defect_symptom_raw IS NOT NULL 
              AND defect_symptom_raw != ''
              AND status_actual = 'Processing'
            GROUP BY defect_symptom_raw
            ORDER BY value DESC
            LIMIT 10
        `);

        res.json({
            buyerBreakdown: combinedData, // Dữ liệu mới đã gộp
            byDefect: defects
        });

    } catch (err) {
        console.error('GET /api/dashboard/distributions error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/trends-breakdown', async (req, res) => {
    try {
        // 1. Trend Tháng (3 tháng gần nhất)
        const [monthly] = await pool.query(`
            SELECT 
                DATE_FORMAT(rma_date, '%Y-%m') as date,
                COUNT(*) as count
            FROM rma_boards
            WHERE status_actual = 'Processing'
              AND rma_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(rma_date, '%Y-%m')
            ORDER BY date ASC
        `);

        // 2. Trend Tuần (4 tuần gần nhất)
        // FIX ERROR 1055: Dùng MAX() bao quanh cột hiển thị để thỏa mãn only_full_group_by
        const [weekly] = await pool.query(`
            SELECT 
                MAX(CONCAT('W', DATE_FORMAT(rma_date, '%v'))) as date,
                COUNT(*) as count
            FROM rma_boards
            WHERE status_actual = 'Processing'
              AND rma_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
            GROUP BY DATE_FORMAT(rma_date, '%x-%v')
            ORDER BY DATE_FORMAT(rma_date, '%x-%v') ASC
        `);

        // 3. Trend Ngày (7 ngày gần nhất)
        const [daily] = await pool.query(`
            SELECT 
                DATE_FORMAT(rma_date, '%Y-%m-%d') as date,
                COUNT(*) as count
            FROM rma_boards
            WHERE status_actual = 'Processing'
              AND rma_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE_FORMAT(rma_date, '%Y-%m-%d')
            ORDER BY date ASC
        `);

        res.json({
            monthly,
            weekly,
            daily
        });

    } catch (err) {
        console.error('GET /api/dashboard/trends-breakdown error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
