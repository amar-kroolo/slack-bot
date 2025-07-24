// Pipedream Dynamic Authentication Service
// Handles user authentication and tool connections via Pipedream

const { createBackendClient } = require('@pipedream/sdk/server');
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

    // Initialize Pipedream SDK client (like the TypeScript reference)
    this.pd = createBackendClient({
      environment: this.environment,
      projectId: this.projectId,
      credentials: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      },
    });

    // Keep axios client for fallback OAuth operations
    this.client = axios.create({
      baseURL: this.apiBase,
      headers: {
        'Authorization': `Bearer ${this.clientSecret}`,
        'Content-Type': 'application/json'
      }
    });

    // In-memory user session storage (in production, use Redis or database)
    this.userSessions = new Map();

    // Track user connections and their status
    this.userConnections = new Map(); // userId -> { connections: [], lastUpdated: timestamp }
    
    console.log('🔧 Pipedream Service initialized');
    console.log('   Client ID:', this.clientId ? `✅ Set (${this.clientId.substring(0, 10)}...)` : '❌ Missing');
    console.log('   Project ID:', this.projectId ? `✅ Set (${this.projectId.substring(0, 10)}...)` : '❌ Missing');
    console.log('   Client Secret:', this.clientSecret ? `✅ Set (${this.clientSecret.substring(0, 10)}...)` : '❌ Missing');
    console.log('   Environment:', this.environment);
    console.log('   API Base:', this.apiBase);

    // Validate required credentials
    if (!this.clientId || !this.projectId || !this.clientSecret) {
      console.error('❌ Missing required Pipedream credentials!');
      console.error('   Please check your .env file has:');
      console.error('   - PIPEDREAM_CLIENT_ID');
      console.error('   - PIPEDREAM_PROJECT_ID');
      console.error('   - PIPEDREAM_CLIENT_SECRET');
    }
  }

  // Get OAuth access token first (required for Connect API)
  async getOAuthAccessToken() {
    try {
      console.log('� Getting OAuth access token...');
      console.log('🔍 Debug - Credentials check:');
      console.log('   Client ID exists:', !!this.clientId);
      console.log('   Client Secret exists:', !!this.clientSecret);
      console.log('   Client ID length:', this.clientId?.length || 0);
      console.log('   Client Secret length:', this.clientSecret?.length || 0);

      if (!this.clientId || !this.clientSecret) {
        throw new Error('Missing Pipedream client credentials. Check PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET in .env file.');
      }

      // Use Python approach: Form data (exactly like your Python code)
      console.log('📤 OAUTH ATTEMPT: Using Python approach (form data)');

      const formData = {
        'grant_type': 'client_credentials',
        'client_id': this.clientId,
        'client_secret': this.clientSecret
      };

      console.log('📋 Request details:');
      console.log('   URL: https://api.pipedream.com/v1/oauth/token');
      console.log('   Method: POST');
      console.log('   Content-Type: application/x-www-form-urlencoded');
      console.log('   Grant Type:', formData.grant_type);
      console.log('   Client ID preview:', formData.client_id.substring(0, 10) + '...');

      const params = new URLSearchParams();
      params.append('grant_type', formData.grant_type);
      params.append('client_id', formData.client_id);
      params.append('client_secret', formData.client_secret);

      const response = await axios.post('https://api.pipedream.com/v1/oauth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = response.data;
      console.log('✅ OAuth access token obtained');
      return access_token;

    } catch (error) {
      console.error('❌ Error getting OAuth access token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Provide specific error guidance
      if (error.response?.status === 401) {
        console.error('💡 OAuth 401 Error - Possible causes:');
        console.error('   1. Invalid PIPEDREAM_CLIENT_ID');
        console.error('   2. Invalid PIPEDREAM_CLIENT_SECRET');
        console.error('   3. Credentials not properly set in .env file');
        console.error('   4. Check if credentials are from the correct Pipedream OAuth app');
      }

      throw new Error(`Failed to get OAuth access token: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create a connect token for a specific user (fallback to working manual API approach)
  async createConnectToken(external_user_id, app = null) {
    try {
      console.log('🔗 Creating Pipedream connect token for user:', external_user_id);
      console.log('   App:', app || 'Any app (user choice)');

      // Try SDK first, fallback to manual API if it fails
      try {
        console.log('🔄 Attempting SDK approach...');
        const { token, expires_at, connect_link_url } = await this.pd.createConnectToken({
          external_user_id,
        });

        console.log('✅ Connect token created successfully via SDK');
        const staticConnectUrl = `https://pipedream.com/_static/connect.html?token=${token}&connectLink=true`;
        const finalUrl = app ? `${staticConnectUrl}&app=${app}` : staticConnectUrl;

        return {
          token,
          expires_at,
          connect_link_url: finalUrl,
          original_connect_url: connect_link_url,
          app: app,
          static_format: true
        };
      } catch (sdkError) {
        console.log('⚠️ SDK failed, falling back to manual API approach...');
        console.log('   SDK Error:', sdkError.message);
      }

      // Use Python approach for connect token creation
      console.log('🔗 CONNECT TOKEN: Using Python approach...');
      const accessToken = await this.getOAuthAccessToken();
      const connectUrl = `https://api.pipedream.com/v1/connect/${this.projectId}/tokens`;

      const requestData = {
        external_user_id: external_user_id
      };

      console.log('📋 Connect token request details:');
      console.log('   URL:', connectUrl);
      console.log('   Method: POST');
      console.log('   External User ID:', external_user_id);
      console.log('   Project ID:', this.projectId);
      console.log('   Environment:', this.environment);

      const response = await axios.post(connectUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-PD-Environment': this.environment
        }
      });

      const { token, expires_at, connect_link_url } = response.data;

      console.log('✅ Connect token created successfully via manual API');
      console.log('   Token:', token ? `✅ ${token.substring(0, 20)}...` : '❌ Missing');
      console.log('   Expires:', new Date(expires_at).toLocaleString());
      console.log('   ⏰ Token valid for:', Math.round((new Date(expires_at) - new Date()) / 1000 / 60), 'minutes');

      // Generate the static connect URL format you specified
      const staticConnectUrl = `https://pipedream.com/_static/connect.html?token=${token}&connectLink=true`;
      const finalUrl = app ? `${staticConnectUrl}&app=${app}` : staticConnectUrl;

      return {
        token,
        expires_at,
        connect_link_url: finalUrl,
        original_connect_url: connect_link_url,
        app: app,
        static_format: true
      };
    } catch (error) {
      console.error('❌ Error creating connect token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to create connect token: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create connect token for specific app
  async createAppConnectToken(external_user_id, appName) {
    return this.createConnectToken(external_user_id, appName);
  }

  // Get account access token using SDK (like TypeScript reference)
  async getAccountToken(accountId) {
    try {
      console.log('🔑 Getting account token via SDK for:', accountId);

      const account = await this.pd.getAccountById(accountId);
      const access_token = account?.credentials?.access_token;

      if (!access_token) {
        throw new Error("No access token found");
      }

      console.log('✅ Account token retrieved successfully via SDK');
      return { access_token };
    } catch (error) {
      console.error('❌ Error getting account token via SDK:', {
        accountId,
        message: error.message
      });
      throw error;
    }
  }

  // Get popular apps for connection
  getPopularApps() {
    return [
      { name: 'Google Drive', slug: 'google_drive', icon: '📁' },
      { name: 'Slack', slug: 'slack', icon: '💬' },
      { name: 'Dropbox', slug: 'dropbox', icon: '📦' },
      { name: 'Confluence', slug: 'Confluence', icon: '📈' },
      { name: 'Jira', slug: 'jira', icon: '🎫' },
      { name: 'Microsoft Teams', slug: 'microsoft_teams', icon: '🎮' },
      { name: 'Document360', slug: 'document360', icon: '📚' },
      { name: 'Gmail', slug: 'gmail', icon: '📧' },
      { name: 'Notion', slug: 'notion', icon: '📝' },
      { name: 'Microsoft SharePoint', slug: 'microsoft_sharepoint', icon: '📊' },
      { name: 'Salesforce', slug: 'salesforce', icon: '☁️' }
    ];
  }

  // Store user connection after successful auth
  async storeUserConnection(external_user_id, account_id, app = null) {
    try {
      console.log('💾 Storing user connection:');
      console.log('   User:', external_user_id);
      console.log('   Account:', account_id);
      console.log('   App:', app);

      // Initialize user connections if not exists
      if (!this.userConnections) {
        this.userConnections = new Map();
      }

      // Store connection details
      const connectionData = {
        account_id,
        app,
        connected_at: new Date().toISOString(),
        status: 'active'
      };

      // Get existing connections or create new array
      const existingConnections = this.userConnections.get(external_user_id) || [];

      // Add new connection (avoid duplicates)
      const existingIndex = existingConnections.findIndex(conn =>
        conn.account_id === account_id && conn.app === app
      );

      if (existingIndex >= 0) {
        existingConnections[existingIndex] = connectionData;
        console.log('✅ Updated existing connection');
      } else {
        existingConnections.push(connectionData);
        console.log('✅ Added new connection');
      }

      this.userConnections.set(external_user_id, existingConnections);

      console.log(`📊 User ${external_user_id} now has ${existingConnections.length} connection(s)`);

      return connectionData;
    } catch (error) {
      console.error('❌ Error storing user connection:', error.message);
      throw error;
    }
  }

  // Get user's connections
  getUserConnections(external_user_id) {
    if (!this.userConnections) {
      return [];
    }
    return this.userConnections.get(external_user_id) || [];
  }

  // Get account token for API calls
  async getAccountToken(account_id) {
    try {
      console.log('🔑 Getting account token for:', account_id);

      const accessToken = await this.getOAuthAccessToken();
      const tokenUrl = `https://api.pipedream.com/v1/accounts/${account_id}/token`;

      const response = await axios.get(tokenUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Account token retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting account token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Get user's actual connected accounts from Pipedream
  async getUserConnectedAccounts(external_user_id) {
    try {
      console.log('🔍 Fetching connected accounts for user:', external_user_id);

      const accessToken = await this.getOAuthAccessToken();
      const accountsUrl = `https://api.pipedream.com/v1/users/${external_user_id}/accounts`;

      const response = await axios.get(accountsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Connected accounts retrieved:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching connected accounts:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Return your hardcoded accounts as fallback
      console.log('📋 Using fallback connected accounts');
      return [
        { "account_id": "apn_JjhlBOP", "name": "Google Drive" },
        { "account_id": "apn_gyhaYWw", "name": "Dropbox" },
        { "account_id": "apn_0WhmOPw", "name": "Jira" },
        { "account_id": "apn_KAhZwja", "name": "Confluence" },
        { "account_id": "apn_V1h9dKx", "name": "Microsoft Teams" },
        { "account_id": "apn_z8hK7n5", "name": "Microsoft SharePoint" },
        { "account_id": "apn_arhpXvr", "name": "Document 360" }
      ];
    }
  }

  // Get account credentials and extract email for dynamic user identification
  async getAccountCredentials(account_id) {
    try {
      console.log('🔑 Getting credentials for account:', account_id);

      const accessToken = await this.getOAuthAccessToken();
      const credentialsUrl = `https://api.pipedream.com/v1/accounts/${account_id}/token`;

      const response = await axios.get(credentialsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Account credentials retrieved successfully');
      console.log('   Email found:', response.data.email || response.data.user_email || 'No email');

      return {
        account_id,
        token: response.data.token,
        email: response.data.email || response.data.user_email,
        expires_at: response.data.expires_at,
        scopes: response.data.scopes,
        user_info: response.data.user_info || {}
      };
    } catch (error) {
      console.error('❌ Error getting account credentials:', {
        account_id,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Get user status with real connected accounts and dynamic email extraction
  async getUserStatus(external_user_id) {
    try {
      console.log('📊 Getting comprehensive user status for:', external_user_id);

      // Get real connected accounts from Pipedream
      const connectedAccounts = await this.getUserConnectedAccounts(external_user_id);

      // Get stored local connections
      const localConnections = this.getUserConnections(external_user_id);

      // Try to extract primary email from first connected account
      let primaryEmail = null;
      if (connectedAccounts.length > 0) {
        try {
          const firstAccountCreds = await this.getAccountCredentials(connectedAccounts[0].account_id);
          primaryEmail = firstAccountCreds.email;
          console.log('✅ Primary email extracted:', primaryEmail);
        } catch (emailError) {
          console.log('⚠️ Could not extract primary email:', emailError.message);
        }
      }

      return {
        user_id: external_user_id,
        connected: connectedAccounts.length > 0,
        primary_email: primaryEmail, // Dynamic email for API calls
        pipedream_accounts: connectedAccounts,
        local_connections: localConnections,
        total_accounts: connectedAccounts.length,
        account_names: connectedAccounts.map(acc => acc.name),
        account_ids: connectedAccounts.map(acc => acc.account_id)
      };
    } catch (error) {
      console.error('❌ Error getting user status:', error.message);
      return {
        user_id: external_user_id,
        connected: false,
        primary_email: null,
        pipedream_accounts: [],
        local_connections: [],
        total_accounts: 0,
        account_names: [],
        account_ids: [],
        error: error.message
      };
    }
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

  // Get available tool connections for user (legacy method - now returns local connections)
  async getUserConnections(slackUserId) {
    try {
      console.log('🔍 Getting user connections for:', slackUserId);

      // Try to get local stored connections first
      if (this.userConnections) {
        const localConnections = this.userConnections.get(slackUserId) || [];
        if (localConnections.length > 0) {
          console.log('✅ Found local connections:', localConnections.length);
          return localConnections;
        }
      }

      // Try OAuth-based connections as fallback
      const authStatus = this.getUserAuth(slackUserId);
      if (authStatus.authenticated) {
        try {
          const response = await this.client.get('/sources', {
            headers: {
              'Authorization': `Bearer ${authStatus.userAuth.accessToken}`
            }
          });
          const connections = response.data.data || [];
          console.log('📱 Retrieved OAuth connections:', connections.length);
          return connections;
        } catch (oauthError) {
          console.log('⚠️ OAuth connections not available:', oauthError.message);
        }
      }

      // Return empty array instead of throwing error
      console.log('📋 No connections found, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ Error fetching user connections:', error.message);
      return []; // Return empty array instead of throwing
    }
  }

  // Get dynamic user credentials for API calls with extracted email
  async getDynamicCredentials(slackUserId) {
    try {
      console.log('🔍 Getting dynamic credentials for user:', slackUserId);

      // Try to get user status with connected accounts
      const userStatus = await this.getUserStatus(slackUserId);

      if (userStatus.connected && userStatus.primary_email) {
        // Use extracted email from connected accounts
        console.log('✅ Using dynamic credentials with extracted email');
        console.log('   📧 Dynamic Email:', userStatus.primary_email);
        console.log('   🔗 Connected Accounts:', userStatus.total_accounts);

        return {
          external_user_id: slackUserId, // Use Slack user ID as external user ID
          user_email: userStatus.primary_email, // Dynamic email from connected account
          account_ids: userStatus.account_ids, // Real connected account IDs
          dynamic: true,
          slack_user_id: slackUserId,
          connected_accounts: userStatus.pipedream_accounts,
          total_accounts: userStatus.total_accounts
        };
      }

      // Fallback to old auth method
      const authStatus = this.getUserAuth(slackUserId);

      if (authStatus.authenticated) {
        console.log('✅ Using OAuth-based dynamic credentials');
        return {
          external_user_id: authStatus.userAuth.pipedreamUserId,
          user_email: authStatus.userAuth.email,
          account_ids: this.getUserAccountIds(authStatus.userAuth),
          dynamic: true,
          slack_user_id: slackUserId,
          pipedream_user_id: authStatus.userAuth.pipedreamUserId
        };
      }

    } catch (error) {
      console.error('⚠️ Error getting dynamic credentials:', error.message);
    }

    // Return static credentials as final fallback
    console.log('⚠️ Using static credentials as fallback');
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

  // Fetch account access token (like your pd.ts getAccountToken)
  async getAccountToken(accountId) {
    try {
      console.log('🔑 Fetching account access token for:', accountId);

      const response = await this.client.get(`/accounts/${accountId}`);
      const account = response.data;

      const access_token = account?.credentials?.access_token;
      if (!access_token) {
        throw new Error("No access token found for account");
      }

      console.log('✅ Access token retrieved successfully');
      return { access_token };

    } catch (error) {
      console.error('❌ Error fetching account token:', error.response?.data || error.message);
      throw new Error(`Failed to get account token: ${error.response?.data?.message || error.message}`);
    }
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

  // ===== USER CONNECTION MANAGEMENT =====

  // Get user's connected apps
  async getUserConnections(userId) {
    console.log('🔍 Getting user connections for:', userId);

    try {
      // In production, this would query Pipedream API to get actual connections
      // For now, we'll use our local tracking + simulate API call

      const response = await axios.get(`${this.apiBase}/connect/${this.projectId}/accounts`, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        params: {
          external_user_id: userId
        }
      });

      console.log('✅ User connections retrieved:', response.data);

      // Update our local cache
      this.userConnections.set(userId, {
        connections: response.data.accounts || [],
        lastUpdated: new Date().toISOString()
      });

      return response.data.accounts || [];

    } catch (error) {
      console.log('⚠️ Could not fetch from Pipedream API, using local cache');
      console.log('   Error:', error.message);

      // Fallback to local cache
      const cached = this.userConnections.get(userId);
      return cached ? cached.connections : [];
    }
  }

  // Add a connection for user (called after successful auth)
  addUserConnection(userId, appName, connectionData = {}) {
    console.log('➕ Adding connection for user:', userId, 'app:', appName);

    const existing = this.userConnections.get(userId) || { connections: [], lastUpdated: null };

    // Check if connection already exists
    const existingIndex = existing.connections.findIndex(conn => conn.app === appName);

    const connectionInfo = {
      app: appName,
      connected_at: new Date().toISOString(),
      status: 'connected',
      account_id: connectionData.account_id || `acc_${Date.now()}`,
      ...connectionData
    };

    if (existingIndex >= 0) {
      // Update existing connection
      existing.connections[existingIndex] = connectionInfo;
      console.log('🔄 Updated existing connection');
    } else {
      // Add new connection
      existing.connections.push(connectionInfo);
      console.log('✅ Added new connection');
    }

    existing.lastUpdated = new Date().toISOString();
    this.userConnections.set(userId, existing);

    console.log('📊 User now has', existing.connections.length, 'connections');
    return connectionInfo;
  }

  // Remove a connection for user
  async removeUserConnection(userId, appName) {
    console.log('🗑️ Removing connection for user:', userId, 'app:', appName);

    try {
      // In production, call Pipedream API to disconnect
      // For now, we'll simulate the API call and update local cache

      const existing = this.userConnections.get(userId) || { connections: [], lastUpdated: null };
      const connectionIndex = existing.connections.findIndex(conn => conn.app === appName);

      if (connectionIndex === -1) {
        console.log('❌ Connection not found');
        return { success: false, message: 'Connection not found' };
      }

      const connection = existing.connections[connectionIndex];

      // TODO: In production, make API call to Pipedream to disconnect
      // await axios.delete(`${this.apiBase}/connect/${this.projectId}/accounts/${connection.account_id}`, {
      //   headers: { 'Authorization': `Bearer ${await this.getAccessToken()}` }
      // });

      // Remove from local cache
      existing.connections.splice(connectionIndex, 1);
      existing.lastUpdated = new Date().toISOString();
      this.userConnections.set(userId, existing);

      console.log('✅ Connection removed successfully');
      console.log('📊 User now has', existing.connections.length, 'connections');

      return {
        success: true,
        message: `${appName} disconnected successfully`,
        remainingConnections: existing.connections.length
      };

    } catch (error) {
      console.error('❌ Error removing connection:', error.message);
      return { success: false, message: 'Failed to disconnect. Please try again.' };
    }
  }

  // Get list of connected app names for search API
  getConnectedAppsForSearch(userId) {
    console.log('🔍 Getting connected apps for search API, user:', userId);

    const userConnections = this.userConnections.get(userId);
    if (!userConnections || !userConnections.connections.length) {
      console.log('📋 No connections found, using default apps');
      return ["google_drive", "slack", "dropbox", "jira", "zendesk", "document360"];
    }

    const connectedApps = userConnections.connections
      .filter(conn => conn.status === 'connected')
      .map(conn => this.mapAppNameForSearch(conn.app));

    // Always include Slack as it's internal
    if (!connectedApps.includes('slack')) {
      connectedApps.push('slack');
    }

    console.log('📊 Connected apps for search:', connectedApps);
    return connectedApps;
  }

  // Map Pipedream app names to search API app names
  mapAppNameForSearch(pipedreamAppName) {
    const mapping = {
      'google_drive': 'google_drive',
      'gmail': 'gmail',
      'dropbox': 'dropbox',
      'jira': 'jira',
      'confluence': 'confluence',
      'microsoft_teams': 'microsoft_teams',
      'microsoft_sharepoint': 'sharepoint',
      'document_360': 'document360',
      'github': 'github',
      'notion': 'notion',
      'airtable': 'airtable',
      'zendesk': 'zendesk'
    };

    return mapping[pipedreamAppName] || pipedreamAppName;
  }

  // Check if user has specific app connected
  isAppConnected(userId, appName) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return false;

    return userConnections.connections.some(conn =>
      conn.app === appName && conn.status === 'connected'
    );
  }

  // Get connection statistics
  getConnectionStats(userId) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) {
      return { total: 0, connected: 0, lastUpdated: null };
    }

    const connected = userConnections.connections.filter(conn => conn.status === 'connected').length;

    return {
      total: userConnections.connections.length,
      connected: connected,
      lastUpdated: userConnections.lastUpdated,
      connections: userConnections.connections
    };
  }
}

module.exports = new PipedreamService();
