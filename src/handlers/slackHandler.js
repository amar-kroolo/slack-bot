// Slack Integration Handler – *plain-text* responses only
// NOTE: all business logic and service-calls remain unchanged.
const slackService        = require('../services/slackService');
const userContextService  = require('../services/userContextService');

class SlackHandler {
  constructor() {
    console.log('🔧 Slack Handler initialised');
  }

  /* ───────────────────────────── CONNECT ───────────────────────────── */
  async handleConnectCommand(slackUserId, userContext = null) {
    try {
      console.log('🔗 Processing Slack connect command for user:', slackUserId);

      const status = slackService.getConnectionStatus(slackUserId);

      /* Already connected → tell the user and give simple tips */
      if (status.connected) {
        const scopes = status.scopes?.join(', ') || 'None';
        return {
          response_type: 'ephemeral',
          text:
            `✅ You already connected your Slack apps!\n\n` +
            `• Team : *${status.teamName || 'Unknown'}*\n` +
            `• Connected : ${new Date(status.connectedAt).toLocaleString()}\n` +
            `• Scopes : ${scopes}\n\n` +
            `👉 To disconnect run */disconnect slack*  – to manage apps run */slack apps*`
        };
      }

      /* Not connected yet → send OAuth link & quick-connect URLs */
      const authUrl      = slackService.generateAuthURL(slackUserId, null, userContext);
      const popularApps  = slackService.getPopularSlackApps().slice(0, 3);

      let quickLinks = popularApps
        .map(a => `• ${a.icon} *${a.name}*: <${slackService.createAppAuthURL(slackUserId, a.app_id, userContext)}|Connect>`)
        .join('\n');

      return {
        response_type: 'ephemeral',
        text:
          `🔗 *Connect your Slack workspace apps*\n` +
          `Click to authorise: <${authUrl}|Connect Slack Apps>\n\n` +
          `Popular quick-connect options:\n${quickLinks}\n\n` +
          `🔒 Uses secure OAuth 2.0`
      };

    } catch (err) {
      console.error('❌ Slack connect error:', err);
      return {
        response_type: 'ephemeral',
        text: `❌ Error connecting Slack apps: ${err.message}`
      };
    }
  }

  /* ───────────────────────────── STATUS ───────────────────────────── */
  async handleStatusCommand(slackUserId) {
    try {
      console.log('📊 Getting Slack status for', slackUserId);

      const status          = slackService.getConnectionStatus(slackUserId);
      const userConnections = slackService.getUserConnections(slackUserId);

      if (!status.connected) {
        return {
          response_type: 'ephemeral',
          text:
            `🔗 *Slack Apps Status*: _Not Connected_\n` +
            `Run */connect slack* to link your workspace apps.`
        };
      }

      return {
        response_type: 'ephemeral',
        text:
          `✅ *Slack Apps Status*: Connected\n\n` +
          `• Team : *${status.teamName || 'Unknown'}*\n` +
          `• Connected apps : ${userConnections.length}\n` +
          `• Since : ${new Date(status.connectedAt).toLocaleString()}\n` +
          `• Scopes : ${status.scopes?.join(', ') || 'None'}\n\n` +
          `👉  */slack apps*  to manage or */disconnect slack* to unlink`
      };

    } catch (err) {
      console.error('❌ Slack status error:', err);
      return {
        response_type: 'ephemeral',
        text: `❌ Error getting Slack status: ${err.message}`
      };
    }
  }

  /* ─────────────────────────── DISCONNECT ─────────────────────────── */
  async handleDisconnectCommand(slackUserId) {
    try {
      console.log('🔌 Disconnecting Slack apps for', slackUserId);

      const wasConnected = slackService.disconnectUser(slackUserId);

      if (wasConnected) {
        // Update cached user context
        userContextService.storeUserContext(slackUserId, {
          slackConnected: false,
          connectionStatus: 'disconnected'
        });

        return {
          response_type: 'ephemeral',
          text:
            `✅ Successfully disconnected all Slack apps.\n` +
            `You can reconnect any time with */connect slack*`
        };
      }

      return {
        response_type: 'ephemeral',
        text:
          `⚠️ No active Slack app connection found.\n` +
          `Run */connect slack* to link your workspace apps.`
      };

    } catch (err) {
      console.error('❌ Slack disconnect error:', err);
      return {
        response_type: 'ephemeral',
        text: `❌ Error disconnecting Slack apps: ${err.message}`
      };
    }
  }

  /* ─────────────────────────── MANAGE APPS ────────────────────────── */
  async handleManageAppsCommand(slackUserId) {
    try {
      console.log('🛠  Managing Slack apps for', slackUserId);

      const popularApps     = slackService.getPopularSlackApps();
      const userConnections = slackService.getUserConnections(slackUserId);

      const available = popularApps
        .map(a => `• ${a.icon} *${a.name}*: <${slackService.createAppAuthURL(slackUserId, a.app_id)}|Connect>`)
        .join('\n');

      const connected = userConnections.length
        ? userConnections.map(c =>
            `• ${c.app_id || 'Unknown App'} (connected ${new Date(c.connected_at).toLocaleDateString()})`
          ).join('\n')
        : '_None yet_';

      return {
        response_type: 'ephemeral',
        text:
          `🛠 *Manage Slack App Connections*\n\n` +
          `*Available apps to connect*\n${available}\n\n` +
          `*Currently connected apps*\n${connected}`
      };

    } catch (err) {
      console.error('❌ Slack manage-apps error:', err);
      return {
        response_type: 'ephemeral',
        text: `❌ Error managing Slack apps: ${err.message}`
      };
    }
  }
}

module.exports = new SlackHandler();
