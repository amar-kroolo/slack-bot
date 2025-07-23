#!/usr/bin/env node

// Express server for OAuth callbacks and health checks
const express = require('express');
const authRoutes = require('./src/routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'slack-enterprise-search-bot',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Slack Enterprise Search Bot</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>🤖 Slack Enterprise Search Bot</h1>
        <p>Your intelligent search assistant is running!</p>
        <div style="margin: 20px 0;">
          <h3>🔗 Features:</h3>
          <ul style="text-align: left; display: inline-block;">
            <li>🔍 Enterprise Search across all platforms</li>
            <li>🧠 AI-powered natural language processing</li>
            <li>🔗 Pipedream dynamic authentication</li>
            <li>📊 Real-time search analytics</li>
          </ul>
        </div>
        <p><strong>Status:</strong> ✅ Online and ready</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 OAuth callback: http://localhost:${PORT}/auth/pipedream/callback`);
  console.log(`🌐 Root: http://localhost:${PORT}`);
});

module.exports = app;
