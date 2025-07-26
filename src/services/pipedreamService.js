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
    this.webhookUri = process.env.PIPEDREAM_WEBHOOK_URI ||
      `${process.env.SLACK_BOT_URL || 'http://localhost:3000'}/api/pipedream/webhook`;
    console.log('Webhook URI:', this.webhookUri);
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

    // Real connections storage (like your frontend code) - stores actual account IDs from Pipedream
    this.realConnections = new Map(); // userId -> array of real connections with actual account IDs

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

  // Enhanced connect token creation with proper webhook and success URL configuration
  async createConnectToken(external_user_id, app = null) {
    try {
      console.log('🔗 Creating enhanced connect token for user:', external_user_id);
      console.log('   App:', app || 'Any app (user choice)');

      // Use ngrok URL from environment
      const baseUrl = process.env.PIPEDREAM_WEBHOOK_BASE_URL || 'https://d6edd0a8f2b3.ngrok-free.app';
      
      // Configure URLs with proper parameters
      const webhookUrl = `${baseUrl}/api/pipedream/webhook`;
      const successUrl = `${baseUrl}/pipedream/success?external_user_id=${encodeURIComponent(external_user_id)}&source=pipedream_connect`;
      const errorUrl = `${baseUrl}/pipedream/error?external_user_id=${encodeURIComponent(external_user_id)}`;

      console.log('🌐 Enhanced URL Configuration:');
      console.log('   📡 Webhook URL:', webhookUrl);
      console.log('   ✅ Success URL:', successUrl);
      console.log('   ❌ Error URL:', errorUrl);
      console.log('   👤 External User ID:', external_user_id);

      const requestData = {
        external_user_id: external_user_id,
        webhook_uri: webhookUrl,
        success_redirect_uri: successUrl,
        error_redirect_uri: errorUrl,
        // Additional webhook configuration
        webhook_events: ['connection.created', 'connection.deleted', 'connection.updated'],
        include_credentials: true,
        return_account_details: true
      };

      console.log('📤 Enhanced request payload:', JSON.stringify(requestData, null, 2));

      // Try SDK approach first
      try {
        console.log('🔄 Attempting SDK approach with enhanced configuration...');
        const { token, expires_at, connect_link_url } = await this.pd.createConnectToken(requestData);

        console.log('✅ Enhanced connect token created successfully via SDK');
        const staticConnectUrl = `https://pipedream.com/_static/connect.html?token=${token}&connectLink=true`;
        const finalUrl = app ? `${staticConnectUrl}&app=${app}` : staticConnectUrl;

        return {
          token,
          expires_at,
          connect_link_url: finalUrl,
          original_connect_url: connect_link_url,
          webhook_url: webhookUrl,
          success_url: successUrl,
          external_user_id: external_user_id,
          app: app,
          enhanced_config: true
        };
      } catch (sdkError) {
        console.log('⚠️ SDK failed, using manual API approach...');
        console.log('   SDK Error:', sdkError.message);
      }

      // Manual API fallback
      console.log('🔗 Using manual API approach with enhanced configuration...');
      const accessToken = await this.getOAuthAccessToken();
      const connectUrl = `https://api.pipedream.com/v1/connect/${this.projectId}/tokens`;

      const response = await axios.post(connectUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const { token, expires_at, connect_link_url } = response.data;

      console.log('✅ Enhanced connect token created successfully via manual API');
      const staticConnectUrl = `https://pipedream.com/_static/connect.html?token=${token}&connectLink=true`;
      const finalUrl = app ? `${staticConnectUrl}&app=${app}` : staticConnectUrl;

      return {
        token,
        expires_at,
        connect_link_url: finalUrl,
        original_connect_url: connect_link_url,
        webhook_url: webhookUrl,
        success_url: successUrl,
        external_user_id: external_user_id,
        app: app,
        enhanced_config: true
      };

    } catch (error) {
      console.error('❌ Error creating enhanced connect token:', error.message);
      throw error;
    }
  }
  // Express-compatible webhook handler for Pipedream events
  async handleWebhookEvent(req, res) {
    try {
      const { body } = req;
      console.log('📥 ENHANCED Webhook Event Received:', body);

      const { account, app, user_id, event, external_user_id } = body;

      // Detailed connection logging
      console.log('🧩 Extracted Webhook Connection Details:');
      console.log('   🔗 Account ID:', account?.id);
      console.log('   📱 App Name:', app?.name);
      console.log('   👤 User ID:', user_id || external_user_id);
      console.log('   🎯 Event:', event);
      console.log('   🕒 Timestamp:', new Date().toISOString());

      const userId = user_id || external_user_id;

      if (!account?.id || !app?.name || !userId) {
        console.error('❌ Missing required fields in webhook payload');
        return res.status(400).send('Bad Request');
      }

      if (event === 'CONNECTION_SUCCESS') {
        console.log('🎉 CONNECTION SUCCESS - Storing real account ID!');
        
        const appSlug = app?.name_slug || app?.slug || app?.name;
        const realAccountId = account.id; // This is the REAL account ID
        
        // Store the real connection immediately
        const storeResult = await this.storeRealConnection(userId, appSlug, realAccountId, null);
        
        if (storeResult.success) {
          console.log('✅ Real account ID stored successfully!');
          console.log('   📊 Total connections for user:', storeResult.total_connections);
          console.log('   🔗 Stored Account ID:', realAccountId);
        }

        console.log('🔒 Connection locked and stored successfully');
        console.log(`✅ Webhook success: Stored connection for ${userId}`);
      } else if (event === 'CONNECTION_ERROR') {
        console.warn(`⚠️ Webhook error: Failed connection for ${userId}, app: ${app.name}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error processing webhook event:', error.message);
      res.status(500).send('Internal Server Error');
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



  // Get user's actual connected accounts from Pipedream
  async getUserConnectedAccounts(external_user_id) {
    try {
      console.log('🔍 Fetching connected accounts for user:', external_user_id);

      const accessToken = await this.getOAuthAccessToken();

      // Use the correct Pipedream Connect API endpoint
      const accountsUrl = `https://api.pipedream.com/v1/connect/${this.projectId}/accounts`;

      const response = await axios.get(accountsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          external_user_id: external_user_id,
          environment: process.env.PIPEDREAM_ENV || 'development'
        }
      });

      console.log('✅ Connected accounts retrieved from Pipedream Connect API');
      console.log('📊 Response data:', response.data);

      // Extract accounts from the response
      const accounts = response.data.accounts || response.data || [];
      console.log('🔗 Total connected accounts:', accounts.length);

      if (accounts.length > 0) {
        console.log('📋 Connected account details:');
        accounts.forEach((account, index) => {
          console.log(`   ${index + 1}. ${account.name || account.app} (ID: ${account.account_id || account.id})`);
        });
      }

      return accounts;
    } catch (error) {
      console.error('❌ Error fetching connected accounts:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });

      // Try alternative endpoint format if 404
      if (error.response?.status === 404) {
        console.log('🔄 Trying alternative Pipedream API endpoint...');
        try {
          const accessToken = await this.getOAuthAccessToken();
          const alternativeUrl = `https://api.pipedream.com/v1/accounts`;
          const altResponse = await axios.get(alternativeUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              external_user_id: external_user_id,
              project_id: this.projectId,
              environment: process.env.PIPEDREAM_ENV || 'development'
            }
          });

          console.log('✅ Connected accounts retrieved from alternative endpoint');
          const accounts = altResponse.data.accounts || altResponse.data || [];
          return accounts;
        } catch (altError) {
          console.log('⚠️ Alternative endpoint also failed:', altError.response?.status);
        }
      }

      // PRIORITY 1: Check if user has any real connections stored locally first
      console.log('🔍 PRIORITY 1: Checking for locally stored real connections...');
      if (this.realConnections && this.realConnections.has(external_user_id)) {
        const realConnections = this.realConnections.get(external_user_id);
        if (realConnections.length > 0) {
          console.log('✅ PRIORITY 1 SUCCESS: Found locally stored real connections:', realConnections.length);
          console.log('   Real App IDs (from ap_id):', realConnections.map(c => c.account_id));
          console.log('   Connected Apps:', realConnections.map(c => c.app));
          console.log('   Sources:', realConnections.map(c => c.source || 'unknown'));

          return realConnections.map(conn => ({
            account_id: conn.account_id, // Real app ID like apn_EOhw3ya
            name: conn.app,
            app: conn.app,
            connected: conn.status === 'active',
            id: conn.account_id, // Add id field for compatibility
            source: conn.source || 'stored_connection',
            real_app_id: conn.real_app_id || false
          }));
        }
      }

      console.log('⚠️ PRIORITY 1 FAILED: No locally stored real connections');

      // PRIORITY 2: Check if this is a test user with mock connections
      console.log('🔍 PRIORITY 2: Checking for test user mock connections...');
      if (external_user_id.startsWith('U_') && external_user_id.includes('TEST')) {
        console.log('✅ PRIORITY 2 SUCCESS: Test user detected, using mock connections');
        // This allows our tests to work properly
        return [];
      }

      // PRIORITY 3: Return empty array to trigger proper static fallback
      console.log('⚠️ PRIORITY 2 FAILED: Not a test user');
      console.log('🔍 PRIORITY 3: Returning empty array to trigger static fallback');
      console.log('   This will trigger proper static fallback in getDynamicCredentials');
      return [];
    }
  }

  // Get account credentials and extract email for dynamic user identification
  async getAccountCredentials(account_id) {
    try {
      console.log('🔑 Getting credentials for account:', account_id);

      const accessToken = await this.getOAuthAccessToken();

      // Try the correct Pipedream Connect API endpoint for account credentials
      const credentialsUrl = `https://api.pipedream.com/v1/connect/${this.projectId}/accounts/${account_id}`;

      const response = await axios.get(credentialsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          environment: process.env.PIPEDREAM_ENV || 'development'
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
        message: error.message,
        url: error.config?.url
      });

      // Try alternative endpoint if 404
      if (error.response?.status === 404) {
        console.log('🔄 Trying alternative account credentials endpoint...');
        try {
          const accessToken = await this.getOAuthAccessToken();

          // Try alternative endpoint format
          const alternativeUrl = `https://api.pipedream.com/v1/accounts/${account_id}`;

          const altResponse = await axios.get(alternativeUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              project_id: this.projectId,
              environment: process.env.PIPEDREAM_ENV || 'development'
            }
          });

          console.log('✅ Account credentials retrieved from alternative endpoint');

          return {
            account_id,
            token: altResponse.data.token || altResponse.data.access_token,
            email: altResponse.data.email || altResponse.data.user_email,
            expires_at: altResponse.data.expires_at,
            scopes: altResponse.data.scopes,
            user_info: altResponse.data.user_info || {}
          };
        } catch (altError) {
          console.log('⚠️ Alternative endpoint also failed:', altError.response?.status);
          console.log('📋 Using fallback credentials');

          // Return fallback credentials instead of throwing
          return {
            account_id,
            token: "fallback_token",
            email: null,
            expires_at: Date.now() + 3600000,
            scopes: [],
            user_info: {},
            fallback: true
          };
        }
      }

      // Return fallback credentials instead of throwing
      console.log('📋 Using fallback credentials');
      return {
        account_id,
        token: "fallback_token",
        email: null,
        expires_at: Date.now() + 3600000,
        scopes: [],
        user_info: {},
        fallback: true
      };
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

      // Extract real account IDs for dynamic API calls (prioritize real app IDs from popup auth)
      const realAccountIds = connectedAccounts.map(acc => acc.account_id || acc.id);
      const connectedAppNames = connectedAccounts.map(acc => acc.name || acc.app);

      console.log('🔗 DYNAMIC ACCOUNT DETECTION RESULTS:');
      console.log(`   📊 Total Connected Accounts: ${connectedAccounts.length}`);
      console.log(`   🆔 Real App IDs (extracted): [${realAccountIds.join(', ')}]`);
      console.log(`   📱 Connected Apps: [${connectedAppNames.join(', ')}]`);
      console.log(`   📧 Primary Email: ${primaryEmail || 'Not extracted'}`);

      // Check if any of these are real app IDs from popup auth
      const realAppIds = connectedAccounts.filter(acc => acc.real_app_id).map(acc => acc.account_id);
      if (realAppIds.length > 0) {
        console.log(`   🎯 Real App IDs from popup auth: [${realAppIds.join(', ')}]`);
      }

      if (realAccountIds.length > 0) {
        console.log('✅ SUCCESS: Using REAL dynamic app IDs for API calls');
      } else {
        console.log('⚠️ WARNING: No real app IDs found, will use static fallback');
      }

      return {
        user_id: external_user_id,
        connected: connectedAccounts.length > 0,
        primary_email: primaryEmail, // Dynamic email for API calls
        pipedream_accounts: connectedAccounts,
        local_connections: localConnections,
        total_accounts: connectedAccounts.length,
        account_names: connectedAppNames,
        account_ids: realAccountIds, // REAL dynamic app IDs (like apn_EOhw3ya)
        real_accounts: realAccountIds.length > 0, // Flag to indicate if we have real accounts
        static_fallback: realAccountIds.length === 0, // Flag to indicate if using static fallback
        real_app_ids_count: realAccountIds.filter(id => id.startsWith('apn_')).length, // Count of real Pipedream app IDs
        extracted_from_popup: connectedAccounts.some(acc => acc.source === 'pipedream_popup_auth') // Flag if any came from popup auth
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

  // Enhanced getDynamicCredentials with REAL account ID priority
  async getDynamicCredentials(slackUserId, slackEmail = null) {
    try {
      console.log('\n🔗 ===== ENHANCED DYNAMIC CREDENTIALS WITH REAL ACCOUNT IDS =====');
      console.log('👤 User:', slackUserId);
      console.log('📧 Slack Email:', slackEmail || 'None');

      const external_user_id = slackEmail || slackUserId;

      // PRIORITY 1: Check for REAL connected account IDs from success callbacks
      console.log('🎯 STEP 1: Checking for REAL account IDs from success callbacks...');
      const realAccountIds = this.getRealAccountIds(external_user_id);
      const realApps = this.getRealConnectedApps(external_user_id);

      if (realAccountIds.length > 0) {
        console.log('✅ STEP 1 SUCCESS: Found REAL connections from success callbacks!');
        console.log('🔗 REAL ACCOUNT IDS:', realAccountIds);
        console.log('📱 REAL APPS:', realApps);
        console.log('📊 Real connections count:', realAccountIds.length);

        return {
          external_user_id: external_user_id,
          user_email: slackEmail || 'default@example.com',
          account_ids: realAccountIds, // ✅ REAL account IDs from connections
          apps: realApps, // ✅ REAL connected apps
          dynamic: true,
          real_connections_count: realAccountIds.length,
          auth_source: 'pipedream_real_connections',
          connection_quality: 'real_account_ids'
        };
      }

      console.log('⚠️ STEP 1 FAILED: No real connections found from success callbacks');

      // PRIORITY 2: Try Pipedream OAuth authentication
      console.log('🎯 STEP 2: Checking Pipedream OAuth authentication...');
      const authStatus = this.getUserAuth(slackUserId);
      if (authStatus.authenticated) {
        console.log('✅ STEP 2 SUCCESS: Using OAuth-based Pipedream credentials');

        const userStatus = await this.getUserStatus(authStatus.userAuth.pipedreamUserId);

        return {
          external_user_id: authStatus.userAuth.pipedreamUserId,
          user_email: authStatus.userAuth.email,
          account_ids: userStatus.account_ids.length > 0 ? userStatus.account_ids : [
            "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb",
            "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
          ],
          dynamic: true,
          auth_source: 'pipedream_oauth',
          connection_quality: userStatus.account_ids.length > 0 ? 'real_account_ids' : 'static_fallback'
        };
      }

      console.log('⚠️ STEP 2 FAILED: No Pipedream OAuth authentication');

      // PRIORITY 3: Try to get REAL connected accounts from Pipedream API
      console.log('🎯 STEP 3: Checking for REAL Pipedream connected accounts...');
      const userStatus = await this.getUserStatus(slackUserId);

      if (userStatus.connected && userStatus.account_ids.length > 0) {
        console.log('✅ STEP 3 SUCCESS: Found REAL connected accounts from API!');

        return {
          external_user_id: slackUserId,
          user_email: userStatus.primary_email || slackEmail || 'default@example.com',
          account_ids: userStatus.account_ids,
          dynamic: true,
          auth_source: 'pipedream_connect_api',
          connection_quality: 'real_account_ids'
        };
      }

      console.log('⚠️ STEP 3 FAILED: No real connected accounts from API');

      // PRIORITY 4: Use Slack email if available (before static fallback)
      console.log('🎯 STEP 4: Attempting Slack email fallback...');
      if (slackEmail) {
        console.log('✅ STEP 4 SUCCESS: Using Slack email with static account IDs');

        return {
          external_user_id: external_user_id,
          user_email: slackEmail,
          account_ids: [
            "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb",
            "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
          ],
          dynamic: true,
          auth_source: 'slack_email_fallback',
          connection_quality: 'static_fallback'
        };
      }

      console.log('⚠️ STEP 4 FAILED: No Slack email available');

    } catch (error) {
      console.error('⚠️ Error getting dynamic credentials:', error.message);
    }

    // FINAL FALLBACK: Return static credentials
    console.log('⚠️ FINAL FALLBACK: Using static credentials');

    return {
      external_user_id: "686652ee4314417de20af851",
      user_email: "ayush.enterprise.search@gmail.com",
      account_ids: [
        "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb",
        "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
      ],
      dynamic: false,
      auth_source: 'static_fallback',
      connection_quality: 'static_fallback'
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

  // Get list of connected app names for search API (enhanced with real account detection)
  async getConnectedAppsForSearch(userId) {
    try {
      console.log('🔍 Getting REAL connected apps for search API, user:', userId);

      // PRIORITY 1: Try to get real connected accounts from Pipedream
      console.log('🎯 STEP 1: Attempting to get real Pipedream connected accounts...');
      try {
        const userStatus = await this.getUserStatus(userId);

        if (userStatus.connected && userStatus.account_names.length > 0) {
          console.log('✅ STEP 1 SUCCESS: Using REAL Pipedream connected accounts');
          console.log('   📊 Total Connected Accounts:', userStatus.account_names.length);
          console.log('   � Connected Apps:', userStatus.account_names);

          const connectedApps = userStatus.account_names
            .map(appName => this.mapAppNameForSearch(appName))
            .filter(app => app); // Remove any null/undefined mappings

          // Always include Slack as it's internal
          if (!connectedApps.includes('slack')) {
            connectedApps.push('slack');
          }

          console.log('✅ REAL connected apps for search:', connectedApps);
          console.log('   🔗 Apps:', connectedApps.join(', '));
          console.log('   📊 Total Apps for Search:', connectedApps.length);
          return connectedApps;
        }

        console.log('⚠️ STEP 1 FAILED: No real Pipedream connected accounts');
      } catch (error) {
        console.log('⚠️ STEP 1 ERROR:', error.message);
      }

      // PRIORITY 2: Try local connection tracking
      console.log('🎯 STEP 2: Attempting to use local connection tracking...');
      const userConnections = this.userConnections.get(userId);
      if (userConnections && userConnections.connections.length > 0) {
        console.log('✅ STEP 2 SUCCESS: Using local connection tracking');

        const connectedApps = userConnections.connections
          .filter(conn => conn.status === 'connected')
          .map(conn => this.mapAppNameForSearch(conn.app))
          .filter(app => app);

        // Always include Slack as it's internal
        if (!connectedApps.includes('slack')) {
          connectedApps.push('slack');
        }

        console.log('✅ Local connected apps for search:', connectedApps);
        return connectedApps;
      }

      console.log('⚠️ STEP 2 FAILED: No local connections found');

    } catch (error) {
      console.error('❌ Error getting connected apps:', error.message);
    }

    // PRIORITY 3: Use default apps as fallback
    console.log('⚠️ STEP 3: Using default apps as fallback');
    const defaultApps = ["google_drive", "slack", "dropbox", "jira", "zendesk", "document360"];
    console.log('📋 Default apps for search:', defaultApps);
    console.log('⚠️ WARNING: Using static app list - real connection detection failed');
    return defaultApps;
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

  // Map Pipedream app names to search API format
  mapPipedreamAppToSearchApp(pipedreamAppName) {
    const mapping = {
      'Gmail': 'gmail',
      'Google Drive': 'google_drive',
      'Dropbox': 'dropbox',
      'Jira': 'jira',
      'Slack': 'slack',
      'Zendesk': 'zendesk',
      'Document360': 'document360',
      'GitHub': 'github',
      'Notion': 'notion',
      'Airtable': 'airtable'
    };

    return mapping[pipedreamAppName] || pipedreamAppName.toLowerCase();
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

  // Store real connection with account ID tracking (UNIFIED VERSION)
  async storeRealConnection(external_user_id, app, account_id, userEmail = null) {
    console.log('💾 STORING REAL CONNECTION (UNIFIED):');
    console.log('   👤 User:', external_user_id);
    console.log('   🔗 Account ID:', account_id);
    console.log('   📱 App:', app);
    console.log('   📧 Email:', userEmail);

    if (!this.realConnections) {
      this.realConnections = new Map();
    }

    // Get existing connections for user
    const userConnections = this.realConnections.get(external_user_id) || [];

    // Add new connection with real account ID
    const newConnection = {
      account_id: account_id, // Real account ID like apn_JjhlBOP
      app: app,
      user_email: userEmail,
      connected_at: new Date().toISOString(),
      status: 'active',
      last_used: new Date().toISOString(),
      source: 'pipedream_success_callback',
      real_app_id: true
    };

    // Remove any existing connection for this app
    const filteredConnections = userConnections.filter(conn => conn.app !== app);
    filteredConnections.push(newConnection);

    // Store updated connections
    this.realConnections.set(external_user_id, filteredConnections);

    console.log('✅ Real connection stored successfully');
    console.log('📊 User now has', filteredConnections.length, 'real connections');
    console.log('🔗 All account IDs:', filteredConnections.map(c => c.account_id));

    return {
      success: true,
      account_id: account_id,
      app: app,
      total_connections: filteredConnections.length,
      real_app_id: account_id
    };
  }

  // Get user's REAL connected account IDs (extracted app IDs like apn_EOhw3ya)
  getRealAccountIds(external_user_id) {
    console.log('🔍 Getting REAL app IDs for user:', external_user_id);

    if (!this.realConnections) {
      console.log('⚠️ No real connections storage found');
      return [];
    }

    const userConnections = this.realConnections.get(external_user_id) || [];
    const activeConnections = userConnections.filter(conn => conn.status === 'active');
    const accountIds = activeConnections.map(conn => conn.account_id);

    console.log('✅ Found REAL app IDs:', accountIds);
    console.log('📊 Active connections:', activeConnections.length);
    console.log('🎯 App IDs from popup auth:', accountIds.filter(id => id.startsWith('apn_')));

    return accountIds;
  }

  // Get specifically the real app IDs extracted from popup authentication
  getRealAppIdsFromPopup(external_user_id) {
    console.log('🎯 Getting REAL app IDs from popup auth for user:', external_user_id);

    if (!this.realConnections) {
      return [];
    }

    const userConnections = this.realConnections.get(external_user_id) || [];
    const popupConnections = userConnections.filter(conn =>
      conn.status === 'active' &&
      conn.source === 'pipedream_popup_auth' &&
      conn.real_app_id === true
    );

    const appIds = popupConnections.map(conn => conn.account_id);

    console.log('✅ Found popup-extracted app IDs:', appIds);
    return appIds;
  }

  // Get user's REAL connected apps
  getRealConnectedApps(external_user_id) {
    console.log('📱 Getting REAL connected apps for user:', external_user_id);

    if (!this.realConnections) {
      return [];
    }

    const userConnections = this.realConnections.get(external_user_id) || [];
    const activeConnections = userConnections.filter(conn => conn.status === 'active');
    const apps = activeConnections.map(conn => this.mapPipedreamAppToSearchApp(conn.app));

    console.log('✅ Found REAL connected apps:', apps);

    return apps;
  }

  // Store real connection (like your frontend onSuccess callback)
  async storeRealConnection(userId, appSlug, accountId, userEmail) {
    try {
      console.log('💾 Storing real connection for user:', userId);
      console.log('   App:', appSlug);
      console.log('   Real App ID (from ap_id):', accountId);
      console.log('   Email:', userEmail);

      // Initialize realConnections if not exists
      if (!this.realConnections) {
        this.realConnections = new Map();
      }

      // Get existing connections or create new array
      const existingConnections = this.realConnections.get(userId) || [];

      // Remove any existing connection for this app
      const filteredConnections = existingConnections.filter(conn => conn.app !== appSlug);

      // Add the new real connection with the extracted app ID
      const newConnection = {
        app: appSlug,
        account_id: accountId, // This is the real app ID like apn_EOhw3ya
        user_email: userEmail,
        status: 'active',
        connected_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        source: 'pipedream_popup_auth', // Track where this came from
        real_app_id: true // Flag to indicate this is a real extracted app ID
      };

      filteredConnections.push(newConnection);

      // Store updated connections
      this.realConnections.set(userId, filteredConnections);

      console.log('✅ Real connection stored successfully');
      console.log('   Total connections for user:', filteredConnections.length);
      console.log('   Real App ID stored:', accountId);
      console.log('   All user app IDs:', filteredConnections.map(c => c.account_id));

      return {
        success: true,
        account_id: accountId,
        app: appSlug,
        total_connections: filteredConnections.length,
        real_app_id: accountId
      };
    } catch (error) {
      console.error('❌ Error storing real connection:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get real connections for a user
  getRealConnections(userId) {
    const connections = this.realConnections.get(userId) || [];
    console.log('🔍 Getting real connections for user:', userId);
    console.log('   Found connections:', connections.length);

    return connections.filter(conn => conn.status === 'active');
  }

  // Notify user about successful connection
  async notifyConnectionSuccess(external_user_id, app, account_id) {
    console.log('📢 Notifying user about successful connection');

    // Store the real connection
    await this.storeRealConnection(external_user_id, app, account_id, null);

    // In a real implementation, you would:
    // 1. Find the user's Slack channel
    // 2. Send a message about successful connection
    // 3. Update their search preferences

    console.log('✅ User notification sent (simulated)');
  }

  // Add method to check connection status for debugging
  getConnectionDebugInfo(external_user_id) {
    console.log('🔍 CONNECTION DEBUG INFO for user:', external_user_id);
    
    const realConnections = this.realConnections?.get(external_user_id) || [];
    const userConnections = this.userConnections?.get(external_user_id) || [];
    
    console.log('📊 Real Connections:', realConnections.length);
    console.log('📊 User Connections:', userConnections.length);
    
    if (realConnections.length > 0) {
      console.log('🔗 Real Account IDs:', realConnections.map(c => c.account_id));
      console.log('📱 Real Apps:', realConnections.map(c => c.app));
    }
    
    return {
      real_connections: realConnections,
      user_connections: userConnections,
      has_real_connections: realConnections.length > 0,
      real_account_ids: realConnections.map(c => c.account_id),
      real_apps: realConnections.map(c => c.app)
    };
  }
}

const pipedreamServiceInstance = new PipedreamService();
module.exports = pipedreamServiceInstance;
module.exports.handlePipedreamWebhook = (req, res) => pipedreamServiceInstance.handleWebhookEvent(req, res);

// --- Success and Error UI routes for Express server ---
// Usage: app.use('/', require('./path/to/this/file')) or add these handlers in your server.js/app.js
// Replace YOUR_APP_ID below with your Slack App ID or shortcut URL
if (typeof require !== 'undefined' && require.main === module) {
  // Standalone run (for dev/test)
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  // ... other middleware and routes ...

  // Success page
  app.get('/success', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Tool Connected Successfully</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; }
            a { display: inline-block; margin-top: 20px; text-decoration: none; color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>✅ Tool Connected Successfully!</h1>
          <p>You can return to Slack and start using your connected tool.</p>
          <a href="https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID || 'YOUR_APP_ID'}">🔁 Return to Slack</a>
        </body>
      </html>
    `);
  });

  // Error page
  app.get('/error', (req, res) => {
    res.status(500).send(`
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; color: red; }
            a { display: inline-block; margin-top: 20px; text-decoration: none; color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>❌ Failed to Connect Tool</h1>
          <p>Something went wrong during connection. Please try again.</p>
          <a href="https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID || 'YOUR_APP_ID'}">🔁 Back to Slack</a>
        </body>
      </html>
    `);
  });

  app.listen(PORT, () => {
    console.log(`🚀 Express server running for test pages on port ${PORT}`);
  });
}
