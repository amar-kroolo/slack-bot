# 🗄️ Database Integration Guide

## 📋 Overview

This guide explains the complete MongoDB database integration for the Slack Enterprise Search Bot. The implementation provides persistent storage for user authentication, connection tracking, and dynamic API credential management.

## 🏗️ Architecture

### **Database Structure**

```
MongoDB Database: slack-enterprise-search
├── users (Collection)
│   ├── User authentication data
│   ├── Slack & Pipedream profiles
│   ├── Connection statistics
│   └── Activity tracking
└── connections (Collection)
    ├── App connections per user
    ├── Real account IDs from Pipedream
    ├── Connection health status
    └── Usage statistics
```

### **Data Flow**

```
1. User interacts with Slack bot
2. Bot extracts Slack user ID & email
3. Database stores/updates user profile
4. User connects tools via Pipedream
5. Webhook receives real account IDs
6. Database stores connection with account ID
7. API calls use dynamic credentials from database
```

## 🚀 Implementation Details

### **Key Components Created**

1. **`src/config/database.js`** - MongoDB connection management
2. **`src/models/User.js`** - User schema and methods
3. **`src/models/Connection.js`** - Connection schema and methods
4. **`src/services/databaseService.js`** - Database operations
5. **Updated `src/services/pipedreamService.js`** - Database integration
6. **Updated `app.js`** - Database initialization

### **User Model Features**

- **Slack Integration**: User ID, email, team info
- **Pipedream Integration**: OAuth tokens, user profile
- **Connection Tracking**: Total connections, active apps
- **Activity Monitoring**: Last active, query count
- **Email Priority**: Slack email > Pipedream email > fallback

### **Connection Model Features**

- **Real Account IDs**: Stores actual Pipedream account IDs
- **App Management**: Tracks connected applications
- **Health Monitoring**: Connection status and health checks
- **Usage Analytics**: API call tracking and performance
- **Source Tracking**: How connection was established

## 🔧 Setup Instructions

### **1. Install MongoDB**

**Option A: Local Installation**
```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

**Option B: MongoDB Atlas (Cloud)**
```bash
# Create account at https://cloud.mongodb.com
# Create cluster and get connection string
# Update MONGODB_URI in .env file
```

### **2. Configure Environment**

Update your `.env` file:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/slack-enterprise-search
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/slack-enterprise-search
```

### **3. Install Dependencies**

```bash
npm install mongoose
```

### **4. Test Database Integration**

```bash
# Run the test script
node test-database-integration.js
```

## 📊 Database Operations

### **User Management**

```javascript
// Create or update user
const user = await databaseService.createOrUpdateUser({
  slackUserId: 'U12345',
  slackEmail: 'user@example.com',
  externalUserId: 'user@example.com'
});

// Get user by Slack ID
const user = await databaseService.getUserBySlackId('U12345');

// Update authentication status
await databaseService.updateUserAuth('U12345', 'slack', {
  connected: true,
  accessToken: 'token',
  email: 'user@example.com'
});
```

### **Connection Management**

```javascript
// Store connection
const connection = await databaseService.storeConnection({
  slackUserId: 'U12345',
  appName: 'google_drive',
  accountId: 'apn_RealAccountID',
  accountEmail: 'user@gmail.com'
});

// Get user connections
const connections = await databaseService.getUserConnections('U12345');

// Get dynamic credentials for API calls
const credentials = await databaseService.getDynamicCredentials('U12345');
```

### **Status and Analytics**

```javascript
// Get user status
const status = await databaseService.getUserStatus('U12345');

// Get global statistics
const stats = await databaseService.getGlobalStats();

// Health check
const health = await databaseService.healthCheck();
```

## 🔄 Webhook Integration

The webhook handler in `src/routes/auth.js` automatically stores connections:

```javascript
// When Pipedream webhook is received
const storeResult = await pipedreamService.storeRealConnection(
  userId,      // Slack user ID
  appName,     // Connected app (e.g., 'google_drive')
  accountId,   // Real account ID (e.g., 'apn_KAhZVzn')
  userEmail    // User's email
);
```

## 🎯 Dynamic API Calls

The system now uses real account IDs for API calls:

```javascript
// Before (static)
const payload = {
  account_ids: ["apn_XehedEz", "apn_Xehed1w"],
  external_user_id: "686652ee4314417de20af851",
  user_email: "ayush.enterprise.search@gmail.com"
};

// After (dynamic from database)
const credentials = await databaseService.getDynamicCredentials(slackUserId);
const payload = {
  account_ids: credentials.account_ids,     // Real connected account IDs
  external_user_id: credentials.external_user_id,
  user_email: credentials.user_email
};
```

## 🔍 Monitoring and Debugging

### **Database Health Check**

```bash
# Check database status
curl http://localhost:3000/health
```

### **User Status Check**

```javascript
// In Slack, type: @Kroolo AI status
// Returns user's connection status and statistics
```

### **Connection Logs**

The system provides detailed logging:
- User creation/updates
- Connection storage
- Dynamic credential generation
- API call tracking
- Error handling with fallbacks

## 🛡️ Error Handling

The implementation includes robust error handling:

1. **Database Connection Failures**: Falls back to in-memory storage
2. **Missing User Data**: Creates new user profiles automatically
3. **Connection Conflicts**: Updates existing connections
4. **API Failures**: Uses static fallback credentials

## 📈 Performance Optimizations

1. **Database Indexes**: Optimized queries for user and connection lookups
2. **Connection Pooling**: Efficient database connection management
3. **Caching Strategy**: In-memory fallback for critical operations
4. **Batch Operations**: Efficient bulk data processing

## 🔮 Future Enhancements

1. **Redis Caching**: Add Redis for faster credential lookups
2. **Connection Sync**: Periodic sync with Pipedream API
3. **Analytics Dashboard**: Web interface for connection monitoring
4. **Backup Strategy**: Automated database backups
5. **Multi-tenant Support**: Support for multiple Slack workspaces

## 🚨 Troubleshooting

### **Common Issues**

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in .env
   - Verify network connectivity

2. **Duplicate Index Warnings**
   - Normal during development
   - Indexes are optimized for production

3. **Missing Dependencies**
   ```bash
   npm install mongoose
   ```

4. **Permission Errors**
   - Check MongoDB user permissions
   - Verify database access rights

### **Debug Mode**

Enable detailed logging:
```bash
DEBUG=* npm start
```

This comprehensive database integration provides a solid foundation for managing user connections and dynamic API credentials in your Slack Enterprise Search Bot.
