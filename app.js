const { App } = require('@slack/bolt');
const dotenv = require('dotenv');
const queryHandler = require('./src/handlers/queryHandler');
const { formatResponse } = require('./src/utils/formatter');
const databaseConfig = require('./src/config/database');
const { requireUserAuthentication } = require('./src/middleware/authenticateUser');

// Load environment variables
dotenv.config();

function setupSlackApp(app) {
  // Handle app mentions
  app.event('app_mention', async ({ event, client, logger }) => {
    try {
      logger.info('App mention received:', event.text);
      
      // Extract the query (remove the bot mention)
      const query = event.text.replace(/<@\\w+>/g, '').trim();

      // Rest of your event handler code...
    } catch (error) {
      logger.error('Error handling app mention:', error);
      await client.chat.postMessage({
        channel: event.channel,
        text: `❌ Sorry, I encountered an error: ${error.message}`
      });
    }
  });

  // Add your other event handlers...
  
  return app;
}

module.exports = setupSlackApp;
