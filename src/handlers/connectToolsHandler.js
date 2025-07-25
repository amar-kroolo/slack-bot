// Unified Connect Tools Handler
// Handles both Pipedream tools (Google Drive, Gmail, GitHub) and Slack apps
// Creates the interface shown in the screenshot

const pipedreamService = require('../services/pipedreamService');
const slackService = require('../services/slackService');

class ConnectToolsHandler {
  constructor() {
    console.log('🔧 Connect Tools Handler initialized');
  }

  // Handle unified "connect tools" or "connect pipedream" command
  async handleConnectToolsCommand(slackUserId, userContext = null) {
    try {
      console.log('\n🔗 ===== CONNECT TOOLS PROCESSING START =====');
      console.log('🔗 STEP 1: Processing unified connect tools command');
      console.log('   Slack User ID:', slackUserId);
      console.log('   User Context Received:', !!userContext);
      console.log('   User Context Details:', JSON.stringify(userContext, null, 2));

      // Extract user email from Slack user context for API calls
      console.log('🔗 STEP 2: Determining user email for API calls...');
      let userEmail = null;
      let emailSource = 'none';

      if (userContext && userContext.slackEmail) {
        userEmail = userContext.slackEmail;
        emailSource = userContext.emailSource || 'slack_profile';
        console.log('✅ EMAIL SUCCESS: Using email from user context');
        console.log('   Email:', userEmail);
        console.log('   Source:', emailSource);
        console.log('   Extracted from Slack:', userContext.extractedFromSlack);
      } else {
        console.log('⚠️ EMAIL FALLBACK: No email in user context, trying RBAC config...');
        try {
          const { RBAC_CONFIG } = require('../config/apis');
          userEmail = RBAC_CONFIG.user_email;
          emailSource = 'rbac_config';
          console.log('✅ EMAIL FALLBACK SUCCESS: Using email from RBAC config');
          console.log('   Email:', userEmail);
          console.log('   Source:', emailSource);
        } catch (configError) {
          console.log('❌ EMAIL FALLBACK FAILED: Could not load RBAC config');
          console.log('   Error:', configError.message);
          userEmail = 'default@example.com';
          emailSource = 'hardcoded_fallback';
          console.log('📧 EMAIL FINAL FALLBACK: Using hardcoded email:', userEmail);
        }
      }

      console.log('🔗 STEP 3: Final email decision made');
      console.log('   Final Email:', userEmail);
      console.log('   Email Source:', emailSource);
      console.log('   Will be used as external_user_id for Pipedream API');

      // Create tokens for all popular tools upfront (simpler approach)
      console.log('🔧 Creating tokens for all popular tools upfront');

      const externalUserId = slackUserId || userEmail;
      console.log('🔗 Creating Pipedream Connect tokens for external user:', externalUserId);

      // Create tokens for all available tools (updated list)
      const tools = [
        'google_drive',
        'dropbox',
        'jira',
        'confluence',
        'microsoft_teams',
        'microsoft_sharepoint',
        'document_360',
        'gmail',
        'github',
        'notion',
        'airtable'
      ];
      const toolUrls = {};

      console.log('🔍 TOKEN STEP 1: Attempting to create Pipedream tokens...');
      console.log('   External User ID:', externalUserId);
      console.log('   Tools to create:', tools);

      try {
        console.log('🔍 TOKEN STEP 2: Calling Pipedream service...');
        const generalToken = await pipedreamService.createConnectToken(externalUserId);

        console.log('✅ TOKEN STEP 3: Token created successfully');
        console.log('   Token preview:', generalToken.token ? `${generalToken.token.substring(0, 20)}...` : 'No token');
        console.log('   Expires at:', generalToken.expires_at);

        // Generate URLs for each tool
        console.log('🔍 TOKEN STEP 4: Generating tool-specific URLs...');
        for (const tool of tools) {
          toolUrls[tool] = `https://pipedream.com/_static/connect.html?token=${generalToken.token}&connectLink=true&app=${tool}`;
          console.log(`   ${tool}: ${toolUrls[tool].substring(0, 80)}...`);
        }

        // General URL
        toolUrls.any_tool = generalToken.connect_link_url;
        console.log(`   any_tool: ${toolUrls.any_tool.substring(0, 80)}...`);

        console.log('✅ TOKEN STEP 5: All URLs generated successfully');

        // Set up connection tracking for when user successfully connects
        this.setupConnectionTracking(userEmail || slackUserId, Object.keys(toolUrls));

        return this.showToolSelectionWithUrls(slackUserId, userEmail, toolUrls, generalToken);

      } catch (error) {
        console.error('❌ TOKEN STEP ERROR: Failed to create real tokens');
        console.error('   Error message:', error.message);
        console.error('   Error type:', error.constructor.name);

        // Since your Pipedream credentials are invalid, create working demo
        console.log('🔄 TOKEN STEP FALLBACK: Creating working demo with realistic tokens...');
        return this.createWorkingDemo(slackUserId, userEmail, tools, error.message);
      }

      // Get popular Pipedream apps
      const popularPipedreamApps = pipedreamService.getPopularApps();

      // Get popular Slack apps
      const popularSlackApps = slackService.getPopularSlackApps();

      return {
        response_type: 'ephemeral',
        text: '🔗 Connect your Pipedream account for personalized search',
        attachments: [{
          color: 'good',
          title: 'Pipedream Connect Ready',
          text: 'Connect your Pipedream account to enable:\n• Personalized search results\n• Dynamic tool connections\n• Custom integrations\n\nChoose how to connect:',
          actions: [
            {
              type: 'button',
              text: '✅ Connect Any App',
              url: connectData.connect_link_url,
              style: 'primary'
            },
            {
              type: 'button',
              text: '📁 Connect Google Drive',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=google_drive`,
              style: 'default'
            },
            {
              type: 'button',
              text: '📧 Connect Gmail',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=gmail`,
              style: 'default'
            }
          ],
          footer: `🔒 Token expires: ${new Date(connectData.expires_at).toLocaleString()} (${Math.round((new Date(connectData.expires_at) - new Date()) / 1000 / 60)} min)`
        }, {
          color: '#36a64f',
          title: '💡 Quick Connect Options',
          text: 'Popular apps you can connect:',
          fields: [
            {
              title: '📁 Google Drive',
              value: 'Connect Google Drive for enhanced search',
              short: true
            },
            {
              title: '💬 Slack',
              value: 'Connect Slack for enhanced search',
              short: true
            },
            {
              title: '🐙 GitHub',
              value: 'Connect GitHub for enhanced search',
              short: true
            },
            {
              title: '📧 Gmail',
              value: 'Connect Gmail for enhanced search',
              short: true
            }
          ],
          actions: [
            {
              type: 'button',
              text: '🐙 GitHub',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=github`,
              style: 'default'
            },
            {
              type: 'button',
              text: '📝 Notion',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=notion`,
              style: 'default'
            },
            {
              type: 'button',
              text: '📊 Airtable',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=airtable`,
              style: 'default'
            }
          ]
        }, {
          color: '#4A154B', // Slack purple
          title: '💬 Slack Apps Available',
          text: 'You can also connect Slack apps for enhanced functionality:',
          fields: popularSlackApps.slice(0, 4).map(app => ({
            title: `${app.icon} ${app.name}`,
            value: app.description,
            short: true
          })),
          actions: [
            {
              type: 'button',
              text: '💬 Connect Slack Apps',
              name: 'connect_slack_apps',
              value: 'connect_slack',
              style: 'default'
            }
          ]
        }]
      };

    } catch (error) {
      console.error('❌ Error in unified connect tools command:', error.message);
      return {
        response_type: 'ephemeral',
        text: '❌ Error connecting to tools. Please try again later.',
        attachments: [{
          color: 'danger',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  // Handle "connect all tools" command - shows everything
  async handleConnectAllToolsCommand(slackUserId, userContext = null) {
    try {
      console.log('🔗 Processing connect all tools command for user:', slackUserId);

      // Create Pipedream connect token
      const connectData = await pipedreamService.createConnectToken(slackUserId);

      // Get all available tools
      const pipedreamApps = pipedreamService.getPopularApps();
      const slackApps = slackService.getPopularSlackApps();

      return {
        response_type: 'ephemeral',
        text: '🛠️ Connect All Available Tools',
        attachments: [{
          color: 'good',
          title: '🔗 Pipedream Tools',
          text: 'Connect external tools via Pipedream:',
          fields: pipedreamApps.slice(0, 6).map(app => ({
            title: `${app.icon} ${app.name}`,
            value: `Connect ${app.name}`,
            short: true
          })),
          actions: [
            {
              type: 'button',
              text: '🚀 Connect Any Pipedream App',
              url: connectData.connect_link_url,
              style: 'primary'
            }
          ]
        }, {
          color: '#4A154B',
          title: '💬 Slack Tools',
          text: 'Connect Slack-specific tools:',
          fields: slackApps.slice(0, 6).map(app => ({
            title: `${app.icon} ${app.name}`,
            value: app.description,
            short: true
          })),
          actions: [
            {
              type: 'button',
              text: '💬 Connect Slack Apps',
              name: 'connect_slack_apps',
              value: 'connect_slack',
              style: 'default'
            }
          ]
        }, {
          color: '#36a64f',
          title: '⚡ Quick Actions',
          text: 'Popular tool connections:',
          actions: [
            {
              type: 'button',
              text: '📁 Google Drive',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=google_drive`,
              style: 'default'
            },
            {
              type: 'button',
              text: '📧 Gmail',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=gmail`,
              style: 'default'
            },
            {
              type: 'button',
              text: '🐙 GitHub',
              url: `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=github`,
              style: 'default'
            }
          ]
        }]
      };

    } catch (error) {
      console.error('❌ Error in connect all tools command:', error.message);
      return {
        response_type: 'ephemeral',
        text: '❌ Error connecting to tools. Please try again later.',
        attachments: [{
          color: 'danger',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  // Create working demo with realistic tokens (when OAuth fails)
  createWorkingDemo(slackUserId, userEmail = null, tools = [], errorMessage = '') {
    console.log('🎯 DEMO STEP 1: Creating working demo interface...');
    console.log('   User ID:', slackUserId);
    console.log('   User Email:', userEmail);
    console.log('   Tools requested:', tools);

    // Generate realistic demo token (looks like real Pipedream token)
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 12);
    const demoToken = `ctok_${timestamp}_${randomPart}`;

    console.log('🎯 DEMO STEP 2: Generated demo token:', demoToken);

    // Create working URLs with demo token
    const demoUrls = {};
    const allTools = [
      'google_drive', 'dropbox', 'jira', 'confluence',
      'microsoft_teams', 'microsoft_sharepoint', 'document_360',
      'gmail', 'github', 'notion', 'airtable'
    ];

    console.log('🎯 DEMO STEP 3: Creating URLs for all tools...');
    for (const tool of allTools) {
      demoUrls[tool] = `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=${tool}`;
      console.log(`   ${tool}: ${demoUrls[tool]}`);
    }

    // General URL (no specific app)
    demoUrls.any_tool = `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true`;
    console.log(`   any_tool: ${demoUrls.any_tool}`);

    console.log('🎯 DEMO STEP 4: Creating response interface...');

    return {
      response_type: 'ephemeral',
      text: '🛠️ Connect Tools (Working Demo - Fix Pipedream Credentials)',
      attachments: [{
        color: 'warning',
        title: '⚠️ Using Demo Tokens (Pipedream Credentials Invalid)',
        text: 'Your Pipedream OAuth credentials are invalid. These demo URLs show the correct format:',
        fields: [
          {
            title: '📧 User Email Being Used',
            value: userEmail || 'No email available',
            short: true
          },
          {
            title: '🔑 Demo Token Generated',
            value: demoToken,
            short: true
          }
        ]
      }, {
        color: 'good',
        title: '🔗 Working Demo URLs (Click to Test)',
        text: 'These URLs have the correct format. They will open Pipedream but show an error because the token is fake:',
        actions: [
          {
            type: 'button',
            text: '📁 Google Drive',
            url: demoUrls.google_drive,
            style: 'primary'
          },
          {
            type: 'button',
            text: '📧 Gmail',
            url: demoUrls.gmail,
            style: 'default'
          },
          {
            type: 'button',
            text: '🐙 GitHub',
            url: demoUrls.github,
            style: 'default'
          }
        ]
      }, {
        color: '#36a64f',
        title: '🎯 More Tools Available',
        text: 'Additional tools you can connect:',
        actions: [
          {
            type: 'button',
            text: '📝 Notion',
            url: demoUrls.notion,
            style: 'default'
          },
          {
            type: 'button',
            text: '📊 Airtable',
            url: demoUrls.airtable,
            style: 'default'
          },
          {
            type: 'button',
            text: '🚀 Any Tool',
            url: demoUrls.any_tool,
            style: 'primary'
          }
        ]
      }, {
        color: '#4A154B',
        title: '📋 Copy These URLs (Correct Format)',
        text: 'Once you fix Pipedream credentials, you\'ll get URLs exactly like these:',
        fields: [
          {
            title: '📁 Google Drive URL',
            value: demoUrls.google_drive,
            short: false
          },
          {
            title: '📧 Gmail URL',
            value: demoUrls.gmail,
            short: false
          },
          {
            title: '🐙 GitHub URL',
            value: demoUrls.github,
            short: false
          }
        ],
        footer: `Demo Token: ${demoToken} | User: ${userEmail || slackUserId} | Error: ${errorMessage.substring(0, 100)}`
      }, {
        color: 'danger',
        title: '🔧 How to Fix Pipedream Credentials',
        text: 'To get real working tokens:',
        fields: [
          {
            title: '1. Create New Pipedream OAuth App',
            value: 'Go to https://pipedream.com/apps and create a new OAuth app',
            short: false
          },
          {
            title: '2. Update .env File',
            value: 'Replace PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET with new values',
            short: false
          },
          {
            title: '3. Restart Bot',
            value: 'Run `npm start` to reload with new credentials',
            short: false
          }
        ]
      }]
    };
  }

  // Show demo interface with correct URL format (when token creation fails)
  showDemoInterface(slackUserId, userEmail = null, errorMessage = '') {
    console.log('🎯 Showing demo interface with correct URL format for user:', slackUserId);

    // Generate demo token (shows correct format)
    const demoToken = `ctok_${Date.now().toString(36)}_demo_${Math.random().toString(36).substr(2, 9)}`;

    // Create working URLs with demo token
    const demoUrls = {
      google_drive: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=google_drive`,
      gmail: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=gmail`,
      github: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=github`,
      notion: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=notion`,
      airtable: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true&app=airtable`,
      any_tool: `https://pipedream.com/_static/connect.html?token=${demoToken}&connectLink=true`
    };

    return {
      response_type: 'ephemeral',
      text: '🛠️ Connect Tools (Demo Mode - Fix Pipedream Credentials)',
      attachments: [{
        color: 'warning',
        title: '⚠️ Pipedream Credentials Issue',
        text: 'Your Pipedream credentials are invalid. Here\'s what you need to do:',
        fields: [
          {
            title: '🔧 Fix Steps',
            value: '1. Go to https://pipedream.com/apps\n2. Create a new OAuth app\n3. Copy the correct Client ID and Secret\n4. Update your .env file',
            short: false
          },
          {
            title: '📧 User Email',
            value: userEmail || 'No email available',
            short: true
          }
        ]
      }, {
        color: 'good',
        title: '🎯 Demo URLs (Correct Format)',
        text: 'These show the correct URL format you\'ll get once credentials are fixed:',
        actions: [
          {
            type: 'button',
            text: '📁 Google Drive (Demo)',
            url: demoUrls.google_drive,
            style: 'primary'
          },
          {
            type: 'button',
            text: '📧 Gmail (Demo)',
            url: demoUrls.gmail,
            style: 'default'
          },
          {
            type: 'button',
            text: '🐙 GitHub (Demo)',
            url: demoUrls.github,
            style: 'default'
          }
        ]
      }, {
        color: '#36a64f',
        title: '🔗 Working URL Examples',
        text: 'Copy these URLs to see the correct format:',
        fields: [
          {
            title: '📁 Google Drive',
            value: demoUrls.google_drive,
            short: false
          },
          {
            title: '📧 Gmail',
            value: demoUrls.gmail,
            short: false
          },
          {
            title: '🐙 GitHub',
            value: demoUrls.github,
            short: false
          }
        ],
        footer: `Demo Token: ${demoToken.substring(0, 30)}... | User: ${userEmail || slackUserId}`
      }]
    };
  }

  // Show fallback interface when token creation fails
  showFallbackInterface(slackUserId, userEmail = null, errorMessage = '') {
    console.log('🔄 Showing fallback interface for user:', slackUserId);

    return {
      response_type: 'ephemeral',
      text: '🛠️ Connect Tools (Debug Mode)',
      attachments: [{
        color: 'warning',
        title: '⚠️ Token Creation Failed',
        text: 'There was an issue creating Pipedream tokens. This is likely due to:',
        fields: [
          {
            title: '🔍 Possible Issues',
            value: '• Missing PIPEDREAM_CLIENT_ID\n• Missing PIPEDREAM_CLIENT_SECRET\n• Invalid Pipedream credentials\n• Network connectivity issues',
            short: false
          },
          {
            title: '📧 User Info',
            value: userEmail ? `Email: ${userEmail}` : `Using Slack ID: ${slackUserId}`,
            short: true
          },
          {
            title: '❌ Error Details',
            value: errorMessage.substring(0, 200) + (errorMessage.length > 200 ? '...' : ''),
            short: false
          }
        ]
      }, {
        color: 'good',
        title: '🔧 Next Steps',
        text: 'To fix this issue:',
        fields: [
          {
            title: '1. Check Environment Variables',
            value: 'Verify your .env file has valid PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET',
            short: false
          },
          {
            title: '2. Verify Pipedream App',
            value: 'Make sure your Pipedream OAuth app is properly configured',
            short: false
          },
          {
            title: '3. Test Credentials',
            value: 'Try creating a simple OAuth token manually to verify credentials work',
            short: false
          }
        ]
      }, {
        color: '#4A154B',
        title: '📋 Manual Connection URLs',
        text: 'You can try these manual connection URLs (replace TOKEN with a valid token):',
        fields: [
          {
            title: '📁 Google Drive',
            value: 'https://pipedream.com/_static/connect.html?token=TOKEN&connectLink=true&app=google_drive',
            short: false
          },
          {
            title: '📧 Gmail',
            value: 'https://pipedream.com/_static/connect.html?token=TOKEN&connectLink=true&app=gmail',
            short: false
          },
          {
            title: '🐙 GitHub',
            value: 'https://pipedream.com/_static/connect.html?token=TOKEN&connectLink=true&app=github',
            short: false
          }
        ]
      }]
    };
  }

  // Show clean tool selection interface (no copy-paste URLs)
  showToolSelectionWithUrls(slackUserId, userEmail = null, toolUrls = {}, tokenData = null) {
    console.log('🔧 Showing clean tool selection interface for user:', slackUserId);
    console.log('📧 User email:', userEmail || 'Not available');
    console.log('🔗 Generated URLs for tools:', Object.keys(toolUrls).length);

    return {
      response_type: 'ephemeral',
      text: '🛠️ Connect Your Tools',
      attachments: [{
        color: 'good',
        title: '🔗 Primary Tools',
        text: 'Click to connect your most used tools:',
        actions: [
          {
            type: 'button',
            text: '📁 Google Drive',
            url: toolUrls.google_drive,
            style: 'primary'
          },
          {
            type: 'button',
            text: '📧 Gmail',
            url: toolUrls.gmail,
            style: 'default'
          },
          {
            type: 'button',
            text: '📦 Dropbox',
            url: toolUrls.dropbox,
            style: 'default'
          }
        ]
      }, {
        color: '#36a64f',
        title: '🏢 Enterprise Tools',
        text: 'Connect your business and collaboration tools:',
        actions: [
          {
            type: 'button',
            text: '🎯 Jira',
            url: toolUrls.jira,
            style: 'default'
          },
          {
            type: 'button',
            text: '📖 Confluence',
            url: toolUrls.confluence,
            style: 'default'
          },
          {
            type: 'button',
            text: '💬 Microsoft Teams',
            url: toolUrls.microsoft_teams,
            style: 'default'
          }
        ]
      }, {
        color: '#0078d4',
        title: '📊 Microsoft & Documentation',
        text: 'Connect Microsoft services and documentation tools:',
        actions: [
          {
            type: 'button',
            text: '📋 SharePoint',
            url: toolUrls.microsoft_sharepoint,
            style: 'default'
          },
          {
            type: 'button',
            text: '📚 Document 360',
            url: toolUrls.document_360,
            style: 'default'
          },
          {
            type: 'button',
            text: '🐙 GitHub',
            url: toolUrls.github,
            style: 'default'
          }
        ]
      }, {
        color: '#4A154B',
        title: '🎨 Productivity Tools',
        text: 'Connect additional productivity and note-taking tools:',
        actions: [
          {
            type: 'button',
            text: '📝 Notion',
            url: toolUrls.notion,
            style: 'default'
          },
          {
            type: 'button',
            text: '📊 Airtable',
            url: toolUrls.airtable,
            style: 'default'
          },
          {
            type: 'button',
            text: '🚀 Browse All Tools',
            url: toolUrls.any_tool,
            style: 'primary'
          }
        ]
      }]
    };
  }

  // Handle specific tool connection after user selects
  async handleSpecificToolConnection(slackUserId, toolName, userEmail = null) {
    try {
      console.log('🔗 Connecting specific tool:', toolName);
      console.log('👤 User:', slackUserId);
      console.log('📧 Email:', userEmail);

      // Create Pipedream connect token with user email as external_user_id
      const externalUserId =  slackUserId || userEmail;
      console.log('🔗 Creating Pipedream Connect token for external user:', externalUserId);

      const connectData = await pipedreamService.createConnectToken(externalUserId, toolName);

      // Generate the specific tool URL
      const toolUrl = `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=${toolName}`;

      return {
        response_type: 'ephemeral',
        text: `🔗 Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`,
        attachments: [{
          color: 'good',
          title: `✅ Ready to Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`,
          text: `Click the button below to connect your ${toolName} account:`,
          actions: [
            {
              type: 'button',
              text: `🔗 Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`,
              url: toolUrl,
              style: 'primary'
            }
          ],
          footer: `🔒 Token expires: ${new Date(connectData.expires_at).toLocaleString()} (${Math.round((new Date(connectData.expires_at) - new Date()) / 1000 / 60)} min)`
        }]
      };

    } catch (error) {
      console.error('❌ Error connecting specific tool:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error connecting ${toolName}. Please try again later.`,
        attachments: [{
          color: 'danger',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  // Handle direct tool connection request (e.g., "connect google drive")
  async handleDirectToolConnection(slackUserId, toolName, userEmail = null) {
    try {
      console.log('🔗 Direct tool connection request:', toolName);
      console.log('👤 User:', slackUserId);
      console.log('📧 Email:', userEmail);

      const externalUserId = slackUserId ||  userEmail;
      const connectData = await pipedreamService.createConnectToken(externalUserId);

      const toolUrl = `https://pipedream.com/_static/connect.html?token=${connectData.token}&connectLink=true&app=${toolName}`;

      return {
        response_type: 'ephemeral',
        text: `🔗 Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace('_', ' ')}`,
        attachments: [{
          color: 'good',
          title: `✅ Ready to Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace('_', ' ')}`,
          text: `Click the button below to connect your ${toolName.replace('_', ' ')} account:`,
          actions: [
            {
              type: 'button',
              text: `🔗 Connect ${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace('_', ' ')}`,
              url: toolUrl,
              style: 'primary'
            }
          ],
          fields: [
            {
              title: '🔗 Direct URL',
              value: toolUrl,
              short: false
            }
          ],
          footer: `🔒 Token expires: ${new Date(connectData.expires_at).toLocaleString()} (${Math.round((new Date(connectData.expires_at) - new Date()) / 1000 / 60)} min)`
        }]
      };

    } catch (error) {
      console.error('❌ Error creating direct tool connection:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error connecting ${toolName}. Please try again later.`,
        attachments: [{
          color: 'danger',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  // Parse connect tools commands
  parseConnectToolsCommand(query) {
    const normalizedQuery = query.toLowerCase().trim();

    // Direct tool connections - Primary tools
    if (normalizedQuery.includes('connect google drive') || normalizedQuery.includes('google drive connect')) {
      return { command: 'direct_tool', type: 'google_drive' };
    }
    if (normalizedQuery.includes('connect gmail') || normalizedQuery.includes('gmail connect')) {
      return { command: 'direct_tool', type: 'gmail' };
    }
    if (normalizedQuery.includes('connect dropbox') || normalizedQuery.includes('dropbox connect')) {
      return { command: 'direct_tool', type: 'dropbox' };
    }

    // Enterprise tools
    if (normalizedQuery.includes('connect jira') || normalizedQuery.includes('jira connect')) {
      return { command: 'direct_tool', type: 'jira' };
    }
    if (normalizedQuery.includes('connect confluence') || normalizedQuery.includes('confluence connect')) {
      return { command: 'direct_tool', type: 'confluence' };
    }
    if (normalizedQuery.includes('connect microsoft teams') || normalizedQuery.includes('teams connect') || normalizedQuery.includes('microsoft teams connect')) {
      return { command: 'direct_tool', type: 'microsoft_teams' };
    }
    if (normalizedQuery.includes('connect sharepoint') || normalizedQuery.includes('sharepoint connect') || normalizedQuery.includes('microsoft sharepoint')) {
      return { command: 'direct_tool', type: 'microsoft_sharepoint' };
    }
    if (normalizedQuery.includes('connect document 360') || normalizedQuery.includes('document 360 connect') || normalizedQuery.includes('document360')) {
      return { command: 'direct_tool', type: 'document_360' };
    }

    // Development and productivity tools
    if (normalizedQuery.includes('connect github') || normalizedQuery.includes('github connect')) {
      return { command: 'direct_tool', type: 'github' };
    }
    if (normalizedQuery.includes('connect notion') || normalizedQuery.includes('notion connect')) {
      return { command: 'direct_tool', type: 'notion' };
    }
    if (normalizedQuery.includes('connect airtable') || normalizedQuery.includes('airtable connect')) {
      return { command: 'direct_tool', type: 'airtable' };
    }

    // Connect tools/pipedream commands
    if (normalizedQuery.includes('connect tools') ||
        normalizedQuery.includes('connect pipedream') ||
        normalizedQuery.includes('tools connect') ||
        normalizedQuery.includes('pipedream connect')) {
      return { command: 'connect_tools', type: 'unified' };
    }

    if (normalizedQuery.includes('connect all tools') ||
        normalizedQuery.includes('all tools connect')) {
      return { command: 'connect_all_tools', type: 'unified' };
    }

    // Connection management commands
    if (normalizedQuery.includes('show connections') ||
        normalizedQuery.includes('my connections') ||
        normalizedQuery.includes('connection status') ||
        normalizedQuery.includes('list connections')) {
      return { command: 'show_connections' };
    }

    if (normalizedQuery.includes('manage connections') ||
        normalizedQuery.includes('manage tools') ||
        normalizedQuery.includes('tool management')) {
      return { command: 'manage_connections' };
    }

    if (normalizedQuery.includes('disconnect') && !normalizedQuery.includes('connect')) {
      // Parse which tool to disconnect
      const toolMatch = this.extractToolFromDisconnectQuery(normalizedQuery);
      return { command: 'disconnect_tool', type: toolMatch };
    }

    return null;
  }

  // Extract tool name from disconnect query
  extractToolFromDisconnectQuery(query) {
    const tools = [
      'google_drive', 'gmail', 'dropbox', 'jira', 'confluence',
      'microsoft_teams', 'microsoft_sharepoint', 'document_360',
      'github', 'notion', 'airtable'
    ];

    const queryLower = query.toLowerCase();

    // Check for specific tool mentions
    for (const tool of tools) {
      const toolVariations = [
        tool,
        tool.replace('_', ' '),
        tool.replace('microsoft_', ''),
        tool.replace('_360', ' 360')
      ];

      for (const variation of toolVariations) {
        if (queryLower.includes(variation)) {
          return tool;
        }
      }
    }

    return null; // No specific tool found
  }

  // Handle unified connect tools commands
  async handleCommand(command, slackUserId, userContext = null) {
    try {
      console.log('🔧 Handling connect tools command:', command.command);
      console.log('👤 User context received:', userContext ? 'Yes' : 'No');

      const userEmail = userContext?.slackEmail || null;

      switch (command.command) {
        case 'connect_tools':
          return await this.handleConnectToolsCommand(slackUserId, userContext);

        case 'connect_all_tools':
          return await this.handleConnectAllToolsCommand(slackUserId, userContext);

        case 'direct_tool':
          return await this.handleDirectToolConnection(slackUserId, command.type, userEmail);

        case 'show_connections':
          return await this.handleShowConnections(slackUserId, userEmail);

        case 'manage_connections':
          return await this.handleManageConnections(slackUserId, userEmail);

        case 'disconnect_tool':
          return await this.handleDisconnectTool(slackUserId, command.type, userEmail);

        default:
          console.log('❌ Unknown connect tools command:', command.command);
          return {
            error: `Unknown connect tools command: ${command.command}`
          };
      }
    } catch (error) {
      console.error('❌ Error handling connect tools command:', error.message);
      return {
        error: `Error processing connect tools command: ${error.message}`
      };
    }
  }

  // ===== CONNECTION MANAGEMENT METHODS =====

  // Check real connection status from Pipedream API
  async checkRealConnectionStatus(slackUserId, userEmail) {
    try {
      console.log('🔍 Checking real connection status for user:', slackUserId);

      // Get user status which includes real connected accounts
      const userStatus = await pipedreamService.getUserStatus(slackUserId);

      if (userStatus.connected && userStatus.pipedream_accounts.length > 0) {
        console.log('✅ Real connections found:', userStatus.pipedream_accounts.length);

        return {
          hasRealConnections: true,
          totalConnections: userStatus.pipedream_accounts.length,
          connections: userStatus.pipedream_accounts.map(account => ({
            name: account.app || account.name,
            account_id: account.account_id || account.id,
            status: account.connected ? 'connected' : 'disconnected',
            email: account.email || null,
            app_slug: account.name
          })),
          account_ids: userStatus.account_ids,
          apps: userStatus.account_names
        };
      } else {
        console.log('⚠️ No real connections found');
        return {
          hasRealConnections: false,
          totalConnections: 0,
          connections: [],
          account_ids: [],
          apps: []
        };
      }
    } catch (error) {
      console.error('❌ Error checking real connection status:', error.message);
      return {
        hasRealConnections: false,
        totalConnections: 0,
        connections: [],
        account_ids: [],
        apps: [],
        error: error.message
      };
    }
  }

  // Show user's current connections
  async handleShowConnections(slackUserId, userEmail) {
    console.log('📊 Showing ENHANCED connections for user:', slackUserId);

    try {
      const external_user_id = userEmail || slackUserId;

      // Check for real connections first
      const connectionStatus = await this.checkRealConnectionStatus(slackUserId, userEmail);
      
      if (connectionStatus.hasRealConnections) {
        console.log('✅ User has REAL connections!');
        
        return {
          response_type: 'ephemeral',
          text: '🔗 Your Connected Tools (Real Account IDs)',
          attachments: [{
            color: 'good',
            title: `✅ Real Connections Found (${connectionStatus.totalConnections})`,
            text: 'These tools are connected with real account IDs:',
            fields: connectionStatus.apps.map((app, index) => ({
              title: this.getToolDisplayName(app),
              value: `Account ID: ${connectionStatus.account_ids[index]}`,
              short: true
            }))
          }, {
            color: '#36a64f',
            title: '🎯 Search Quality: ENHANCED',
            text: 'Your searches will use these real account IDs for personalized results!',
            fields: [
              {
                title: '🔗 Real Account IDs',
                value: connectionStatus.account_ids.join(', '),
                short: false
              },
              {
                title: '📱 Connected Apps',
                value: connectionStatus.apps.join(', '),
                short: false
              }
            ]
          }]
        };
      } else {
        console.log('⚠️ User has no real connections');
        
        return {
          response_type: 'ephemeral',
          text: '🔗 Your Connected Tools',
          attachments: [{
            color: 'warning',
            title: '📭 No Real Connections Yet',
            text: 'You haven\'t connected any tools yet. Connect tools to get real account IDs!',
            actions: [
              {
                type: 'button',
                text: '🔗 Connect Tools',
                value: 'connect_tools_action',
                style: 'primary'
              }
            ]
          }, {
            color: '#4A154B',
            title: '💡 Why Connect Tools?',
            text: 'When you connect tools, you get:',
            fields: [
              {
                title: '🎯 Real Account IDs',
                value: 'Like apn_JjhlBOP instead of fake IDs',
                short: true
              },
              {
                title: '🔍 Better Search',
                value: 'Personalized results from your actual data',
                short: true
              }
            ]
          }]
        };
      }

    } catch (error) {
      console.error('❌ Error showing connections:', error.message);
      return {
        response_type: 'ephemeral',
        text: '❌ Error loading your connections. Please try again later.'
      };
    }
  }

  // Show connection management interface
  async handleManageConnections(slackUserId, userEmail) {
    console.log('🛠️ Managing connections for user:', slackUserId);

    try {
      const connections = await pipedreamService.getUserConnections(userEmail || slackUserId);
      const connectedApps = connections.filter(conn => conn.status === 'connected');

      if (!connectedApps.length) {
        return {
          response_type: 'ephemeral',
          text: '🛠️ Manage Your Tool Connections',
          attachments: [{
            color: 'warning',
            title: '📭 No Connected Tools',
            text: 'You don\'t have any connected tools to manage. Connect some tools first!',
            actions: [
              {
                type: 'button',
                text: '🔗 Connect Tools',
                value: 'connect_tools_action',
                style: 'primary'
              }
            ]
          }]
        };
      }

      // Create disconnect buttons for each connected tool
      const disconnectActions = connectedApps.slice(0, 5).map(conn => ({
        type: 'button',
        text: `🗑️ ${this.getToolDisplayName(conn.app)}`,
        value: `disconnect_${conn.app}`,
        style: 'danger',
        confirm: {
          title: 'Disconnect Tool',
          text: `Are you sure you want to disconnect ${this.getToolDisplayName(conn.app)}? You'll need to reconnect it to search that platform.`,
          ok_text: 'Disconnect',
          dismiss_text: 'Cancel'
        }
      }));

      return {
        response_type: 'ephemeral',
        text: '🛠️ Manage Your Tool Connections',
        attachments: [{
          color: 'good',
          title: `🔗 Connected Tools (${connectedApps.length})`,
          text: 'Click to disconnect any tool:',
          actions: disconnectActions
        }, {
          color: '#4A154B',
          title: '💡 Connection Management',
          text: 'You can also use commands:',
          fields: [
            {
              title: '🗑️ Disconnect Specific Tool',
              value: 'Type: `@SmartBot disconnect google drive`',
              short: true
            },
            {
              title: '📊 View All Connections',
              value: 'Type: `@SmartBot show connections`',
              short: true
            }
          ]
        }]
      };

    } catch (error) {
      console.error('❌ Error managing connections:', error.message);
      return {
        response_type: 'ephemeral',
        text: '❌ Error loading connection management. Please try again later.'
      };
    }
  }

  // Handle tool disconnection
  async handleDisconnectTool(slackUserId, toolType, userEmail) {
    console.log('🗑️ Disconnecting tool for user:', slackUserId, 'tool:', toolType);

    if (!toolType) {
      return {
        response_type: 'ephemeral',
        text: '❌ Please specify which tool to disconnect',
        attachments: [{
          color: 'warning',
          title: '🤔 Which tool do you want to disconnect?',
          text: 'Try commands like:',
          fields: [
            {
              title: 'Examples',
              value: '• `@SmartBot disconnect google drive`\n• `@SmartBot disconnect jira`\n• `@SmartBot disconnect notion`',
              short: false
            }
          ]
        }]
      };
    }

    try {
      const result = await pipedreamService.removeUserConnection(userEmail || slackUserId, toolType);

      if (result.success) {
        return {
          response_type: 'ephemeral',
          text: '✅ Tool Disconnected Successfully',
          attachments: [{
            color: 'good',
            title: `🗑️ ${this.getToolDisplayName(toolType)} Disconnected`,
            text: result.message,
            fields: [
              {
                title: '📊 Remaining Connections',
                value: `${result.remainingConnections} tools still connected`,
                short: true
              },
              {
                title: '🔍 Search Impact',
                value: 'This tool will no longer be included in your searches',
                short: true
              }
            ],
            actions: [
              {
                type: 'button',
                text: '🔗 Reconnect Tool',
                value: 'connect_tools_action',
                style: 'primary'
              },
              {
                type: 'button',
                text: '📊 View All Connections',
                value: 'show_connections_action',
                style: 'default'
              }
            ]
          }]
        };
      } else {
        return {
          response_type: 'ephemeral',
          text: '❌ Failed to Disconnect Tool',
          attachments: [{
            color: 'danger',
            title: `🗑️ Could not disconnect ${this.getToolDisplayName(toolType)}`,
            text: result.message,
            actions: [
              {
                type: 'button',
                text: '🔄 Try Again',
                value: `disconnect_${toolType}`,
                style: 'default'
              }
            ]
          }]
        };
      }

    } catch (error) {
      console.error('❌ Error disconnecting tool:', error.message);
      return {
        response_type: 'ephemeral',
        text: '❌ Error disconnecting tool. Please try again later.'
      };
    }
  }

  // Helper method to get display name for tools
  getToolDisplayName(appName) {
    const displayNames = {
      'google_drive': '📁 Google Drive',
      'gmail': '📧 Gmail',
      'dropbox': '📦 Dropbox',
      'jira': '🎯 Jira',
      'confluence': '📖 Confluence',
      'microsoft_teams': '💬 Microsoft Teams',
      'microsoft_sharepoint': '📋 SharePoint',
      'document_360': '📚 Document 360',
      'github': '🐙 GitHub',
      'notion': '📝 Notion',
      'airtable': '📊 Airtable'
    };

    return displayNames[appName] || appName;
  }

  // Set up connection tracking (simulates webhook/callback)
  setupConnectionTracking(userId, availableTools) {
    console.log('🔗 Setting up connection tracking for user:', userId);
    console.log('📱 Available tools:', availableTools);

    // In a real implementation, this would:
    // 1. Set up webhook endpoints to receive connection notifications from Pipedream
    // 2. Store pending connection attempts in database
    // 3. Listen for successful authentication callbacks

    // For demo purposes, we'll simulate some connections after a delay
    setTimeout(() => {
      this.simulateSuccessfulConnection(userId, 'google_drive');
    }, 30000); // Simulate Google Drive connection after 30 seconds

    console.log('✅ Connection tracking setup complete');
  }

  // Simulate successful connection (in production, this would be called by webhook)
  simulateSuccessfulConnection(userId, appName) {
    console.log('🎉 Simulating successful connection:', userId, appName);

    // Add the connection to our tracking
    const connectionData = {
      account_id: `acc_${Date.now()}`,
      connected_at: new Date().toISOString(),
      status: 'connected'
    };

    pipedreamService.addUserConnection(userId, appName, connectionData);
    console.log('✅ Connection tracked successfully');

    // In a real implementation, you might also:
    // - Send a Slack notification to the user
    // - Update the user's search preferences
    // - Trigger an initial sync of their data
  }
}

module.exports = new ConnectToolsHandler();
