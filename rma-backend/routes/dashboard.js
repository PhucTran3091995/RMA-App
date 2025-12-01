// File: backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Đảm bảo đường dẫn tới file db.js đúng

// API: Lấy thống kê Dashboard
router.get('/stats', async (req, res) => {
    try {
        const { buyer } = req.query;
        let buyerCondition = '';
        const params = [];
        
        if (buyer && buyer !== 'all') {
            buyerCondition = 'WHERE buyer = ?';
            params.push(buyer);
        }

        // 1. Thống kê Cards
        const [cardStats] = await pool.query(`
            SELECT 
                COUNT(*) as totalReceived,
                SUM(CASE WHEN status_actual = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status_actual = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status_actual = 'pending' THEN 1 ELSE 0 END) as pending
            FROM rma_boards
            ${buyerCondition}
        `, params);

        // 2. Buyer Breakdown
        const [buyerStats] = await pool.query(`
            SELECT buyer as name, COUNT(*) as value
            FROM rma_boards
            GROUP BY buyer
        `);

        // 3. Top 10 Lỗi
        const [defectStats] = await pool.query(`
            SELECT error_code as name, COUNT(*) as count
            FROM rma_boards
            ${buyerCondition}
            GROUP BY error_code
            ORDER BY count DESC
            LIMIT 10
        `, params);

        // 4. Monthly Stats (Logic giả lập hoặc lấy thực tế)
        const monthlyStats = []; 

        // 5. Clear Type Stats (Mới thêm)
        let clearTypeQuery = `
            SELECT clear_type as name, COUNT(*) as count
            FROM rma_boards
            WHERE status_actual = 'processing'
        `;
        if (buyer && buyer !== 'all') {
            clearTypeQuery += ` AND buyer = ?`;
        }
        clearTypeQuery += ` GROUP BY clear_type ORDER BY count DESC`;
        
        const [clearTypeStats] = await pool.query(clearTypeQuery, params);

        res.json({
            totalReceived: cardStats[0].totalReceived || 0,
            processing: cardStats[0].processing || 0,
            completed: cardStats[0].completed || 0,
            pending: cardStats[0].pending || 0,
            monthlyStats,
            buyerStats,
            defectStats,
            clearTypeStats
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;