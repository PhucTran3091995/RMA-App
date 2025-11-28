// routes/masters.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/masters/items
 * Lấy danh sách item + cost_usd mới nhất
 */
router.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        i.id,
        i.item_no AS pid,
        i.description AS name,
        ic.cost_usd AS cost
      FROM items i
      LEFT JOIN item_costs ic
        ON ic.item_id = i.id
        AND ic.effective_to IS NULL
      ORDER BY i.item_no
      LIMIT 500
    `);

        const data = rows.map((row) => ({
            id: String(row.id),
            pid: row.pid,
            name: row.name || row.pid,
            cost: row.cost || 0,
            active: true,
        }));

        res.json(data);
    } catch (err) {
        console.error('GET /api/masters/items error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/masters/customers
 * Map từ bảng buyers
 */
router.get('/customers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT id, name
      FROM buyers
      ORDER BY name
      LIMIT 500
    `);

        const data = rows.map((row) => ({
            id: String(row.id),
            code: row.name,
            name: row.name,
            type: 'Customer',
            active: true,
        }));

        res.json(data);
    } catch (err) {
        console.error('GET /api/masters/customers error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/masters/fault-codes
 * Map từ defect_positions
 */
router.get('/fault-codes', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT id, name
      FROM defect_positions
      ORDER BY name
      LIMIT 500
    `);

        const data = rows.map((row) => ({
            id: String(row.id),
            code: row.name,
            description: row.name,
            group: 'PCB',
            severity: 'Medium',
            active: true,
        }));

        res.json(data);
    } catch (err) {
        console.error('GET /api/masters/fault-codes error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
