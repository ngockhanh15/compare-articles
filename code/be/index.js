const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { generalLimiter } = require('./middleware/rateLimiter');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all requests
app.use(generalLimiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Filter Word API',
    status: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log('Server running on http://127.0.0.1:' + PORT);
});

module.exports = app;