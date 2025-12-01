// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// --- 1. IMPORT CÁC ROUTE ---
const authRoutes = require('./routes/auth'); // <--- THÊM DÒNG NÀY (Để load file auth.js)
const rmaRoutes = require('./routes/rma');
const dashboardRoutes = require('./routes/dashboard');
const masterRoutes = require('./routes/masters');
const employeeRoutes = require('./routes/employees');
const loanRoutes = require('./routes/loans');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 2. ĐĂNG KÝ ROUTE ---
app.use('/api', authRoutes);

app.use('/api/rmas', rmaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/loans', loanRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`RMA backend listening on http://localhost:${port}`);
});