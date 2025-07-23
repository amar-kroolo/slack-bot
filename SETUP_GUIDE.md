# 🚀 Slack API Query Bot - Complete Setup Guide

This guide will help you set up your Slack bot from scratch in minimal time.

## 📋 Prerequisites
- Node.js (v16 or higher)
- A Slack workspace where you can install apps
- Your API endpoints and authentication details

## 🔧 Step 1: Create Your Slack App

### 1.1 Go to Slack API Portal
1. Visit: https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. App Name: `API Query Bot`
5. Select your workspace
6. Click **"Create App"**

### 1.2 Configure Basic Information
1. Go to **"Basic Information"** in the sidebar
2. Note down your **Signing Secret** (you'll need this later)

### 1.3 Enable Socket Mode
1. Go to **"Socket Mode"** in the sidebar
2. Toggle **"Enable Socket Mode"** to ON
3. Click **"Generate"** to create an App-Level Token
4. Token Name: `socket-token`
5. Add scope: `connections:write`
6. Click **"Generate"**
7. **Copy and save this token** (starts with `xapp-`)

### 1.4 Set OAuth Permissions
1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add these scopes:
   - `chat:write`
   - `app_mentions:read`
   - `channels:history`
   - `im:history`

### 1.5 Install App to Workspace
1. Scroll up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Click **"Allow"**
4. **Copy the Bot User OAuth Token** (starts with `xoxb-`)

### 1.6 Enable Events
1. Go to **"Event Subscriptions"** in the sidebar
2. Toggle **"Enable Events"** to ON
3. Under **"Subscribe to bot events"**, add:
   - `app_mention`
   - `message.im`

## 🔧 Step 2: Configure Your Environment

### 2.1 Create Environment File
```bash
cp .env.example .env
```

### 2.2 Fill in Your Tokens
Edit `.env` file with your actual values:

```env
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# Server Configuration
PORT=3000

# API Configuration (Replace with your actual API details)
API_BASE_URL=https://your-api-base-url.com
API_KEY=your-api-key-here
```

**Important:** If you don't have your APIs ready yet, leave the API_BASE_URL as is - the bot will use mock data for testing.

## 🔧 Step 3: Configure Your APIs

### 3.1 Update API Configuration
Edit `src/config/apis.js` to match your actual API endpoints:

```javascript
const API_ENDPOINTS = {
  users: {
    endpoint: '/api/v1/users',  // Your actual endpoint
    method: 'GET',
    description: 'Get user information',
    parameters: ['userId', 'email'],
    keywords: ['user', 'users', 'profile', 'account']
  },
  // Add your other APIs here...
};
```

### 3.2 Update Query Patterns
Add patterns that match how users will ask questions:

```javascript
const QUERY_PATTERNS = [
  {
    pattern: /get\s+user\s+(?:data|info)?\s*(?:for\s+)?(?:id\s+)?(\w+)/i,
    api: 'users',
    paramExtractor: (match) => ({ userId: match[1] })
  },
  // Add your patterns here...
];
```

## 🚀 Step 4: Run Your Bot

### 4.1 Start the Bot
```bash
npm run dev
```

You should see:
```
⚡️ Slack API Query Bot is running!
🚀 Server started on port 3000
```

### 4.2 Test in Slack
1. Go to your Slack workspace
2. Find your bot in the Apps section
3. Send a direct message: `get user data for user ID 123`
4. Or mention it in a channel: `@API Query Bot show me the latest orders`

## 🧪 Step 5: Testing Examples

Try these queries to test your bot:

### User Queries
- `get user data for user ID 123`
- `show me user info for john@example.com`
- `find user 456`

### Order Queries
- `show me the latest orders`
- `what's the status of order ORD-456`
- `get order details for 789`

### Product Queries
- `get product info for PROD-123`
- `show me products in electronics category`

### Analytics Queries
- `show me sales analytics`
- `get user metrics`
- `analytics for revenue`

## 🔧 Step 6: Connect Real APIs

### 6.1 Update Environment
Replace the mock API_BASE_URL with your real API:
```env
API_BASE_URL=https://api.yourcompany.com
API_KEY=your-real-api-key
```

### 6.2 Test API Connection
The bot includes a test method. You can add this to test connectivity:

```javascript
// In your terminal or add to a test file
const apiService = require('./src/services/apiService');
apiService.testConnection().then(console.log);
```

## 🚨 Troubleshooting

### Bot Not Responding
1. Check that Socket Mode is enabled
2. Verify your tokens are correct
3. Make sure the bot is installed in your workspace
4. Check the console for error messages

### API Errors
1. Verify your API_BASE_URL is correct
2. Check your API_KEY is valid
3. Ensure your API endpoints match the configuration
4. Test your APIs directly with curl first

### Permission Errors
1. Make sure you added all required OAuth scopes
2. Reinstall the app to workspace if you added new scopes
3. Check that the bot is invited to channels where you're testing

## 📝 Next Steps

1. **Customize the responses** in `src/utils/formatter.js`
2. **Add more API endpoints** in `src/config/apis.js`
3. **Improve natural language processing** in `src/services/nlpService.js`
4. **Add authentication** for sensitive APIs
5. **Deploy to production** (Heroku, AWS, etc.)

## 🆘 Need Help?

If you get stuck:
1. Check the console logs for detailed error messages
2. Verify all tokens and configurations
3. Test with mock data first before connecting real APIs
4. Make sure your Slack app has the right permissions

Your bot should now be working! 🎉
