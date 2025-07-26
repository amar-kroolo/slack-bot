// Database Service
// Handles all database operations for users and connections

const mongoose = require('mongoose');
const User = require('../models/User');
const Connection = require('../models/Connection');

// Ensure user exists, create if not
async function ensureUser(slackUserId, email) {
  let user = await User.findOne({ slackUserId });
  if (!user) {
    user = new User({
      slackUserId,
      email,
      createdAt: new Date()
    });
    await user.save();
  }
  return user;
}

// Store connection, always ensure user first
// Store connection per (slackUserId + appName + accountId) combination
// Store connection, always ensure user first
async function storeConnection({ slackUserId, appName, accountId, accountEmail }) {
  console.log("calling storeConnectionstoreConnection")

  let connection;

    // No document exists — create a new one
    connection = new Connection({
      slackUserId,
      appNames: [appName],
      accountIds: [accountId],
      accountEmails: accountEmail ? [accountEmail] : [],
      status: 'active',
      connectedAt: new Date()
    });

    await connection.save();
    return connection;
  }


// Get all connections for a user
async function getUserConnections(slackUserId) {
  return Connection.find({ slackUserId, status: 'active' });
}

module.exports = {
  ensureUser,
  storeConnection,
  getUserConnections
};



// Database Service class
class DatabaseService {
  constructor() {
    console.log('🔧 Database Service initialized');
  }

  // ===== USER OPERATIONS =====

  // Create or update user
  async createOrUpdateUser(userData) {
    try {
      console.log('💾 Creating/updating user:', userData.slackUserId);

      const existingUser = await User.findBySlackId(userData.slackUserId);
      
      if (existingUser) {
        // Update existing user
        Object.assign(existingUser, userData);
        existingUser.activity.lastActiveAt = new Date();
        await existingUser.save();
        
        console.log('✅ User updated successfully');
        return existingUser;
      } else {
        // Create new user
        const newUser = new User({
          ...userData,
          externalUserId: userData.externalUserId || userData.slackUserId,
          activity: {
            lastActiveAt: new Date(),
            totalQueries: 0,
            lastQueryAt: null,
            favoriteApps: []
          }
        });
        
        await newUser.save();
        console.log('✅ New user created successfully');
        return newUser;
      }
    } catch (error) {
      console.error('❌ Error creating/updating user:', error.message);
      throw error;
    }
  }

  // Get user by multiple identifiers (ENHANCED)
  async getUserBySlackId(slackUserId) {
    try {
      const user = await User.findBySlackId(slackUserId);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by Slack ID:', error.message);
      throw error;
    }
  }

  // Get user by external ID
  async getUserByExternalId(externalUserId) {
    try {
      const user = await User.findByExternalId(externalUserId);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by external ID:', error.message);
      throw error;
    }
  }

  // Get user by MongoDB Object ID
  async getUserByMongoId(mongoId) {
    try {
      const user = await User.findById(mongoId);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by MongoDB ID:', error.message);
      throw error;
    }
  }

  // Get user by Email
  async getUserByEmail(email) {
    try {
      const user = await User.findByEmail(email);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by Email:', error.message);
      throw error;
    }
  }

  // Universal user lookup (tries multiple identifiers)
  async getUserByAnyIdentifier(identifier) {
    try {
      console.log('🔍 Universal user lookup for identifier:', identifier);

      // Try different lookup methods
      let user = null;

      // 1. Try as Slack User ID
      if (identifier.startsWith('U') || identifier.includes('@')) {
        user = await User.findBySlackId(identifier);
        if (user) {
          console.log('✅ Found user by Slack ID');
          return { user, found_by: 'slack_id' };
        }
      }

      // 2. Try as Email
      if (identifier.includes('@')) {
        user = await User.findByEmail(identifier);
        if (user) {
          console.log('✅ Found user by Email');
          return { user, found_by: 'email' };
        }
      }

      // 3. Try as MongoDB Object ID
      if (identifier.length === 24) {
        try {
          user = await User.findById(identifier);
          if (user) {
            console.log('✅ Found user by MongoDB ID');
            return { user, found_by: 'mongo_id' };
          }
        } catch (mongoError) {
          // Invalid MongoDB ID format, continue
        }
      }

      // 4. Try as External User ID
      user = await User.findByExternalId(identifier);
      if (user) {
        console.log('✅ Found user by External ID');
        return { user, found_by: 'external_id' };
      }

      console.log('❌ User not found with any identifier method');
      return { user: null, found_by: null };

    } catch (error) {
      console.error('❌ Error in universal user lookup:', error.message);
      throw error;
    }
  }

  // Update user authentication status
  async updateUserAuth(slackUserId, authType, authData) {
    try {
      console.log(`🔐 Updating ${authType} auth for user:`, slackUserId);

      const user = await User.findBySlackId(slackUserId);
      if (!user) {
        throw new Error('User not found');
      }

      user.authStatus[authType] = {
        ...user.authStatus[authType],
        ...authData,
        connected: true,
        connectedAt: new Date()
      };

      // Update primary email if provided
      if (authType === 'slack' && authData.email) {
        user.slackEmail = authData.email;
      } else if (authType === 'pipedream' && authData.email) {
        user.pipedreamEmail = authData.email;
      }

      await user.save();
      console.log('✅ User auth updated successfully');
      return user;
    } catch (error) {
      console.error('❌ Error updating user auth:', error.message);
      throw error;
    }
  }

  // ===== CONNECTION OPERATIONS =====

  // Store user connection with complete webhook data
  async storeConnection(connectionData) {
    try {
      console.log('💾 Storing connection:', {
        user: connectionData.slackUserId,
        app: connectionData.appName,
        accountId: connectionData.accountId
      });

      // Check if connection already exists
      const existingConnection = await Connection.findByUserAndApp(
        connectionData.slackUserId,
        connectionData.appName
      );

      if (existingConnection) {
        // Update existing connection (APPEND mode - preserve existing, update with new data)
        console.log('🔄 Updating existing connection for app:', connectionData.appName);

        // Preserve important existing data while updating with new webhook data
        existingConnection.status = 'active';
        existingConnection.isHealthy = true;
        existingConnection.lastSyncAt = new Date();
        existingConnection.accountId = connectionData.accountId; // Update with latest account ID
        existingConnection.accountEmail = connectionData.accountEmail || existingConnection.accountEmail;

        // Update essential webhook data only
        if (connectionData.webhookData) {
          existingConnection.webhookData = {
            event: connectionData.webhookData.event,
            connect_token: connectionData.webhookData.connect_token,
            environment: connectionData.webhookData.environment,
            processed_at: new Date()
          };
        }

        // Update metadata
        if (connectionData.metadata) {
          existingConnection.metadata = {
            ...existingConnection.metadata,
            ...connectionData.metadata,
            last_updated: new Date()
          };
        }

        await existingConnection.save();

        console.log('✅ Connection updated successfully (APPEND mode)');
        console.log('   📱 App:', existingConnection.appDisplayName);
        console.log('   🔗 Account ID:', existingConnection.accountId);
        return existingConnection;
      } else {
        // Create new connection (ADD mode - append to existing tools)
        console.log('➕ Adding NEW connection for app:', connectionData.appName);

        const newConnection = new Connection(connectionData);
        await newConnection.save();

        // Update user connection stats (ADD to existing count)
        const user = await User.findBySlackId(connectionData.slackUserId);
        if (user) {
          await user.addConnection(connectionData.appName);
        }

        console.log('✅ New connection created successfully (ADD mode)');
        console.log('   📱 App:', newConnection.appDisplayName);
        console.log('   🔗 Account ID:', newConnection.accountId);

        // Log total connections for user
        const totalConnections = await Connection.findByUser(connectionData.slackUserId);
        console.log('   📊 User now has', totalConnections.length, 'total connections');

        return newConnection;
      }
    } catch (error) {
      console.error('❌ Error storing connection:', error.message);
      throw error;
    }
  }

  // Store essential connection data only (simplified version)
  async storeEssentialConnection(essentialData) {
    try {
      console.log('💾 Storing essential connection data only');
      console.log('📥 Essential data:', essentialData);

      const { userId, accountId, appName, appDisplayName, accountEmail, categories } = essentialData;

      if (!userId || !accountId || !appName) {
        throw new Error('Missing required essential data: userId, accountId, or appName');
      }

      // Check database connectivity
      const databaseConfig = require('../config/database');
      if (!databaseConfig.isConnectionHealthy()) {
        throw new Error('Database not connected - cannot store data');
      }

      // Ensure user exists
      const user = await this.createOrUpdateUser({
        slackUserId: userId,
        externalUserId: userId,
        primaryEmail: accountEmail
      });

      // Prepare essential connection data
      const connectionData = {
        userId: user._id,
        slackUserId: userId,
        externalUserId: userId,
        appName: appName,
        appDisplayName: appDisplayName || appName,
        accountId: accountId,
        accountEmail: accountEmail,
        categories: categories || [],
        connectionSource: 'webhook',
        status: 'active',
        isHealthy: true,
        connectedAt: new Date(),

        // Essential webhook data only
        webhookData: {
          event: 'CONNECTION_SUCCESS',
          environment: process.env.PIPEDREAM_ENV || 'development',
          processed_at: new Date()
        }
      };

      // Store the connection
      const connection = await this.storeConnection(connectionData);

      console.log('✅ ESSENTIAL CONNECTION STORED SUCCESSFULLY');
      console.log('   📊 Connection ID:', connection._id);
      console.log('   🔗 Account ID:', connection.accountId);
      console.log('   📱 App:', connection.appDisplayName);
      console.log('   🏷️ Categories:', connection.categories);

      return {
        success: true,
        connection: connection,
        user: user,
        essential_data_only: true,
        account_id: accountId,
        app_name: appName,
        app_display_name: appDisplayName,
        categories: categories
      };

    } catch (error) {
      console.error('❌ Error storing essential connection:', error.message);
      throw error;
    }
  }

  // Store connection from webhook with complete data
  async storeWebhookConnection(webhookPayload, slackUserId = null) {
    try {
      console.log('🎯 STORING WEBHOOK CONNECTION WITH COMPLETE DATA');
      console.log('📥 Webhook payload keys:', Object.keys(webhookPayload));

      const { account, app, event, connect_token, environment, connect_session_id } = webhookPayload;

      // Extract user identification
      const userId = slackUserId || account?.external_id || account?.name;
      const accountId = account?.id;
      const appName = app?.name_slug || app?.name;

      if (!userId || !accountId || !appName) {
        throw new Error('Missing required webhook data: userId, accountId, or appName');
      }

      console.log('🧩 Extracted webhook data:');
      console.log('   👤 User ID:', userId);
      console.log('   🔗 Account ID:', accountId);
      console.log('   📱 App Name:', appName);
      console.log('   🎯 Event:', event);

      // Ensure user exists
      const userData = {
        slackUserId: userId,
        externalUserId: userId,
        primaryEmail: account?.name || account?.external_id
      };
      const user = await this.createOrUpdateUser(userData);

      // Prepare complete connection data
      const connectionData = {
        userId: user._id,
        slackUserId: userId,
        externalUserId: userId,
        appName: appName,
        appDisplayName: app?.name || appName,
        accountId: accountId,
        accountName: account?.name,
        accountEmail: account?.external_id,
        connectionSource: 'webhook',
        status: 'active',
        isHealthy: account?.healthy !== false,
        connectedAt: new Date(),

        // Store complete webhook data
        webhookData: {
          event: event,
          connect_token: connect_token,
          environment: environment,
          connect_session_id: connect_session_id,

          // Complete account data
          account: {
            id: account?.id,
            name: account?.name,
            external_id: account?.external_id,
            healthy: account?.healthy,
            dead: account?.dead,
            created_at: account?.created_at ? new Date(account.created_at) : null,
            updated_at: account?.updated_at ? new Date(account.updated_at) : null
          },

          // Complete app data
          app: {
            id: app?.id,
            name_slug: app?.name_slug,
            name: app?.name,
            auth_type: app?.auth_type,
            description: app?.description,
            img_src: app?.img_src,
            custom_fields_json: app?.custom_fields_json,
            categories: app?.categories || [],
            featured_weight: app?.featured_weight,
            connect: app?.connect || {}
          },

          // Store raw payload for debugging
          raw_payload: webhookPayload
        },

        metadata: {
          webhook_received_at: new Date(),
          webhook_source: 'pipedream_connect',
          app_categories: app?.categories || [],
          app_description: app?.description
        }
      };

      // Store the connection
      const connection = await this.storeConnection(connectionData);

      console.log('✅ WEBHOOK CONNECTION STORED SUCCESSFULLY');
      console.log('   📊 Connection ID:', connection._id);
      console.log('   🔗 Account ID:', connection.accountId);
      console.log('   📱 App:', connection.appDisplayName);
      console.log('   🎯 Categories:', connection.webhookData?.app?.categories);

      return {
        success: true,
        connection: connection,
        user: user,
        webhook_data_stored: true,
        account_id: accountId,
        app_name: appName,
        app_display_name: app?.name,
        categories: app?.categories
      };

    } catch (error) {
      console.error('❌ Error storing webhook connection:', error.message);
      throw error;
    }
  }

  // Get user connections
  async getUserConnections(slackUserId) {
    try {
      console.log('🔍 Getting connections for user:', slackUserId);

      const connections = await Connection.findByUser(slackUserId);
      
      console.log(`✅ Found ${connections.length} connections`);
      return connections;
    } catch (error) {
      console.error('❌ Error getting user connections:', error.message);
      throw error;
    }
  }

  // Get user connection by app
  async getUserConnectionByApp(slackUserId, appName) {
    try {
      const connection = await Connection.findByUserAndApp(slackUserId, appName);
      return connection;
    } catch (error) {
      console.error('❌ Error getting user connection by app:', error.message);
      throw error;
    }
  }

  // Get dynamic credentials for API calls with ALL connected tools
  async getDynamicCredentials(slackUserId, fallbackEmail = null) {
    try {
      console.log('🔍 Getting dynamic credentials for user:', slackUserId);

      const user = await User.findBySlackId(slackUserId);
      const connections = await Connection.findByUser(slackUserId);

      // Extract ALL account IDs from ALL connections
      const accountIds = connections.map(conn => conn.accountId);

      // Extract ALL connected apps
      const connectedApps = connections.map(conn => conn.appName);

      // Extract app categories for better API targeting
      const appCategories = connections.reduce((categories, conn) => {
        if (conn.webhookData?.app?.categories) {
          categories.push(...conn.webhookData.app.categories);
        }
        return categories;
      }, []);

      // Use user's primary email or fallback
      const userEmail = user?.primaryEmail || fallbackEmail || 'default@example.com';

      // Use user's external ID
      const externalUserId = user?.externalUserId || slackUserId;

      const credentials = {
        account_ids: accountIds.length > 0 ? accountIds : ['default_account'],
        external_user_id: externalUserId,
        user_email: userEmail,
        connected_apps: connectedApps,
        app_categories: [...new Set(appCategories)], // Remove duplicates
        total_connections: connections.length,
        active_connections: connections.filter(c => c.status === 'active').length,
        connection_details: connections.map(conn => ({
          app: conn.appName,
          account_id: conn.accountId,
          display_name: conn.appDisplayName,
          categories: conn.webhookData?.app?.categories || [],
          connected_at: conn.connectedAt,
          status: conn.status
        })),
        source: accountIds.length > 0 ? 'dynamic_connections' : 'fallback_default'
      };

      console.log('✅ Dynamic credentials generated:', {
        accountIds: credentials.account_ids.length,
        connectedApps: credentials.connected_apps.length,
        categories: credentials.app_categories.length,
        source: credentials.source
      });

      return credentials;
    } catch (error) {
      console.error('❌ Error getting dynamic credentials:', error.message);
      throw error;
    }
  }

  // Get all connected tools for a user (detailed view)
  async getAllConnectedTools(slackUserId) {
    try {
      console.log('🔍 Getting all connected tools for user:', slackUserId);

      const connections = await Connection.findByUser(slackUserId);

      const toolsSummary = {
        user_id: slackUserId,
        total_tools: connections.length,
        active_tools: connections.filter(c => c.status === 'active').length,
        tools: connections.map(conn => ({
          app_name: conn.appName,
          app_display_name: conn.appDisplayName,
          account_id: conn.accountId,
          account_email: conn.accountEmail,
          status: conn.status,
          is_healthy: conn.isHealthy,
          connected_at: conn.connectedAt,
          last_used: conn.usage?.lastUsedAt,
          total_api_calls: conn.usage?.totalApiCalls || 0,
          categories: conn.webhookData?.app?.categories || [],
          description: conn.webhookData?.app?.description,
          auth_type: conn.webhookData?.app?.auth_type,
          connection_source: conn.connectionSource
        })),
        categories_summary: this.getCategoriesSummary(connections),
        last_connection_at: connections.length > 0 ?
          Math.max(...connections.map(c => new Date(c.connectedAt).getTime())) : null
      };

      console.log('✅ Connected tools retrieved:', {
        totalTools: toolsSummary.total_tools,
        activeTools: toolsSummary.active_tools,
        categories: Object.keys(toolsSummary.categories_summary).length
      });

      return toolsSummary;
    } catch (error) {
      console.error('❌ Error getting connected tools:', error.message);
      throw error;
    }
  }

  // Helper method to get categories summary
  getCategoriesSummary(connections) {
    const categorySummary = {};

    connections.forEach(conn => {
      const categories = conn.webhookData?.app?.categories || ['Other'];
      categories.forEach(category => {
        if (!categorySummary[category]) {
          categorySummary[category] = {
            count: 0,
            apps: []
          };
        }
        categorySummary[category].count++;
        categorySummary[category].apps.push({
          name: conn.appDisplayName,
          account_id: conn.accountId
        });
      });
    });

    return categorySummary;
  }

  // Get connection count for a user
  async getConnectionCount(slackUserId) {
    try {
      const connections = await Connection.findByUser(slackUserId);

      return {
        user_id: slackUserId,
        total_connections: connections.length,
        active_connections: connections.filter(c => c.status === 'active').length,
        inactive_connections: connections.filter(c => c.status !== 'active').length,
        apps_connected: connections.map(c => c.appName),
        account_ids: connections.map(c => c.accountId)
      };
    } catch (error) {
      console.error('❌ Error getting connection count:', error.message);
      throw error;
    }
  }

  // Update connection usage
  async updateConnectionUsage(slackUserId, appName, success = true, responseTime = 0) {
    try {
      const connection = await Connection.findByUserAndApp(slackUserId, appName);
      if (connection) {
        await connection.updateUsage(success, responseTime);
        
        // Update user activity
        const user = await User.findBySlackId(slackUserId);
        if (user) {
          await user.updateActivity();
        }
      }
    } catch (error) {
      console.error('❌ Error updating connection usage:', error.message);
    }
  }

  // Disconnect user connection
  async disconnectUserConnection(slackUserId, appName) {
    try {
      console.log('🔌 Disconnecting user connection:', { slackUserId, appName });

      const connection = await Connection.findByUserAndApp(slackUserId, appName);
      if (connection) {
        await connection.disconnect();

        // Update user connection stats
        const user = await User.findBySlackId(slackUserId);
        if (user) {
          await user.removeConnection(appName);
        }

        console.log('✅ Connection disconnected successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error disconnecting user connection:', error.message);
      throw error;
    }
  }

  // ===== STATUS AND STATISTICS =====

  // Get user status
  async getUserStatus(slackUserId) {
    try {
      const user = await User.findBySlackId(slackUserId);
      const connections = await Connection.findByUser(slackUserId);

      if (!user) {
        return {
          found: false,
          message: 'User not found'
        };
      }

      const status = {
        found: true,
        user: user.getConnectionSummary(),
        connections: connections.map(conn => conn.getConnectionSummary()),
        summary: {
          totalConnections: connections.length,
          activeConnections: connections.filter(c => c.status === 'active').length,
          connectedApps: connections.map(c => c.appName),
          slackConnected: user.authStatus.slack.connected,
          pipedreamConnected: user.authStatus.pipedream.connected,
          lastActive: user.activity.lastActiveAt
        }
      };

      return status;
    } catch (error) {
      console.error('❌ Error getting user status:', error.message);
      throw error;
    }
  }

  // Get global statistics
  async getGlobalStats() {
    try {
      const userStats = await User.getConnectionStats();
      const connectionStats = await Connection.getGlobalStats();

      return {
        users: userStats[0] || {},
        connections: connectionStats[0] || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting global stats:', error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      // Test database connectivity
      const userCount = await User.countDocuments();
      const connectionCount = await Connection.countDocuments();

      return {
        status: 'healthy',
        database: 'connected',
        collections: {
          users: userCount,
          connections: connectionCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
