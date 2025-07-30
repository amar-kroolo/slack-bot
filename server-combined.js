const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const dotenv = require('dotenv');
const databaseConfig = require('./src/config/database');
const { requireUserAuthentication } = require('./src/middleware/authenticateUser');
const queryHandler = require('./src/handlers/queryHandler');
const { formatResponse } = require('./src/utils/formatter');
// Load environment variables
dotenv.config();

// Server configuration
const PORT = process.env.PORT || 3000;

// Initialize Express receiver for Slack with more detailed logging
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  customRoutes: [
    {
      path: '/health',
      method: ['GET'],
      handler: (_req, res) => {
        res.send({
          status: 'ok',
          timestamp: new Date().toISOString(),
          slack: {
            signing_secret: !!process.env.SLACK_SIGNING_SECRET,
            bot_token: !!process.env.SLACK_BOT_TOKEN
          }
        });
      },
    },
  ]
});

// Initialize Express app from the receiver
const expressApp = receiver.app;
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Add request logging middleware
expressApp.use((req, _res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && req.body.type) {
    console.log('   Event Type:', req.body.type);
    if (req.body.event) {
      console.log('   Event Details:', JSON.stringify(req.body.event, null, 2));
    }
  }
  next();
});

// Initialize Slack app with the receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  processBeforeResponse: true,
  customRoutes: true
});

// Initialize Slack event handlers
app.event('app_mention', async ({ event, client, say, logger }) => {
  console.log('👋 Received app_mention event:', event);
  logger.info('App mention received:', event);
  try {
    const text = event.text.toLowerCase();
    
    // Extract the query (remove the bot mention)
    const query = event.text.replace(/<@[^>]+>/g, '').trim();
    
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

    // Get user info for authentication
    const userInfo = await client.users.info({ user: event.user });
    const userId = await requireUserAuthentication({
      email: userInfo?.user?.profile?.email,
      client,
      channel: event.channel,
    });

    if (!userId) {
      // Access denied message sent by middleware
      return;
    }

    // Process the query with user context
    const userContext = {
      slackUserId: event.user,
      slackEmail: userInfo?.user?.profile?.email,
      slackName: userInfo?.user?.name,
      slackRealName: userInfo?.user?.real_name
    };

    // Process query through handler
    const result = await queryHandler.processQuery(query, userContext);

    console.log('🔍 Query result received:', {
      hasError: !!result.error,
      hasMessage: !!result.message,
      hasBlocks: !!result.blocks,
      hasAttachments: !!result.attachments,
      hasText: !!result.text,
      hasData: !!result.data,
      responseType: result.response_type,
      resultKeys: Object.keys(result)
    });

    if (result.error) {
      console.log('❌ Sending error response:', result.error);
      await say(`❌ Error: ${result.error}`);
      return;
    }

    // Send appropriate response based on result type
    if (result.message || result.type === 'conversational') {
      console.log('📝 Sending conversational message');
      await say(result.message);
    } else if (result.blocks) {
      console.log('🧱 Sending blocks response');
      await say({ blocks: result.blocks });
    } else if (result.attachments) {
      // Handle legacy attachment format (used by connection status)
      console.log('📎 Sending attachments response');
      await say({
        text: result.text || 'Here are your results:',
        attachments: result.attachments
      });
    } else if (result.text && result.response_type === 'ephemeral') {
      // Handle ephemeral responses
      console.log('👻 Sending ephemeral text response');
      await say(result.text);
    } else if (result.data) {
      console.log('📊 Sending formatted data response');
      const formattedResponse = formatResponse(result.data, result.apiUsed);
      await say({
        text: `Search results for your query`,
        blocks: formattedResponse
      });
    } else {
      console.log('❓ Sending fallback response - unrecognized result format');
      await say("I processed your request but couldn't format the response properly.");
    }
  } catch (error) {
    logger.error('Error in app mention:', error);
    await say('Sorry, I encountered an error processing your request.');
  }
});

// Mount auth routes first
const authRoutes = require('./src/routes/auth');
expressApp.use('/', authRoutes);

// Health check endpoint
expressApp.get('/health', (_req, res) => {
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

// Handle messages (both DMs and channel messages)
app.message(async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages and special message subtypes
    if (message.bot_id || message.subtype) {
      return;
    }

    logger.info(`Message received in ${message.channel_type}:`, message.text);
    
    // For channel messages, only process if the bot is mentioned
    if (message.channel_type === 'channel' && !message.text.includes(`<@${client.botUserId}>`)) {
      return;
    }

    // Get user info for authentication
    const userInfo = await client.users.info({ user: message.user });
    const userId = await requireUserAuthentication({
      email: userInfo?.user?.profile?.email,
      client,
      channel: message.channel,
    });

    if (!userId) {
      // Access denied message sent by middleware
      return;
    }

    // Process the query with user context
    const userContext = {
      slackUserId: message.user,
      slackEmail: userInfo?.user?.profile?.email,
      slackName: userInfo?.user?.name,
      slackRealName: userInfo?.user?.real_name
    };

    // Remove bot mention from the message for channel messages
    let query = message.text;
    if (message.channel_type === 'channel') {
      query = query.replace(new RegExp(`<@${client.botUserId}>`, 'g'), '').trim();
    }

    const result = await queryHandler.processQuery(query, userContext);

    console.log('🔍 Message query result received:', {
      hasError: !!result.error,
      hasMessage: !!result.message,
      hasBlocks: !!result.blocks,
      hasAttachments: !!result.attachments,
      hasText: !!result.text,
      hasData: !!result.data,
      responseType: result.response_type,
      resultKeys: Object.keys(result)
    });

    if (result.error) {
      console.log('❌ Sending error response:', result.error);
      await say(`❌ Error: ${result.error}`);
      return;
    }

    // Send appropriate response based on result type
    if (result.message || result.type === 'conversational') {
      console.log('📝 Sending conversational message');
      await say(result.message);
    } else if (result.blocks) {
      console.log('🧱 Sending blocks response');
      await say({ blocks: result.blocks });
    } else if (result.attachments) {
      // Handle legacy attachment format (used by connection status)
      console.log('📎 Sending attachments response');
      await say({
        text: result.text || 'Here are your results:',
        attachments: result.attachments
      });
    } else if (result.text && result.response_type === 'ephemeral') {
      // Handle ephemeral responses
      console.log('👻 Sending ephemeral text response');
      await say(result.text);
    } else if (result.data) {
      console.log('📊 Sending formatted data response');
      const formattedResponse = formatResponse(result.data, result.apiUsed);
      await say({
        text: `Search results for your query`,
        blocks: formattedResponse
      });
    } else {
      console.log('❓ Sending fallback response - unrecognized result format');
      await say("I processed your request but couldn't format the response properly.");
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    await say(`❌ Sorry, I encountered an error: ${error.message}`);
  }
});

// Handle link_shared events
app.event('link_shared', async ({ event, logger }) => {
  logger.info('Link shared event received:', event);
  try {
    // Process shared links here
    console.log('🔗 Links shared:', event.links);
  } catch (error) {
    logger.error('Error handling link_shared event:', error);
  }
});

// Handle button clicks and interactive components
app.action('connect_tool', async ({ ack, body, client, logger }) => {
  await ack();
  logger.info('Connect tool button clicked:', body);

  try {
    const userId = body.user.id;
    const userInfo = await client.users.info({ user: userId });

    // Get user context
    const userContext = {
      slackUserId: userId,
      slackEmail: userInfo?.user?.profile?.email,
      slackName: userInfo?.user?.name,
      slackRealName: userInfo?.user?.real_name
    };

    // Import connect tools handler
    const connectToolsHandler = require('./src/handlers/connectToolsHandler');

    // Handle the connect tools request
    const result = await connectToolsHandler.handleConnectToolsCommand(userId, userContext);

    if (result.error) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: `❌ Error: ${result.error}`
      });
      return;
    }

    // Send the response
    if (result.attachments) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: result.text,
        attachments: result.attachments
      });
    } else if (result.blocks) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        blocks: result.blocks
      });
    } else {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: result.message || result.text || 'Tool connection interface loaded.'
      });
    }
  } catch (error) {
    logger.error('Error handling connect_tool action:', error);
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: `❌ Sorry, I encountered an error: ${error.message}`
    });
  }
});

// Handle open document button clicks
app.action(/^open_.*/, async ({ ack, body, logger }) => {
  await ack();
  logger.info('Open document button clicked:', body.actions[0].action_id);

  // The button already has a URL, so Slack will handle opening it
  // This handler just acknowledges the action
});

// Import routes
const toolsRoutes = require('./src/routes/tools');

// Set up web routes
expressApp.use('/api/tools', toolsRoutes);

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack trace:', reason?.stack);
  process.exit(1);
});

// Graceful shutdown handling
let server;

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');

      // Close database connection if exists
      if (databaseConfig && databaseConfig.close) {
        databaseConfig.close().then(() => {
          console.log('✅ Database connection closed');
          process.exit(0);
        }).catch((err) => {
          console.error('❌ Error closing database:', err);
          process.exit(1);
        });
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

(async () => {
  try {
    console.log('🚀 Starting Unified Production Server...');
    console.log('🌐 Mode: HTTP Events API (Production Ready)');
    console.log('🔧 Socket Mode: Disabled');

    // Initialize database
    console.log('🔄 Initializing database connection...');
    try {
      await databaseConfig.initialize();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      console.warn('⚠️ Continuing without database - using in-memory storage');
    }

    // Start the Slack app (this initializes the ExpressReceiver)
    await app.start();
    console.log('✅ Slack app started successfully');
    console.log('🔍 Verifying Slack configuration:');
    console.log(`   Bot Token: ${process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Signing Secret: ${process.env.SLACK_SIGNING_SECRET ? '✅ Set' : '❌ Missing'}`);

    // Start the HTTP server
    server = expressApp.listen(PORT, () => {
      console.log(`\n⚡️ Unified Server is running on port ${PORT}`);
      console.log('🌐 HTTP Events API - Ready for webhook requests');
      console.log(`📋 Webhook URL: https://enterprise-search-slack-bot.onrender.com/slack/events`);
      console.log('\n🎯 Subscribed to events:');
      console.log('   • app_mention - For direct bot mentions');
      console.log('   • message.im - For direct messages');
      console.log('   • message.channels - For channel messages');
      console.log('   • link_shared - For shared links');
      console.log('\n🔘 Interactive components:');
      console.log('   • connect_tool - Tool connection buttons');
      console.log('   • open_* - Document open buttons');
      console.log('\n🛣️  HTTP Routes:');
      console.log('   • GET  /health - Health check');
      console.log('   • POST /slack/events - Slack events webhook');
      console.log('   • GET  /auth/* - OAuth callback routes');
      console.log('   • *    /api/tools/* - Tools API endpoints');
      console.log('\n✅ Unified Slack bot is ready to respond to mentions, messages, and interactions');
    });

  } catch (error) {
    console.error('❌ Failed to start the unified server:', error);
    console.error('Stack trace:', error.stack);
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