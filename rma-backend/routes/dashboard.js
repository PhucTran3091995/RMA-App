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

module.exports = router;
