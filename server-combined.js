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
  socketMode: false // Important: disable socket mode for HTTP
});

// Basic message handling for debugging
app.message(async ({ message, say }) => {
  console.log('Received message:', message.text);
  try {
    await say(`I received your message: "${message.text}"`);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});

// Handle app mentions
app.event('app_mention', async ({ event, client, say }) => {
  console.log('Received app mention:', event);
  try {
    const text = event.text.toLowerCase();
    
    if (text.includes('connect tools')) {
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*🔗 Connect Your Tools*\nChoose a tool to connect:"
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "🔗 Connect Any Tool"
                },
                value: "any_tool",
                action_id: "connect_tool"
              }
            ]
          }
        ]
      });
      return;
    }

    // Default response
    await say(`Hi! I received your message: "${event.text}". How can I help you?`);
  } catch (error) {
    console.error('Error in app mention:', error);
    await say('Sorry, I encountered an error processing your request.');
  }
});

// Mount auth routes first
const authRoutes = require('./src/routes/auth');
expressApp.use('/', authRoutes);

// Handle Slack Events API URL verification
expressApp.post('/slack/events', async (req, res) => {
  try {
    console.log('Received Slack event:', req.body);
    
    // Handle the challenge request from Slack
    if (req.body.type === 'url_verification') {
      console.log('Received Slack URL verification challenge');
      return res.json({ challenge: req.body.challenge });
    }
    
    // Forward other events to the Slack Bolt app
    await app.processEvent(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing Slack event:', error);
    res.sendStatus(500);
  }
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler for unhandled routes
expressApp.use((req, res) => {
  console.log(`[INFO] Unhandled ${req.method} request made to ${req.path}`);
  res.status(404).json({ 
    status: 'error', 
    message: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Basic message handling for debugging
app.message(async ({ message, say }) => {
  console.log('Received message:', message.text);
  try {
    await say(`I received your message: "${message.text}"`);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});

// Import handlers and routes
const setupSlackHandlers = require('./app');
const setupWebRoutes = require('./server');

// Set up handlers and routes
if (typeof setupSlackHandlers === 'function') {
  setupSlackHandlers(app);
} else {
  console.warn('Warning: app.js does not export a function');
}

if (typeof setupWebRoutes === 'function') {
  setupWebRoutes(expressApp);
} else {
  console.warn('Warning: server.js does not export a function');
}

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
