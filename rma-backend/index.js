// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const rmaRoutes = require('./routes/rma');
const dashboardRoutes = require('./routes/dashboard');
const masterRoutes = require('./routes/masters');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rmas', rmaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/masters', masterRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`RMA backend listening on http://localhost:${port}`);
});
