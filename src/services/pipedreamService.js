// Pipedream Dynamic Authentication Service
// Handles user authentication and tool connections via Pipedream

const axios = require('axios');

class PipedreamService {
  constructor() {
    // Ensure dotenv is loaded
    require('dotenv').config();

    this.clientId = process.env.PIPEDREAM_CLIENT_ID;
    this.projectId = process.env.PIPEDREAM_PROJECT_ID;
    this.clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;
    this.environment = process.env.PIPEDREAM_ENV || 'development';
    this.apiBase = process.env.PIPEDREAM_API_BASE || 'https://api.pipedream.com/v1';
    
    // Initialize Pipedream client
    this.client = axios.create({
      baseURL: this.apiBase,
      headers: {
        'Authorization': `Bearer ${this.clientSecret}`,
        'Content-Type': 'application/json'
      }
    });

    // In-memory user session storage (in production, use Redis or database)
    this.userSessions = new Map();
    
    console.log('🔧 Pipedream Service initialized');
    console.log('   Client ID:', this.clientId ? '✅ Configured' : '❌ Missing');
    console.log('   Project ID:', this.projectId ? '✅ Configured' : '❌ Missing');
    console.log('   Environment:', this.environment);
  }

  // Generate OAuth URL for user authentication
  generateAuthURL(slackUserId, returnUrl = null) {
    const state = this.generateState(slackUserId);
    const redirectUri = `${process.env.SLACK_BOT_URL || 'http://localhost:3000'}/auth/pipedream/callback`;
    
    const authUrl = `https://pipedream.com/oauth/authorize?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `state=${state}&` +
      `scope=read:user,read:connections,write:connections`;

    console.log('🔗 Generated Pipedream Auth URL for user:', slackUserId);
    return authUrl;
  }

  // Generate secure state parameter
  generateState(slackUserId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const state = `${slackUserId}_${timestamp}_${random}`;
    
    // Store state for validation
    this.userSessions.set(state, {
      slackUserId,
      timestamp,
      status: 'pending'
    });

    return state;
  }

  // Handle OAuth callback and exchange code for tokens
  async handleAuthCallback(code, state) {
    try {
      console.log('🔄 Processing Pipedream OAuth callback');
      console.log('   Code:', code ? 'Received' : 'Missing');
      console.log('   State:', state);

      // Validate state
      const session = this.userSessions.get(state);
      if (!session) {
        throw new Error('Invalid or expired state parameter');
      }

      // Exchange code for access token
      const tokenResponse = await axios.post('https://pipedream.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Get user information from Pipedream
      const userResponse = await axios.get('https://api.pipedream.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userData = userResponse.data;
      
      // Store user authentication data
      const userAuth = {
        slackUserId: session.slackUserId,
        pipedreamUserId: userData.id,
        email: userData.email,
        name: userData.name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
        connectedAt: new Date().toISOString(),
        status: 'authenticated'
      };

      this.userSessions.set(session.slackUserId, userAuth);
      this.userSessions.delete(state); // Clean up state

      console.log('✅ User authenticated successfully');
      console.log('   Slack User ID:', session.slackUserId);
      console.log('   Pipedream User ID:', userData.id);
      console.log('   Email:', userData.email);

      return userAuth;

    } catch (error) {
      console.error('❌ Pipedream OAuth error:', error.message);
      throw error;
    }
  }

  // Get user's authentication status
  getUserAuth(slackUserId) {
    const userAuth = this.userSessions.get(slackUserId);
    
    if (!userAuth) {
      return { authenticated: false, reason: 'not_connected' };
    }

    if (userAuth.expiresAt && Date.now() > userAuth.expiresAt) {
      return { authenticated: false, reason: 'token_expired', userAuth };
    }

    return { authenticated: true, userAuth };
  }

  // Get available tool connections for user
  async getUserConnections(slackUserId) {
    try {
      const authStatus = this.getUserAuth(slackUserId);
      if (!authStatus.authenticated) {
        throw new Error('User not authenticated');
      }

      const response = await this.client.get('/sources', {
        headers: {
          'Authorization': `Bearer ${authStatus.userAuth.accessToken}`
        }
      });

      const connections = response.data.data || [];
      
      console.log('📱 Retrieved user connections:', connections.length);
      return connections;

    } catch (error) {
      console.error('❌ Error fetching user connections:', error.message);
      throw error;
    }
  }

  // Get dynamic user credentials for API calls
  getDynamicCredentials(slackUserId) {
    const authStatus = this.getUserAuth(slackUserId);
    
    if (!authStatus.authenticated) {
      // Return static credentials as fallback
      console.log('⚠️ User not authenticated, using static credentials');
      return {
        external_user_id: "686652ee4314417de20af851",
        user_email: "ayush.enterprise.search@gmail.com",
        account_ids: [
          "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb", 
          "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
        ],
        dynamic: false
      };
    }

    // Return dynamic credentials based on authenticated user
    console.log('✅ Using dynamic credentials for authenticated user');
    return {
      external_user_id: authStatus.userAuth.pipedreamUserId,
      user_email: authStatus.userAuth.email,
      account_ids: this.getUserAccountIds(authStatus.userAuth),
      dynamic: true,
      slack_user_id: slackUserId,
      pipedream_user_id: authStatus.userAuth.pipedreamUserId
    };
  }

  // Get user's account IDs based on their connections
  getUserAccountIds(userAuth) {
    // This would typically be determined by the user's connected tools
    // For now, return a default set, but this should be dynamic based on connections
    return [
      `pd_${userAuth.pipedreamUserId}`, // Pipedream-based account ID
      "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb", 
      "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
    ];
  }

  // Disconnect user
  disconnectUser(slackUserId) {
    const removed = this.userSessions.delete(slackUserId);
    console.log(removed ? '✅ User disconnected' : '⚠️ User was not connected');
    return removed;
  }

  // Get connection status for Slack display
  getConnectionStatus(slackUserId) {
    const authStatus = this.getUserAuth(slackUserId);
    
    if (!authStatus.authenticated) {
      return {
        connected: false,
        message: "🔗 Not connected to Pipedream",
        action: "Connect your account to access personalized search"
      };
    }

    return {
      connected: true,
      message: `✅ Connected as ${authStatus.userAuth.name} (${authStatus.userAuth.email})`,
      connectedAt: authStatus.userAuth.connectedAt,
      userId: authStatus.userAuth.pipedreamUserId
    };
  }
}

module.exports = new PipedreamService();
