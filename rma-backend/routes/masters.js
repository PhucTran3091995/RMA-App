// routes/masters.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const xlsx = require('xlsx');

// Cấu hình Multer lưu RAM
const upload = multer({ storage: multer.memoryStorage() });

// GET /items (Giữ nguyên)
router.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                i.id,
                i.item_no AS pid,
                i.description AS name,
                ic.cost_usd AS cost
            FROM items i
            LEFT JOIN item_costs ic ON ic.item_id = i.id
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
        console.error('GET /items error', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /import-costs (Đã sửa lỗi Collation)
router.post('/import-costs', upload.single('file'), async (req, res) => {
    const connection = await pool.getConnection(); 
    const logs = [];

    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Chưa chọn file!" });

        logs.push(`📂 Đã nhận file: ${req.file.originalname}`);

        // 1. Đọc file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        const dataRows = rawData.slice(1); // Bỏ header

        if (dataRows.length === 0) throw new Error("File rỗng!");

        // 2. Transaction
        await connection.beginTransaction();

        // Tạo bảng tạm (Không cần quan tâm Collation ở đây nữa vì ta sẽ ép ở câu dưới)
        await connection.query(`
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_import_costs (
                item_no VARCHAR(50),
                cost_vnd DECIMAL(18,4),
                cost_usd DECIMAL(18,4),
                INDEX idx_tmp_item (item_no)
            )
        `);
        await connection.query('TRUNCATE TABLE temp_import_costs');

        // 3. Bulk Insert
        const batchSize = 2000;
        const validRows = dataRows.filter(row => row[0] && row[0].toString().trim() !== '');

        for (let i = 0; i < validRows.length; i += batchSize) {
            const batch = validRows.slice(i, i + batchSize).map(row => [
                row[0].toString().trim(), 
                row[1] || 0,              
                row[2] || 0               
            ]);
            if (batch.length > 0) {
                await connection.query(
                    'INSERT INTO temp_import_costs (item_no, cost_vnd, cost_usd) VALUES ?', 
                    [batch]
                );
            }
        }
        logs.push(`📥 Đã xử lý ${validRows.length} dòng.`);

        // 4. UPDATE item_costs
        // --- SỬA LỖI Ở ĐÂY: Thêm COLLATE utf8mb4_unicode_ci ---
        const [updateResult] = await connection.query(`
            UPDATE item_costs ic
            JOIN items i ON ic.item_id = i.id
            JOIN temp_import_costs t ON i.item_no = t.item_no COLLATE utf8mb4_unicode_ci
            SET 
                ic.cost_vnd = t.cost_vnd,
                ic.cost_usd = t.cost_usd,
                ic.exchange_rate = CASE WHEN t.cost_usd > 0 THEN t.cost_vnd / t.cost_usd ELSE 0 END,
                ic.updated_at = NOW()
        `);
        logs.push(`🔄 Đã cập nhật giá cho ${updateResult.affectedRows} items.`);

        // 5. UPDATE rma_boards
        // --- SỬA LỖI Ở ĐÂY ---
        const [rmaResult] = await connection.query(`
            UPDATE rma_boards rb
            JOIN items i ON rb.item_id = i.id
            JOIN temp_import_costs t ON i.item_no = t.item_no COLLATE utf8mb4_unicode_ci
            SET 
                rb.item_cost_vnd = t.cost_vnd,
                rb.item_cost_usd = t.cost_usd
            WHERE rb.clear_date IS NULL
        `);
        logs.push(`📦 Đã cập nhật giá cho ${rmaResult.affectedRows} RMA boards.`);

        // 6. INSERT items mới
        // --- SỬA LỖI Ở ĐÂY ---
        const [insertResult] = await connection.query(`
            INSERT INTO item_costs (item_id, cost_vnd, cost_usd, exchange_rate, created_at, updated_at)
            SELECT 
                i.id, t.cost_vnd, t.cost_usd, 
                CASE WHEN t.cost_usd > 0 THEN t.cost_vnd / t.cost_usd ELSE 0 END,
                NOW(), NOW()
            FROM temp_import_costs t
            JOIN items i ON t.item_no COLLATE utf8mb4_unicode_ci = i.item_no 
            LEFT JOIN item_costs ic ON i.id = ic.item_id
            WHERE ic.item_id IS NULL
        `);
        logs.push(`🆕 Đã thêm mới giá cho ${insertResult.affectedRows} items.`);

        // 7. Check mã lạ
        // --- SỬA LỖI Ở ĐÂY ---
        const [missing] = await connection.query(`
            SELECT t.item_no FROM temp_import_costs t
            LEFT JOIN items i ON t.item_no COLLATE utf8mb4_unicode_ci = i.item_no
            WHERE i.id IS NULL LIMIT 10
        `);
        if (missing.length > 0) {
            logs.push(`⚠️ Cảnh báo: ${missing.length}+ mã không tồn tại (VD: ${missing[0].item_no}).`);
        }

        await connection.query('DROP TEMPORARY TABLE IF EXISTS temp_import_costs');
        await connection.commit();
        res.json({ success: true, message: "Import thành công", logs: logs });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Import Error:", error);
        res.status(500).json({ success: false, message: error.message, logs: [...logs, `❌ Lỗi: ${error.message}`] });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;