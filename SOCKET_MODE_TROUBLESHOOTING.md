# Socket Mode Troubleshooting Guide

## 🔍 Common Socket Mode Errors and Solutions

### Error: "Unhandled event 'server explicit disconnect' in state 'connecting'"

This is a known issue with the Slack Socket Mode library when there are WebSocket connection interruptions. It's usually harmless and the connection will be re-established automatically.

**What causes this:**
- Network connectivity issues
- Slack server-side disconnections
- WebSocket connection timeouts
- State machine synchronization issues in the Socket Mode library

**Solutions:**

#### 1. Use the Enhanced Bot Manager (Recommended)
```bash
npm run start-managed
```

This uses our custom bot manager that handles Socket Mode errors gracefully and provides automatic restart capabilities.

#### 2. Use Regular Start with Enhanced Error Handling
```bash
npm start
```

The app now includes enhanced error handling that catches these errors and prevents crashes.

#### 3. Development Mode with Auto-Restart
```bash
npm run dev
```

Uses nodemon which will automatically restart the bot when files change or when it crashes.

## 🛠️ Enhanced Error Handling Features

### Automatic Error Recovery
- Socket Mode connection errors are caught and logged
- App continues running instead of crashing
- Automatic reconnection is handled by the Slack SDK

### Graceful Shutdown
- Proper handling of SIGINT and SIGTERM signals
- Clean shutdown of Socket Mode connections
- Prevents zombie processes

### Detailed Logging
- Connection status logging
- Error categorization and specific guidance
- Debug information for troubleshooting

## 🔧 Configuration Verification

### Required Environment Variables
Make sure these are set in your `.env` file:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token  # Required for Socket Mode
SLACK_SIGNING_SECRET=your-signing-secret
```

### Slack App Configuration
1. **Socket Mode must be enabled** in your Slack app settings
2. **App-level token** must have `connections:write` scope
3. **Bot token** must have appropriate bot scopes

## 🚀 Starting the Bot

### Option 1: Managed Start (Recommended)
```bash
npm run start-managed
```
- Automatic restart on crashes
- Enhanced error handling
- Connection monitoring

### Option 2: Standard Start
```bash
npm start
```
- Basic error handling
- Manual restart required on crashes

### Option 3: Development Mode
```bash
npm run dev
```
- Auto-restart on file changes
- Good for development

## 🔍 Debugging Socket Mode Issues

### Check Connection Status
The bot will log connection status:
```
⚡️ Slack API Query Bot is running!
🚀 Server started on port 3000
📡 Socket Mode connection established
```

### Common Error Messages and Meanings

#### "route not found" (404 errors)
- Usually related to Pipedream API calls
- Not critical for basic bot functionality
- Dynamic authentication will fall back to static credentials

#### "WebSocket connection closed"
- Normal occurrence during network issues
- App will automatically reconnect
- No action required

#### "Token validation failed"
- Check your SLACK_BOT_TOKEN and SLACK_APP_TOKEN
- Ensure tokens are valid and not expired
- Verify app permissions

## 🧪 Testing the Dynamic Authentication

### Run Authentication Tests
```bash
npm run test-auth
```

### Run Authentication Demo
```bash
npm run demo-auth
```

## 📊 Monitoring and Logs

### What to Look For
- ✅ "Socket Mode connection established" - Good
- ⚠️ "Socket Mode connection issue detected" - Temporary, will recover
- ❌ "Token validation failed" - Needs attention

### Log Levels
- 🔧 DEBUG: Detailed debugging information
- ℹ️ INFO: General information
- ⚠️ WARN: Warnings that don't stop functionality
- ❌ ERROR: Errors that need attention

## 🆘 If Problems Persist

1. **Check Slack Status**: Visit https://status.slack.com/
2. **Verify Network**: Ensure stable internet connection
3. **Update Dependencies**: Run `npm update`
4. **Check Slack App Settings**: Verify Socket Mode and permissions
5. **Restart with Clean State**: Stop all processes and restart

## 💡 Best Practices

1. **Use the managed start script** for production
2. **Monitor logs** for connection issues
3. **Keep tokens secure** and rotate them regularly
4. **Test authentication flow** after any changes
5. **Use development mode** when making code changes

## 🔄 Recovery Steps

If the bot becomes unresponsive:

1. Stop the process (Ctrl+C)
2. Wait 5 seconds
3. Restart using `npm run start-managed`
4. Check logs for any persistent errors
5. Verify environment variables if issues continue

The enhanced error handling should prevent most crashes and provide automatic recovery for Socket Mode connection issues.
