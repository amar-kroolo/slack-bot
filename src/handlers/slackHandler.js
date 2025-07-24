// Slack Integration Handler for Slack Commands
// Handles authentication, connection management, and app setup for Slack
// Similar to Pipedream handler but for Slack-specific app connections

const slackService = require('../services/slackService');
const userContextService = require('../services/userContextService');

class SlackHandler {
  constructor() {
    console.log('🔧 Slack Handler initialized');
  }

  // Handle "connect slack" command
  async handleConnectCommand(slackUserId, userContext = null) {
    try {
      console.log('🔗 Processing Slack connect command for user:', slackUserId);

      // Check if user is already connected
      const connectionStatus = slackService.getConnectionStatus(slackUserId);
      
      if (connectionStatus.connected) {
        console.log('✅ User already connected to Slack apps');
        
        // Show connected status with management options
        return {
          response_type: 'ephemeral',
          text: '✅ Your Slack apps are already connected!',
          attachments: [{
            color: 'good',
            title: 'Slack Apps Connected',
            text: connectionStatus.message,
            fields: [
              {
                title: '🏢 Team',
                value: connectionStatus.teamName,
                short: true
              },
              {
                title: '🔗 Connected',
                value: new Date(connectionStatus.connectedAt).toLocaleString(),
                short: true
              },
              {
                title: '🔐 Scopes',
                value: connectionStatus.scopes.slice(0, 3).join(', ') + (connectionStatus.scopes.length > 3 ? '...' : ''),
                short: false
              }
            ],
            actions: [
              {
                type: 'button',
                text: 'Disconnect',
                name: 'disconnect_slack',
                value: 'disconnect',
                style: 'danger',
                confirm: {
                  title: 'Disconnect from Slack apps?',
                  text: 'This will remove your enhanced Slack app access.',
                  ok_text: 'Disconnect',
                  dismiss_text: 'Cancel'
                }
              },
              {
                type: 'button',
                text: 'Manage Apps',
                name: 'manage_slack_apps',
                value: 'manage',
                style: 'primary'
              }
            ]
          }]
        };
      }

      // Get popular Slack apps for quick connection
      const popularApps = slackService.getPopularSlackApps();
      
      // Generate general auth URL
      const authUrl = slackService.generateAuthURL(slackUserId, null, userContext);

      return {
        response_type: 'ephemeral',
        text: '🔗 Connect your Slack apps for enhanced functionality',
        attachments: [{
          color: '#4A154B', // Slack purple
          title: 'Slack Apps Connect Ready',
          text: 'Connect your Slack apps to enable:\n• Enhanced search across channels\n• File access and management\n• Message history search\n• App integrations',
          actions: [
            {
              type: 'button',
              text: 'Connect Slack Apps',
              url: authUrl,
              style: 'primary'
            }
          ],
          footer: `🔒 Secure OAuth 2.0 authentication`
        }, {
          color: '#36a64f',
          title: '💡 Quick Connect Options',
          text: 'Popular Slack apps you can connect:',
          fields: popularApps.slice(0, 4).map(app => ({
            title: `${app.icon} ${app.name}`,
            value: app.description,
            short: true
          })),
          actions: [
            {
              type: 'button',
              text: '💬 Workspace',
              url: slackService.createAppAuthURL(slackUserId, 'slack_workspace', userContext),
              style: 'default'
            },
            {
              type: 'button',
              text: '📁 Files',
              url: slackService.createAppAuthURL(slackUserId, 'slack_files', userContext),
              style: 'default'
            },
            {
              type: 'button',
              text: '📢 Channels',
              url: slackService.createAppAuthURL(slackUserId, 'slack_channels', userContext),
              style: 'default'
            }
          ]
        }]
      };

    } catch (error) {
      console.error('❌ Error in Slack connect command:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error connecting to Slack apps: ${error.message}`,
        attachments: [{
          color: 'danger',
          title: 'Connection Error',
          text: 'Please try again or contact support if the issue persists.',
          actions: [
            {
              type: 'button',
              text: 'Try Again',
              name: 'retry_slack_connect',
              value: 'retry',
              style: 'primary'
            }
          ]
        }]
      };
    }
  }

  // Handle "slack status" command
  async handleStatusCommand(slackUserId) {
    try {
      console.log('📊 Getting Slack connection status for user:', slackUserId);

      const connectionStatus = slackService.getConnectionStatus(slackUserId);
      const userConnections = slackService.getUserConnections(slackUserId);

      if (!connectionStatus.connected) {
        return {
          response_type: 'ephemeral',
          text: '🔗 Slack Apps Status: Not Connected',
          attachments: [{
            color: 'warning',
            title: 'No Slack App Connections',
            text: 'You haven\'t connected any Slack apps yet.',
            actions: [
              {
                type: 'button',
                text: 'Connect Slack Apps',
                name: 'connect_slack',
                value: 'connect',
                style: 'primary'
              }
            ]
          }]
        };
      }

      return {
        response_type: 'ephemeral',
        text: '✅ Slack Apps Status: Connected',
        attachments: [{
          color: 'good',
          title: 'Slack Apps Connection Status',
          text: connectionStatus.message,
          fields: [
            {
              title: '🏢 Team',
              value: connectionStatus.teamName,
              short: true
            },
            {
              title: '📱 Connected Apps',
              value: userConnections.length.toString(),
              short: true
            },
            {
              title: '🔗 Connected Since',
              value: new Date(connectionStatus.connectedAt).toLocaleString(),
              short: false
            },
            {
              title: '🔐 Available Scopes',
              value: connectionStatus.scopes.join(', '),
              short: false
            }
          ],
          actions: [
            {
              type: 'button',
              text: 'Manage Apps',
              name: 'manage_slack_apps',
              value: 'manage',
              style: 'primary'
            },
            {
              type: 'button',
              text: 'Disconnect',
              name: 'disconnect_slack',
              value: 'disconnect',
              style: 'danger'
            }
          ]
        }]
      };

    } catch (error) {
      console.error('❌ Error getting Slack status:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error getting Slack status: ${error.message}`
      };
    }
  }

  // Handle disconnect command
  async handleDisconnectCommand(slackUserId) {
    try {
      console.log('🔌 Disconnecting Slack apps for user:', slackUserId);

      const wasConnected = slackService.disconnectUser(slackUserId);
      
      if (wasConnected) {
        // Update user context
        userContextService.storeUserContext(slackUserId, {
          slackConnected: false,
          connectionStatus: 'disconnected'
        });

        return {
          response_type: 'ephemeral',
          text: '✅ Successfully disconnected from Slack apps',
          attachments: [{
            color: 'good',
            title: 'Slack Apps Disconnected',
            text: 'Your Slack app connections have been removed.',
            actions: [
              {
                type: 'button',
                text: 'Reconnect',
                name: 'connect_slack',
                value: 'connect',
                style: 'primary'
              }
            ]
          }]
        };
      } else {
        return {
          response_type: 'ephemeral',
          text: '⚠️ You were not connected to Slack apps',
          attachments: [{
            color: 'warning',
            title: 'No Connection Found',
            text: 'No active Slack app connection was found.',
            actions: [
              {
                type: 'button',
                text: 'Connect Now',
                name: 'connect_slack',
                value: 'connect',
                style: 'primary'
              }
            ]
          }]
        };
      }

    } catch (error) {
      console.error('❌ Error disconnecting Slack apps:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error disconnecting Slack apps: ${error.message}`
      };
    }
  }

  // Handle app management command
  async handleManageAppsCommand(slackUserId) {
    try {
      console.log('🛠️ Managing Slack apps for user:', slackUserId);

      const popularApps = slackService.getPopularSlackApps();
      const userConnections = slackService.getUserConnections(slackUserId);

      return {
        response_type: 'ephemeral',
        text: '🛠️ Manage Your Slack App Connections',
        attachments: [{
          color: '#4A154B',
          title: 'Available Slack Apps',
          text: 'Connect to additional Slack apps for enhanced functionality:',
          fields: popularApps.map(app => ({
            title: `${app.icon} ${app.name}`,
            value: app.description,
            short: true
          })),
          actions: popularApps.slice(0, 3).map(app => ({
            type: 'button',
            text: `${app.icon} ${app.name}`,
            url: slackService.createAppAuthURL(slackUserId, app.app_id),
            style: 'default'
          }))
        }, {
          color: 'good',
          title: 'Connected Apps',
          text: userConnections.length > 0 
            ? `You have ${userConnections.length} connected app(s)`
            : 'No apps connected yet',
          fields: userConnections.map(conn => ({
            title: conn.app_id || 'Unknown App',
            value: `Connected: ${new Date(conn.connected_at).toLocaleDateString()}`,
            short: true
          }))
        }]
      };

    } catch (error) {
      console.error('❌ Error managing Slack apps:', error.message);
      return {
        response_type: 'ephemeral',
        text: `❌ Error managing Slack apps: ${error.message}`
      };
    }
  }
}

module.exports = new SlackHandler();
