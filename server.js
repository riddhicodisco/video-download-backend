// Load environment variables (optional)
try {
  require('dotenv').config();
} catch (err) {
  console.log('⚠️  dotenv not installed, using default environment variables');
}

const express = require('express');
const corsMiddleware = require('./src/config/cors');
const errorHandler = require('./src/middleware/errorHandler');
const youtubeRoutes = require('./src/routes/youtube');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure timeouts for long-running YouTube operations
app.use((req, res, next) => {
  // Set timeout to 5 minutes for YouTube operations
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'YouTube Downloader API is running',
    version: '1.0.0',
    endpoints: {
      info: 'POST /api/info',
      downloadVideo: 'POST /api/download/video',
      downloadAudio: 'POST /api/download/audio'
    }
  });
});

// API Routes
app.use('/api', youtubeRoutes);

// 404 handler
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS_ORIGIN Config: ${process.env.CORS_ORIGIN || 'Allow All (*)'}`);
  console.log(`🍪 Cookies Path: ${process.env.COOKIES_PATH || 'Standard'}`);

  // Initialize cron jobs
  const { initCronJobs } = require('./src/services/cronService');
  initCronJobs();
});

// Set server timeout to 5 minutes for YouTube downloads
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 310000; // Slightly more than keepAliveTimeout

module.exports = app;
