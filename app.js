const { App } = require('@slack/bolt');
const dotenv = require('dotenv');
const queryHandler = require('./src/handlers/queryHandler');
const { formatResponse } = require('./src/utils/formatter');

// Load environment variables
dotenv.config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

// Handle app mentions
app.event('app_mention', async ({ event, client, logger }) => {
  try {
    logger.info('App mention received:', event.text);
    
    // Extract the query (remove the bot mention)
    const query = event.text.replace(/<@\w+>/g, '').trim();
    
    if (!query) {
      await client.chat.postMessage({
        channel: event.channel,
        text: "Hi! I can help you query APIs using natural language. Try asking me something like:\n• `get user data for user ID 123`\n• `show me the latest orders`\n• `what's the status of order 456`"
      });
      return;
    }

    // Show typing indicator
    await client.chat.postMessage({
      channel: event.channel,
      text: "🔍 Processing your query..."
    });

    // Process the query
    const result = await queryHandler.processQuery(query, event.user);

    if (result.error) {
      await client.chat.postMessage({
        channel: event.channel,
        text: `❌ Error: ${result.error}`
      });
      return;
    }

    // Check if this is a Pipedream response (has response_type, text, attachments)
    if (result.response_type && result.text) {
      console.log('🔗 Sending Pipedream response to Slack');

      // Send Pipedream response directly
      const messagePayload = {
        channel: event.channel,
        text: result.text
      };

      // Add attachments if present
      if (result.attachments) {
        messagePayload.attachments = result.attachments;
      }

      await client.chat.postMessage(messagePayload);
      return;
    }

    // Handle regular Enterprise Search API responses
    const formattedResponse = formatResponse(result.data, result.apiUsed);

    await client.chat.postMessage({
      channel: event.channel,
      text: `Search results for your query`, // Fallback text for accessibility
      blocks: formattedResponse
    });

  } catch (error) {
    logger.error('Error handling app mention:', error);
    await client.chat.postMessage({
      channel: event.channel,
      text: `❌ Sorry, I encountered an error: ${error.message}`
    });
  }
});

// Handle direct messages
app.message(async ({ message, client, logger }) => {
  // Only respond to direct messages (not channel messages)
  if (message.channel_type !== 'im') return;
  
  try {
    logger.info('Direct message received:', message.text);
    
    const query = message.text.trim();
    
    if (!query) return;

    // Show typing indicator
    await client.chat.postMessage({
      channel: message.channel,
      text: "🔍 Processing your query..."
    });

    // Process the query
    const result = await queryHandler.processQuery(query);
    
    if (result.error) {
      await client.chat.postMessage({
        channel: message.channel,
        text: `❌ Error: ${result.error}`
      });
      return;
    }

    // Format and send the response
    const formattedResponse = formatResponse(result.data, result.apiUsed);

    await client.chat.postMessage({
      channel: message.channel,
      text: `Search results for your query`, // Fallback text for accessibility
      blocks: formattedResponse
    });

  } catch (error) {
    logger.error('Error handling direct message:', error);
    await client.chat.postMessage({
      channel: message.channel,
      text: `❌ Sorry, I encountered an error: ${error.message}`
    });
  }
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack API Query Bot is running!');
    console.log(`🚀 Server started on port ${process.env.PORT || 3000}`);
  } catch (error) {
    console.error('Failed to start the app:', error);
    process.exit(1);
  }
})();
