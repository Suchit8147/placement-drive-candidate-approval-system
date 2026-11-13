const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const webTechRoutes = require('./routes/webTechRoutes');
const osppRoutes = require('./routes/osppRoutes');
const algorithmRoutes = require('./routes/algorithmRoutes');
const dbmsRoutes = require('./routes/dbmsRoutes');
const seRoutes = require('./routes/seRoutes');
const placementRoutes = require('./routes/placementRoutes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/webtech', webTechRoutes);
app.use('/api/ospp', osppRoutes);
app.use('/api/algorithms', algorithmRoutes);
app.use('/api/dbms', dbmsRoutes);
app.use('/api/se', seRoutes);
app.use('/api/placement', placementRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'Placement Drive and Candidate Approval Management System',
    theme: 'Conflict Resource Allocation',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found: ' + req.originalUrl });
});

module.exports = app;
