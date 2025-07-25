# Render Deployment Guide

## 🚀 Deploying Your Slack Bot to Render

This guide will help you deploy your Slack bot to Render using HTTP mode instead of Socket Mode.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Slack App Configuration**: Your Slack app should be configured for HTTP mode

## 🔧 Step 1: Configure Your Slack App for HTTP Mode

### 1.1 Update Event Subscriptions
1. Go to your Slack app settings at [api.slack.com](https://api.slack.com/apps)
2. Navigate to **Event Subscriptions**
3. Enable Events and set the Request URL to: `https://your-app-name.onrender.com/slack/events`
4. Subscribe to these bot events:
   - `app_mention`
   - `message.im` (for direct messages)

### 1.2 Update OAuth & Permissions
1. Navigate to **OAuth & Permissions**
2. Add your Render URL to Redirect URLs: `https://your-app-name.onrender.com/auth/slack/callback`
3. Ensure these bot token scopes are enabled:
   - `app_mentions:read`
   - `chat:write`
   - `im:read`
   - `im:write`
   - `users:read`

### 1.3 Disable Socket Mode (Important!)
1. Navigate to **Socket Mode**
2. **Disable** Socket Mode (this is crucial for Render deployment)

## 🌐 Step 2: Deploy to Render

### 2.1 Create a New Web Service
1. Log in to your Render dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `slack-api-query-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.2 Set Environment Variables
In your Render service settings, add these environment variables:

#### Required Variables
```bash
NODE_ENV=production
USE_SOCKET_MODE=false
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

#### API Configuration
```bash
API_BASE_URL=https://qa-es-api.kroolo.com
API_KEY=your-api-key-here
```

#### AI Configuration
```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key-here
AI_MODEL_GEMINI=gemini-2.5-flash
```

#### Pipedream Configuration
```bash
PIPEDREAM_CLIENT_ID=your-client-id-here
PIPEDREAM_PROJECT_ID=your-project-id-here
PIPEDREAM_CLIENT_SECRET=your-client-secret-here
PIPEDREAM_ENV=production
PIPEDREAM_API_BASE=https://api.pipedream.com/v1
```

#### Slack OAuth (for Pipedream integration)
```bash
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
SLACK_BOT_URL=https://your-app-name.onrender.com
```

### 2.3 Deploy
1. Click **"Create Web Service"**
2. Render will automatically build and deploy your app
3. Wait for the deployment to complete (usually 2-5 minutes)

## 🔗 Step 3: Update Slack App URLs

Once your app is deployed, update these URLs in your Slack app settings:

### Event Subscriptions
- **Request URL**: `https://your-app-name.onrender.com/slack/events`

### OAuth & Permissions
- **Redirect URL**: `https://your-app-name.onrender.com/auth/slack/callback`

### Pipedream Integration
- **Callback URL**: `https://your-app-name.onrender.com/auth/pipedream/callback`

## ✅ Step 4: Test Your Deployment

### 4.1 Check Deployment Status
1. In Render dashboard, ensure your service shows "Live"
2. Check the logs for successful startup messages:
   ```
   ⚡️ Slack API Query Bot is running!
   🚀 Server started on port 10000
   🌐 HTTP Mode - Ready to receive webhook requests
   ```

### 4.2 Test Slack Integration
1. Go to your Slack workspace
2. Mention your bot: `@YourBot search for documents`
3. Check if the bot responds

### 4.3 Test Dynamic Authentication
1. Try connecting tools via Pipedream
2. Perform search queries
3. Check Render logs for authentication flow

## 🔍 Troubleshooting

### Common Issues

#### "No open ports detected"
- ✅ **Fixed**: Your app now binds to the PORT environment variable
- Render automatically sets this to an available port

#### "Event subscription verification failed"
- Check that your SLACK_SIGNING_SECRET is correct
- Ensure your Render app is deployed and accessible
- Verify the webhook URL in Slack app settings

#### "Bot not responding"
- Check Render logs for errors
- Verify all environment variables are set
- Ensure Slack app has proper permissions

#### "Authentication not working"
- Verify Pipedream credentials are set correctly
- Check that callback URLs are updated
- Review logs for authentication errors

### Viewing Logs
1. In Render dashboard, go to your service
2. Click on **"Logs"** tab
3. Monitor real-time logs for errors or issues

## 🔄 Local vs Production Differences

### Local Development (Socket Mode)
```bash
NODE_ENV=development
USE_SOCKET_MODE=true
# Requires SLACK_APP_TOKEN
```

### Production (HTTP Mode)
```bash
NODE_ENV=production
USE_SOCKET_MODE=false
# Does not need SLACK_APP_TOKEN
# Requires webhook URLs in Slack app
```

## 📊 Monitoring

### Health Check
Your app automatically responds to health checks at:
- `https://your-app-name.onrender.com/` (returns basic info)

### Logs
Monitor these log messages for successful operation:
- `⚡️ Slack API Query Bot is running!`
- `🌐 HTTP Mode - Ready to receive webhook requests`
- `✅ Dynamic credentials successfully obtained`

## 🔐 Security Notes

1. **Never commit sensitive tokens** to your repository
2. **Use Render environment variables** for all secrets
3. **Regularly rotate your tokens** for security
4. **Monitor logs** for any suspicious activity

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render logs for specific error messages
3. Verify all environment variables are set correctly
4. Ensure Slack app configuration matches the deployment mode

Your Slack bot should now be successfully deployed on Render and ready to handle requests via HTTP webhooks!
