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

      if (error.message.includes('missing_scope')) {
        console.log('🔧 SOLUTION: Add "users:read" scope to your Slack app');
        console.log('   1. Go to https://api.slack.com/apps');
        console.log('   2. Select your app');
        console.log('   3. Go to "OAuth & Permissions"');
        console.log('   4. Add "users:read" scope');
        console.log('   5. Reinstall the app');
      }
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
