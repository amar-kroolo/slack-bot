# 💬 Slack OAuth Setup Guide

## Why Slack OAuth is Needed

Slack OAuth allows your bot to:
- 🔐 Authenticate users with their Slack apps individually 
- 🛠️ Access their connected Slack workspace features (channels, files, messages, etc.)
- 📊 Provide personalized Slack-based search results
- 🔄 Dynamically use user-specific Slack credentials

## Step-by-Step Slack OAuth Setup

### Step 1: Create Slack OAuth Application

1. **Go to Slack API Portal**:
   ```
   https://api.slack.com/apps
   ```

2. **Click "Create New App"**
   - Choose "From scratch"
   - App Name: `Enterprise Search Bot - Slack Integration`
   - Select your workspace

3. **Configure OAuth & Permissions**:
   - Go to "OAuth & Permissions" in the sidebar
   - Add the following **Redirect URLs**:
   ```
   http://localhost:3000/auth/slack/callback
   ```

4. **Add Bot Token Scopes**:
   ```
   ✅ channels:read (to read channel information)
   ✅ users:read (to get user profile)
   ✅ files:read (to access files)
   ✅ search:read (to search messages)
   ✅ channels:history (to read channel messages)
   ✅ groups:read (to access private channels)
   ✅ groups:history (to read private channel messages)
   ✅ im:history (to read direct messages)
   ✅ chat:write (to send messages)
   ```

5. **Get Your Credentials**:
   - Go to "Basic Information"
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - Go to "OAuth & Permissions"
   - Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 2: Update Your .env File

Add these new variables to your `.env` file:

```bash
# Slack OAuth Configuration (for app connections)
SLACK_CLIENT_ID=your-slack-client-id-from-step-1
SLACK_CLIENT_SECRET=your-slack-client-secret-from-step-1

# Your existing Slack bot token (should already be set)
SLACK_BOT_TOKEN=xoxb-your-existing-bot-token
SLACK_SIGNING_SECRET=your-existing-signing-secret
SLACK_APP_TOKEN=xoxapp-your-existing-app-token

# Server URL for OAuth callbacks
SLACK_BOT_URL=http://localhost:3000
```

### Step 3: Test the Slack OAuth Flow

1. **Start your servers**:
   ```bash
   # Terminal 1: OAuth callback server
   npm run server
   
   # Terminal 2: Slack bot
   npm start
   ```

2. **Test in Slack**:
   ```
   @Kroolo AI connect slack
   ```

3. **Click the "Connect Slack Apps" button**
   - Should open browser to Slack OAuth page
   - Login with your Slack account (if needed)
   - Grant permissions to the app
   - Redirect back to your localhost callback

4. **Verify Connection**:
   ```
   @Kroolo AI slack status
   ```

## How This Works

1. **User Authentication**: Each Slack user can connect their own Slack apps
2. **Dynamic Credentials**: Bot uses individual user's Slack tokens and permissions
3. **Enhanced Features**: Access to user's specific channels, files, and messages
4. **App Management**: Users can manage their connected Slack apps through the bot

## Available Commands

Once set up, users can use these commands:

- `@Kroolo AI connect slack` - Connect Slack apps
- `@Kroolo AI slack status` - Check connection status
- `@Kroolo AI slack apps` - Manage connected apps
- `@Kroolo AI disconnect slack` - Disconnect Slack apps

## Popular Slack Apps You Can Connect

- **💬 Slack Workspace** - Enhanced workspace search
- **📁 Slack Files** - File access and management
- **📢 Slack Channels** - Channel search and management
- **💬 Slack Messages** - Message history search
- **🔧 Slack Apps** - App integrations
- **🔔 Slack Notifications** - Notification management

## Benefits of This Approach

- ✅ **Secure**: Each user authenticates individually
- ✅ **Personalized**: Access to user's own Slack data
- ✅ **Scalable**: Works for entire organization
- ✅ **Flexible**: Users control their own app connections
- ✅ **Compliant**: Proper OAuth 2.0 security standards

## Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri" error**:
   - Make sure the redirect URI in your Slack app matches exactly: `http://localhost:3000/auth/slack/callback`

2. **"Missing scopes" error**:
   - Ensure all required scopes are added to your Slack app

3. **"Client ID not found" error**:
   - Double-check your `SLACK_CLIENT_ID` in the .env file

4. **Connection timeout**:
   - Make sure your OAuth callback server is running on port 3000

### Debug Mode:

Enable debug logging by setting:
```bash
DEBUG=slack:*
```

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- Use HTTPS in production environments
- Regularly rotate your OAuth credentials
- Monitor OAuth token usage and revoke unused tokens

## Production Deployment

For production, update these settings:

1. **Update Redirect URI** in Slack app to your production domain
2. **Set SLACK_BOT_URL** to your production URL
3. **Use HTTPS** for all OAuth callbacks
4. **Enable rate limiting** for OAuth endpoints
