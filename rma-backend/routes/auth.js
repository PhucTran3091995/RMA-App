const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Secret key cho token (Nên để trong file .env, ở đây để tạm string cứng)
const JWT_SECRET = 'rma_secret_key_123456'; 

// ==========================================
// GROUP 1: AUTHENTICATION (Login, Register)
// Prefix dự kiến: /api/auth
// ==========================================

// 1. API Tra cứu mã nhân viên
// Frontend gọi: /api/auth/check-employee/:id
router.get('/auth/check-employee/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra xem đã có tài khoản chưa trong bảng Users
        const [existingUser] = await pool.query('SELECT id FROM users WHERE employee_no = ?', [id]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Mã nhân viên này đã được đăng ký tài khoản.' });
        }

        // Lấy thông tin từ bảng Employees
        const [rows] = await pool.query(`
            SELECT e.employee_no, e.full_name, d.name as department_name, e.department_id 
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.employee_no = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mã nhân viên trong hệ thống.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server check-employee' });
    }
});

// 2. API Đăng ký
// Frontend gọi: /api/auth/register
router.post('/auth/register', async (req, res) => {
    try {
        const { employee_no, display_name, password, department_id } = req.body;
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Mặc định role = 'user', status = 'pending'
        const sql = `
            INSERT INTO users (employee_no, display_name, password, department_id, role, status)
            VALUES (?, ?, ?, ?, 'user', 'pending')
        `;
        
        await pool.query(sql, [employee_no, display_name, hashedPassword, department_id]);
        
        res.json({ message: 'Đăng ký thành công! Vui lòng chờ Admin phê duyệt.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
});

// 3. API Đăng nhập (MỚI THÊM)
// Frontend gọi: /api/auth/login
router.post('/auth/login', async (req, res) => {
    try {
        const { employee_no, password } = req.body;

        // 1. Tìm user
        const [users] = await pool.query('SELECT * FROM users WHERE employee_no = ?', [employee_no]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại' });
        }
        const user = users[0];

        // 2. Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // 3. Kiểm tra trạng thái Active
        if (user.status !== 'active') {
            // Nếu là admin demo (2023020087) thì cho qua luôn để test, còn lại chặn
            if (user.employee_no !== '2023020087') {
                 return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt hoặc đã bị khóa' });
            }
        }

        // 4. Tạo Token
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.display_name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 5. Trả về đúng format mà LoginPage.tsx cần: { token, user: {...} }
        res.json({
            token,
            user: {
                id: user.id,
                employee_no: user.employee_no,
                name: user.display_name,
                role: user.role,
                department_id: user.department_id
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi đăng nhập' });
    }
});


// ==========================================
// GROUP 2: USER MANAGEMENT (Admin Page)
// Prefix dự kiến: /api/users
// ==========================================

// 4. Lấy danh sách user
// Frontend gọi: /api/users
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.employee_no, u.display_name, u.role, u.status, u.created_at, d.name as department
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Phê duyệt / Reject
// Frontend gọi: /api/users/:id/status
router.put('/users/:id/status', async (req, res) => {
    const { status, role } = req.body; 
    try {
        let sql = 'UPDATE users SET status = ?';
        const params = [status];
        
        if (role) {
            sql += ', role = ?';
            params.push(role);
        }
        
        sql += ' WHERE id = ?';
        params.push(req.params.id);

        await pool.query(sql, params);
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Xóa user
// Frontend gọi: /api/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'Đã xóa người dùng' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;