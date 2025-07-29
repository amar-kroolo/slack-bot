const { App } = require('@slack/bolt');
const express = require('express');
const dotenv = require('dotenv');
const databaseConfig = require('./src/config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const expressApp = express();
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Determine deployment mode
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Handle Slack Events API URL verification
expressApp.post('/slack/events', (req, res) => {
  // Handle the challenge request from Slack
  if (req.body.type === 'url_verification') {
    console.log('Received Slack URL verification challenge');
    return res.json({ challenge: req.body.challenge });
  }
  
  // Forward other events to the Slack Bolt app
  app.processEvent(req.body);
  res.sendStatus(200);
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add existing Slack event handlers from app.js
require('./app')(app);

// Add existing web routes from server.js
require('./server')(expressApp);

(async () => {
  try {
    console.log('🚀 Starting Production Server...');
    
    // Initialize database
    console.log('🔄 Initializing database connection...');
    try {
      await databaseConfig.initialize();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      console.warn('⚠️ Continuing without database - using in-memory storage');
    }

    // Start the HTTP server
    expressApp.listen(PORT, () => {
      console.log(`⚡️ Server is running on port ${PORT}`);
      console.log('🌐 HTTP Mode - Ready for webhook requests');
      console.log(`📋 Webhook URL should be configured as: https://enterprise-search-slack-bot.onrender.com/slack/events`);
    });

  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Received shutdown signal');
  try {
    await app.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
