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
// Handle app mentions
app.event('app_mention', async ({ event, client, logger }) => {
  try {
    logger.info('App mention received:', event.text);
    
    // Extract the query (remove the bot mention)
    const query = event.text.replace(/<@\w+>/g, '').trim();

    // Check if query appears to be a help-related request
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('help')) {
      await client.chat.postMessage({
        channel: event.channel,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*🛠️ Need help with using Kroolo AI? Here's what I can do:*"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• `connect tools` – Link tools like Slack, Google Drive, Jira\n• `disconnect tool-name` – Remove access to any connected tool\n• `get tool status` – See which tools you've connected\n• `Find documents in my drive` – Search your Google Drive\n• `Show me recent documents` – Get document history\n• `What are the trending files?` – Discover what's popular"
            }
          },
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Need more? Type `help` or mention me with your question. I'm here to assist! 🤖"
              }
            ]
          }
        ],
        text: "Here's how you can use SmartBot"
      });
      return;
    }
    
    if (!query) {
      await client.chat.postMessage({
        channel: event.channel,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*👋 Hi! I'm Kroolo AI, your AI assistant for document and tool search.*"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Here are a few things you can ask me:*"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• `Find documents related to Q3 OKRs`\n• `Show me trending files`\n• `Suggest documents I should read`\n• `Connect to Google Drive`\n• `Disconnect Jira`\n• `Get status of connected tools`\n• `/help` or `/intro` to see how everything works"
            }
          },
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "🚀 You can also just mention me in a channel or DM and ask naturally!"
              }
            ]
          }
        ],
        text: "Hi! I can help you discover and manage tools and documents."
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

// Add this right after your app.event('app_mention') handler (around line 200)

// SLASH COMMANDS - Add these handlers
console.log('🔧 Setting up slash commands...');

// /help command
app.command('/help', async ({ command, ack, respond }) => {
    await ack();
    
    const helpMessage = {
        text: "🤖 KROOLO AI Assistant - Available Commands",
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🤖 KROOLO AI Assistant"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Two Ways to Interact:*"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "🚀 *Quick Commands* (Slash Commands)\n⚡ Fast and direct - use the commands below\n\n🧠 *Natural Language* (AI-Powered)\n💬 Just mention `@KROOLO AI` and ask naturally!\n• \"@KROOLO AI connect me to Gmail\"\n• \"@KROOLO AI search for project reports\"\n• \"@KROOLO AI what tools am I connected to?\"\n• \"@KROOLO AI help me find meeting notes from last week\""
                }
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*⚡ Quick Slash Commands:*"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Connection Commands:*\n• `/connect` - Show all available tools to connect\n• `/connect <tool>` - Connect to a specific tool\n  Example: `/connect gmail` or `/connect google_drive`\n• `/disconnect <tool>` - Disconnect from a tool\n  Example: `/disconnect jira`\n• `/tool_status` - Show all your connections\n• `/tool_status <tool>` - Check specific tool status"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Search Commands:*\n• `/find <query>` - Search documents across connected tools\n  Example: `/find project reports`"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*🔧 Available Tools:*\nGmail, Google Drive, Slack, Pipedream, Dropbox, Jira, Confluence, Microsoft Teams, SharePoint, Document 360, GitHub, Notion, Airtable, Zendesk"
                }
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*💡 Pro Tips:*\n• Use slash commands for quick actions\n• Use `@KROOLO AI` for complex queries or when you're not sure of the exact command\n• The AI understands context - ask follow-up questions!\n• Try: \"@KROOLO AI I want to search my emails for budget information\""
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Need help?* \n🤖 Mention `@KROOLO AI` and ask me anything!\n📋 Use `/help` to see this menu again"
                }
            }
        ]
    };
    
    await respond(helpMessage);
});

// /connect command
app.command('/connect', async ({ command, ack, respond, client }) => {
    await ack();
    
    try {
        // Get user info
        let userInfo = null;
        try {
            userInfo = await client.users.info({ user: command.user_id });
        } catch (error) {
            console.log('⚠️ Could not get user info for slash command:', error.message);
        }

        const userContext = {
            slackUserId: command.user_id,
            slackEmail: userInfo?.user?.profile?.email || null
        };
        
        const toolName = command.text.trim().toLowerCase();
        
        let result;
        if (!toolName) {
            // Show all available tools - use existing handler
            result = await queryHandler.processSlashCommand('connect', '', userContext);
        } else {
            // Connect to specific tool
            const validTools = [
                'gmail', 'google_drive', 'slack', 'pipedream', 'dropbox', 'jira',
                'confluence', 'microsoft_teams', 'microsoft_sharepoint', 'document_360',
                'github', 'notion', 'airtable', 'zendesk'
            ];
            
            if (!validTools.includes(toolName)) {
                await respond({
                    text: `❌ Unknown tool: "${toolName}"\n\nAvailable tools: ${validTools.join(', ')}\n\nUse \`/connect\` to see all tools or \`/help\` for more information.`
                });
                return;
            }
            
            result = await queryHandler.processSlashCommand('connect', toolName, userContext);
        }
        
        // Format and send response
        if (result.error) {
            await respond(`❌ ${result.error}`);
        } else if (result.attachments) {
            await respond({
                text: result.text || 'Connection interface ready:',
                attachments: result.attachments
            });
        } else if (result.blocks) {
            await respond({ blocks: result.blocks });
        } else {
            await respond(result.message || result.text || 'Connection process started.');
        }
        
    } catch (error) {
        await respond({
            text: `❌ Connection failed: ${error.message}\n\nTry \`/help\` for usage examples.`
        });
    }
});

// /disconnect command
app.command('/disconnect', async ({ command, ack, respond, client }) => {
    await ack();
    
    try {
        const toolName = command.text.trim().toLowerCase();
        
        if (!toolName) {
            await respond({
                text: "❌ Please specify a tool to disconnect.\n\n*Usage:* `/disconnect <tool>`\n*Example:* `/disconnect gmail`\n\nUse `/tool_status` to see your connected tools."
            });
            return;
        }
        
        // Get user info
        let userInfo = null;
        try {
            userInfo = await client.users.info({ user: command.user_id });
        } catch (error) {
            console.log('⚠️ Could not get user info for disconnect command:', error.message);
        }

        const userContext = {
            slackUserId: command.user_id,
            slackEmail: userInfo?.user?.profile?.email || null
        };
        
        const result = await queryHandler.processSlashCommand('disconnect', toolName, userContext);
        
        if (result.error) {
            await respond(`❌ ${result.error}`);
        } else {
            await respond(result.message || result.text || `✅ Disconnected from ${toolName}`);
        }
        
    } catch (error) {
        await respond({
            text: `❌ Disconnection failed: ${error.message}\n\nUse \`/tool_status\` to check your connections or \`/help\` for more information.`
        });
    }
});

// /status command
app.command('/tool_status', async ({ command, ack, respond, client }) => {
    await ack();
    
    try {
        // Get user info
        let userInfo = null;
        try {
            userInfo = await client.users.info({ user: command.user_id });
        } catch (error) {
            console.log('⚠️ Could not get user info for status command:', error.message);
        }

        const userContext = {
            slackUserId: command.user_id,
            slackEmail: userInfo?.user?.profile?.email || null
        };
        
        const toolName = command.text.trim().toLowerCase();
        const result = await queryHandler.processSlashCommand('status', toolName, userContext);
        
        if (result.error) {
            await respond(`❌ ${result.error}`);
        } else if (result.attachments) {
            await respond({
                text: result.text || 'Connection Status:',
                attachments: result.attachments
            });
        } else if (result.blocks) {
            await respond({ blocks: result.blocks });
        } else {
            await respond(result.message || result.text || 'Status retrieved.');
        }
        
    } catch (error) {
        await respond({
            text: `❌ Status check failed: ${error.message}\n\nTry \`/help\` for usage examples.`
        });
    }
});

// /search command
app.command('/find', async ({ command, ack, respond, client }) => {
    await ack();
    
    try {
        const searchQuery = command.text.trim();
        
        if (!searchQuery) {
            await respond({
                text: "❌ Please provide a search query.\n\n*Usage:* `/find <your query>`\n*Examples:*\n• `/find project reports`\n• `/find meeting notes from last week`\n• `/find budget spreadsheet`\n\nMake sure you have connected tools first using `/connect`."
            });
            return;
        }
        
        // Get user info
        let userInfo = null;
        try {
            userInfo = await client.users.info({ user: command.user_id });
        } catch (error) {
            console.log('⚠️ Could not get user info for search command:', error.message);
        }

        const userContext = {
            slackUserId: command.user_id,
            slackEmail: userInfo?.user?.profile?.email || null
        };
        
        const result = await queryHandler.processSlashCommand('search', searchQuery, userContext);
        
        if (result.error) {
            await respond(`❌ ${result.error}`);
        } else if (result.data) {
            // Format search results
            const formattedResponse = formatResponse(result.data, result.apiUsed);
            await respond({
                text: `🔍 Search results for: "${searchQuery}"`,
                blocks: formattedResponse
            });
        } else {
            await respond(result.message || result.text || 'Search completed.');
        }
        
    } catch (error) {
        await respond({
            text: `❌ Search failed: ${error.message}\n\nMake sure you have connected tools using \`/connect\` or try \`/help\` for more information.`
        });
    }
});

console.log('✅ Slash commands set up successfully');


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
// Handle direct messages AND channel mentions (single handler)
app.message(async ({ message, client, logger }) => {
    try {
        // Ignore bot messages and special message subtypes
        if (message.bot_id || message.subtype) {
            return;
        }

        logger.info(`Message received in ${message.channel_type}:`, message.text);
        
        // For channel messages, only process if the bot is mentioned
        if (message.channel_type === 'channel' && !message.text.includes(`<@${process.env.SLACK_BOT_USER_ID}>`)) {
            return;
        }
        
        // For DMs, process all messages
        // For channels, only process mentions

        // Show typing indicator
        await client.chat.postMessage({
            channel: message.channel,
            text: "🔍 Processing your query..."
        });

        // Get user info to extract email for API calls
        let userInfo = null;
        try {
            userInfo = await client.users.info({ user: message.user });
        } catch (error) {
            console.log('⚠️ Could not get user info:', error.message);
        }

        const userId = await requireUserAuthentication({
            email: userInfo?.user?.profile?.email,
            client,
            channel: message.channel,
        });

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

        // Remove bot mention from the message for channel messages
        let query = message.text;
        if (message.channel_type === 'channel') {
            query = query.replace(/<@\w+>/g, '').trim();
        }

        const result = await queryHandler.processQuery(query, userContext);

        if (result.error) {
            await client.chat.postMessage({
                channel: message.channel,
                text: `❌ Error: ${result.error}`
            });
            return;
        }

        // Handle different response types
        if (result.type === 'conversational' || result.message) {
            await client.chat.postMessage({
                channel: message.channel,
                text: result.message
            });
        } else if (result.blocks) {
            await client.chat.postMessage({
                channel: message.channel,
                blocks: result.blocks
            });
        } else if (result.attachments) {
            await client.chat.postMessage({
                channel: message.channel,
                text: result.text || 'Here are your results:',
                attachments: result.attachments
            });
        } else if (result.data) {
            const formattedResponse = formatResponse(result.data, result.apiUsed);
            await client.chat.postMessage({
                channel: message.channel,
                text: `Search results for your query`,
                blocks: formattedResponse
            });
        } else {
            await client.chat.postMessage({
                channel: message.channel,
                text: "I processed your request, but couldn't format the response properly."
            });
        }

    } catch (error) {
        logger.error('Error handling message:', error);
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
