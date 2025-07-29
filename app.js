const { App } = require('@slack/bolt');
const dotenv = require('dotenv');
const queryHandler = require('./src/handlers/queryHandler');
const { formatResponse } = require('./src/utils/formatter');
const databaseConfig = require('./src/config/database');
const { requireUserAuthentication } = require('./src/middleware/authenticateUser');
// Load environment variables
dotenv.config();

// Determine deployment mode
const isProduction = process.env.NODE_ENV === 'production';
const useSocketMode = process.env.USE_SOCKET_MODE !== 'false' && (process.env.USE_SOCKET_MODE === 'true' || !isProduction);

console.log('🔧 Bot Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Socket Mode: ${useSocketMode ? 'Enabled' : 'Disabled'}`);
console.log(`   Port: ${process.env.PORT || 3000}`);

// Initialize Slack app with deployment-aware configuration
const appConfig = {
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  port: process.env.PORT || 3000
};

// Add Socket Mode configuration only if enabled
if (useSocketMode) {
  appConfig.socketMode = true;
  appConfig.appToken = process.env.SLACK_APP_TOKEN;
  console.log('📡 Socket Mode enabled for local development');
} else {
  console.log('🌐 HTTP Mode enabled for production deployment');
}

const app = new App(appConfig);

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

    // Get user info to extract email for API calls
    console.log('🔍 STEP 1: Attempting to extract Slack user email...');
    console.log('   Target User ID:', event.user);
    console.log('   Channel ID:', event.channel);

    let userInfo = null;
    let extractedEmail = null;

    try {
      console.log('📞 Making Slack API call: users.info...');
      userInfo = await client.users.info({ user: event.user });

      console.log('✅ Slack API Response received');
      console.log('   User ID:', userInfo?.user?.id);
      console.log('   User Name:', userInfo?.user?.name);
      console.log('   Real Name:', userInfo?.user?.real_name);
      console.log('   Profile Email:', userInfo?.user?.profile?.email);
      console.log('   Profile Display Name:', userInfo?.user?.profile?.display_name);
      console.log('   Is Bot:', userInfo?.user?.is_bot);
      console.log('   Is Admin:', userInfo?.user?.is_admin);

      extractedEmail = userInfo?.user?.profile?.email;

      if (extractedEmail) {
        console.log('✅ SUCCESS: Email extracted from Slack profile:', extractedEmail);
      } else {
        console.log('⚠️ WARNING: No email found in Slack profile');
        console.log('   Profile object:', JSON.stringify(userInfo?.user?.profile, null, 2));
      }

    } catch (error) {
      console.log('❌ FAILED: Could not get Slack user info');
      console.log('   Error Type:', error.constructor.name);
      console.log('   Error Message:', error.message);
      console.log('   Error Code:', error.code);
      console.log('   Error Data:', error.data);

    }

    // Fallback email logic
    console.log('🔍 STEP 2: Determining email to use for API calls...');
    let finalEmail = extractedEmail;

    if (!finalEmail) {
      // Try to get from RBAC config
      try {
        const { RBAC_CONFIG } = require('./src/config/apis');
        finalEmail = RBAC_CONFIG.user_email;
        console.log('📧 Using fallback email from RBAC config:', finalEmail);
      } catch (configError) {
        console.log('⚠️ Could not load RBAC config:', configError.message);
        finalEmail = 'default@example.com';
        console.log('📧 Using hardcoded fallback email:', finalEmail);
      }
    }

    const userId = await requireUserAuthentication({
      email: extractedEmail,  // could be null
      client,
      channel: event.channel,
    });

    if (!userId) {
      // User not authorized, middleware has sent the denial message, stop processing
      return;
    }

    console.log('✅ FINAL EMAIL DECISION:', finalEmail);
    console.log('   Source:', extractedEmail ? 'Slack Profile' : 'Fallback Config');

    // Process the query with user context including email
    console.log('🔍 STEP 3: Creating user context for query processing...');

    const userContext = {
      slackUserId: event.user,
      slackEmail: finalEmail, // Use the determined final email
      slackName: userInfo?.user?.name || null,
      slackRealName: userInfo?.user?.real_name || null,
      extractedFromSlack: !!extractedEmail, // Track if email came from Slack
      emailSource: extractedEmail ? 'slack_profile' : 'fallback_config'
    };

    console.log('📋 User Context Created:', {
      slackUserId: userContext.slackUserId,
      slackEmail: userContext.slackEmail,
      emailSource: userContext.emailSource,
      extractedFromSlack: userContext.extractedFromSlack
    });

    console.log('🔍 STEP 4: Starting query processing...');
    const result = await queryHandler.processQuery(query, userContext);

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
  // Handle conversational responses FIRST
if (result.type === 'conversational' || result.message) {
  await client.chat.postMessage({
    channel: event.channel,
    text: result.message
  });
  return;
}

// Handle SlackHandler responses (blocks format)
if (result.blocks) {
  await client.chat.postMessage({
    channel: event.channel,
    blocks: result.blocks
  });
  return;
}

// Handle regular Enterprise Search API responses
if (result.data) {
  const formattedResponse = formatResponse(result.data, result.apiUsed);
  await client.chat.postMessage({
    channel: event.channel,
    text: `Search results for your query`,
    blocks: formattedResponse
  });
  return;
}

// Fallback for unexpected response structure
await client.chat.postMessage({
  channel: event.channel,
  text: "I processed your request, but couldn't format the response properly."
});


  } catch (error) {
    logger.error('Error handling app mention:', error);
    await client.chat.postMessage({
      channel: event.channel,
      text: `❌ Sorry, I encountered an error: ${error.message}`
    });
  }
});

// Handle interactive components (button clicks)
app.action('connect_tool', async ({ ack, body, client, logger }) => {
  try {
    await ack();

    const toolName = body.actions[0].value;
    const userId = body.user.id;

    console.log('🔘 Button clicked - Connect tool:', toolName);
    console.log('👤 User:', userId);

    // Get user info for email
    let userInfo = null;
    try {
      userInfo = await client.users.info({ user: userId });
    } catch (error) {
      console.log('⚠️ Could not get user info for button click:', error.message);
    }

    const userEmail = userInfo?.user?.profile?.email || null;

    // Handle specific tool connection
    const connectToolsHandler = require('./src/handlers/connectToolsHandler');

    let result;
    if (toolName === 'any_tool') {
      // Show general connect interface
      const pipedreamService = require('./src/services/pipedreamService');
      const externalUserId = userEmail || userId;
      const connectData = await pipedreamService.createConnectToken(externalUserId);

      result = {
        response_type: 'ephemeral',
        text: '🚀 Connect Any Tool',
        attachments: [{
          color: 'good',
          title: '✅ Ready to Connect Any Tool',
          text: 'Click the button below to choose from all available tools:',
          actions: [
            {
              type: 'button',
              text: '🚀 Connect Any Tool',
              url: connectData.connect_link_url,
              style: 'primary'
            }
          ],
          footer: `🔒 Token expires: ${new Date(connectData.expires_at).toLocaleString()}`
        }]
      };
    } else if (toolName === 'slack') {
      // Handle Slack apps connection
      const slackHandler = require('./src/handlers/slackHandler');
      result = await slackHandler.handleConnectCommand(userId);
    } else {
      // Handle specific tool connection
      result = await connectToolsHandler.handleSpecificToolConnection(userId, toolName, userEmail);
    }

    // Send response
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: userId,
      text: result.text,
      attachments: result.attachments
    });

  } catch (error) {
    logger.error('Error handling button click:', error);
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: `❌ Error: ${error.message}`
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

    // Get user info to extract email for API calls
    let userInfo = null;
    try {
      userInfo = await client.users.info({ user: message.user });
      console.log('👤 DM User info retrieved:', {
        id: userInfo?.user?.id,
        email: userInfo?.user?.profile?.email || 'No email',
        name: userInfo?.user?.name || 'No name'
      });
    } catch (error) {
      console.log('⚠️ Could not get DM user info:', error.message);
    }
    const userId = await requireUserAuthentication({
      email: userInfo?.user?.profile?.email,
      client,
      channel: message.channel,
    });

    console.log("userId with Mongodb->",userId)
    if (!userId) {
      // Access denied message sent by middleware
      return;
    }
    // Process the query with user context including email
    const userContext = {
      slackUserId: message.user,
      slackEmail: userInfo?.user?.profile?.email || null,
      slackName: userInfo?.user?.name || null,
      slackRealName: userInfo?.user?.real_name || null
    };

    const result = await queryHandler.processQuery(query, userContext);
    
    if (result.error) {
      await client.chat.postMessage({
        channel: message.channel,
        text: `❌ Error: ${result.error}`
      });
      return;
    }

    // Format and send the response
  // Handle conversational responses FIRST
if (result.type === 'conversational' || result.message) {
  await client.chat.postMessage({
    channel: message.channel,
    text: result.message
  });
  return;
}

// Handle SlackHandler responses (blocks format)
if (result.blocks) {
  await client.chat.postMessage({
    channel: message.channel,
    blocks: result.blocks
  });
  return;
}

// Handle regular Enterprise Search API responses
if (result.data) {
  const formattedResponse = formatResponse(result.data, result.apiUsed);
  await client.chat.postMessage({
    channel: message.channel,
    text: `Search results for your query`,
    blocks: formattedResponse
  });
  return;
}

// Fallback for unexpected response structure
await client.chat.postMessage({
  channel: message.channel,
  text: "I processed your request, but couldn't format the response properly."
});


  } catch (error) {
    logger.error('Error handling direct message:', error);
    await client.chat.postMessage({
      channel: message.channel,
      text: `❌ Sorry, I encountered an error: ${error.message}`
    });
  }
});

// Add error handlers
app.error(async (error) => {
  console.error('❌ Slack App Error:', error);

  // Handle specific Socket Mode errors gracefully (only in Socket Mode)
  if (useSocketMode && error.message && (
    error.message.includes('socket') ||
    error.message.includes('WebSocket') ||
    error.message.includes('connection') ||
    error.message.includes('Unhandled event')
  )) {
    console.log('🔄 Socket Mode connection issue detected');
    console.log('   This is usually temporary and the connection will be re-established automatically');
    // Don't crash the app, let it handle reconnection automatically
    return;
  }

  // For other errors, log them but don't crash
  console.error('   Error details:', error.stack || error.message);
});

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    await app.stop();
    console.log('✅ App stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await app.stop();
    console.log('✅ App stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  // Handle specific Socket Mode state machine errors (only in Socket Mode)
  if (useSocketMode && error.message && error.message.includes('Unhandled event') && error.message.includes('server explicit disconnect')) {
    console.warn('⚠️ Socket Mode state machine error (this is usually harmless):');
    console.warn('   ', error.message);
    console.log('🔄 Connection will be re-established automatically');
    return; // Don't crash the app
  }

  console.error('❌ Uncaught Exception:', error);
  console.error('   Stack:', error.stack);

  // For critical errors, exit gracefully
  if (error.message && (error.message.includes('EADDRINUSE') || error.message.includes('permission'))) {
    console.error('💥 Critical error detected, exiting...');
    process.exit(1);
  }

  // For other errors, log but don't exit in development, exit in production
  if (isProduction) {
    console.error('💥 Production error, exiting for safety...');
    process.exit(1);
  } else {
    console.log('🔄 Development mode, attempting to continue...');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);

  // Handle Socket Mode related rejections
  if (reason && reason.message && reason.message.includes('socket')) {
    console.log('🔄 Socket-related rejection, this is usually temporary');
    return;
  }

  // Don't exit immediately, let the app try to recover
});

// Start the app with enhanced error handling
(async () => {
  try {
    console.log('🚀 Starting Slack API Query Bot...');
    console.log('🔧 Environment check:');
    console.log('   SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('   SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✅ Set' : '❌ Missing');

    if (useSocketMode) {
      console.log('   SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN ? '✅ Set' : '❌ Missing');
    }

    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    try {
      await databaseConfig.initialize();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      console.warn('⚠️ Continuing without database - using in-memory storage');
    }

    await app.start();
    console.log('⚡️ Slack API Query Bot is running!');
    console.log(`🚀 Server started on port ${process.env.PORT || 3000}`);

    if (useSocketMode) {
      console.log('📡 Socket Mode connection established');
    } else {
      console.log('🌐 HTTP Mode - Ready to receive webhook requests');
      console.log('📋 Webhook URL: https://your-app.onrender.com/slack/events');
      console.log('✅ Server is listening and ready for deployment');
    }

  } catch (error) {
    console.error('❌ Failed to start the app:', error);

    // Provide specific guidance for common issues
    if (error.message && error.message.includes('token')) {
      console.error('💡 Token Error - Please check:');
      console.error('   1. SLACK_BOT_TOKEN is set correctly');
      if (useSocketMode) {
        console.error('   2. SLACK_APP_TOKEN is set correctly');
        console.error('   3. Bot has proper permissions');
      } else {
        console.error('   2. SLACK_SIGNING_SECRET is set correctly');
        console.error('   3. Webhook URL is configured in Slack app');
      }
    } else if (useSocketMode && error.message && error.message.includes('socket')) {
      console.error('💡 Socket Mode Error - Please check:');
      console.error('   1. Socket Mode is enabled in your Slack app');
      console.error('   2. App-level token has connections:write scope');
      console.error('   3. Network connectivity');
    } else if (!useSocketMode && error.message && error.message.includes('port')) {
      console.error('💡 Port Error - Please check:');
      console.error('   1. PORT environment variable is set');
      console.error('   2. Port is not already in use');
      console.error('   3. App has permission to bind to port');
    }

    process.exit(1);
  }
})();