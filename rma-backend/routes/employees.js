// routes/employees.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Lấy thông tin nhân viên theo Mã (employee_no)
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;
    
        const [rows] = await pool.query(`
            SELECT 
                id, 
                employee_no AS code, 
                full_name AS name, 
                department AS department_name 
            FROM employees
            WHERE employee_no = ?
        `, [code]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;