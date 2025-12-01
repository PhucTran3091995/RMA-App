// routes/loans.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// API Mượn hàng: Lưu danh sách PID vào bảng rma_loans
router.post('/borrow', async (req, res) => {
    try {
        const { employeeId, pids, reason } = req.body; 
        
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            
            for (const pid of pids) {
                // Lấy ID của board từ PID
                const [boards] = await conn.query('SELECT id FROM rma_boards WHERE main_pid = ?', [pid]);
                if (boards.length > 0) {
                    const boardId = boards[0].id;
                    await conn.query(`
                        INSERT INTO rma_loans (rma_board_id, borrower_id, reason, borrow_date, status)
                        VALUES (?, ?, ?, CURDATE(), 'BORROWED')
                    `, [boardId, employeeId, reason]);
                }
            }
            
            await conn.commit();
            res.json({ success: true });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// API Lấy danh sách hàng đang mượn của nhân viên
router.get('/active/:employeeCode', async (req, res) => {
    try {
        const { employeeCode } = req.params;
        
        // --- SỬA LẠI DÒNG NÀY ---
        // Thay 'e.code' thành 'e.employee_no' cho khớp với database
        const [rows] = await pool.query(`
            SELECT 
                l.id, 
                b.main_pid as pid, 
                l.borrow_date, 
                l.status,
                b.status_actual as rma_status
            FROM rma_loans l
            JOIN rma_boards b ON l.rma_board_id = b.id
            JOIN employees e ON l.borrower_id = e.id
            WHERE e.employee_no = ? AND l.status = 'BORROWED'
        `, [employeeCode]);
        // -------------------------
        
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// API Trả hàng (Confirm Return)
router.post('/return', async (req, res) => {
    try {
        const { loanIds } = req.body;
        if (!loanIds || loanIds.length === 0) return res.json({ success: true });

        const placeholders = loanIds.map(() => '?').join(',');
        await pool.query(`
            UPDATE rma_loans 
            SET status = 'RETURNED', return_date = CURDATE() 
            WHERE id IN (${placeholders})
        `, loanIds);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;