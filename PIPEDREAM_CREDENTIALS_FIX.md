# 🔧 Fix Pipedream Credentials

## Current Issue
Your Pipedream credentials are returning `invalid_client` error, which means:
- The Client ID doesn't exist
- The Client Secret is wrong
- The OAuth app is not properly configured

## ✅ How to Get Correct Credentials

### Step 1: Go to Pipedream Apps
```
https://pipedream.com/apps
```

### Step 2: Create OAuth App
1. Click "Create App" or "New App"
2. Choose "OAuth App" (not Webhook or other types)
3. Fill in app details:
   - **App Name**: `Slack Bot Integration`
   - **Description**: `OAuth app for Slack bot tool connections`
   - **Redirect URI**: `http://localhost:3000/auth/pipedream/callback`

### Step 3: Get Credentials
After creating the app, you'll see:
- **Client ID**: Copy this exactly
- **Client Secret**: Copy this exactly  
- **Project ID**: Should be visible in the URL or app settings

### Step 4: Update .env File
Replace the current values in your `.env` file:

```bash
# Replace these with your NEW credentials
PIPEDREAM_CLIENT_ID=your-new-client-id-here
PIPEDREAM_PROJECT_ID=your-new-project-id-here
PIPEDREAM_CLIENT_SECRET=your-new-client-secret-here
```

### Step 5: Test Credentials
Run this command to test:
```bash
node test-pipedream.js
```

You should see:
```
✅ OAuth token obtained successfully!
✅ Connect token created successfully!
```

## 🎯 Expected Working URLs

Once fixed, you'll get real URLs like:
```
https://pipedream.com/_static/connect.html?token=ctok_abc123def456&connectLink=true&app=google_drive
https://pipedream.com/_static/connect.html?token=ctok_abc123def456&connectLink=true&app=gmail
https://pipedream.com/_static/connect.html?token=ctok_abc123def456&connectLink=true&app=github
```

## 🔍 Current Status

**Your current credentials**:
- Client ID: `yIXGfrbiYejFYW0do5Vde612_u3l8lNJYZ_mTiSBMkY4`
- Project ID: `proj_rKs32DK`
- Client Secret: `FdZqzJsihGMlgPGK6TWzLaG2CfkbAOnAt5WyYDYU1CE`

**Error**: `invalid_client` - These credentials don't match any valid Pipedream OAuth app.

## 🚀 Quick Test

Try the demo interface first:
```
@SmartBot connect tools
```

You'll see:
- ✅ Demo URLs with correct format
- ✅ Working buttons (will show Pipedream error page, but URL format is correct)
- ✅ User email extraction working

## 📧 User Email Status

✅ **Working**: Using fallback email from RBAC config
- Current email: From your `apis.js` RBAC_CONFIG
- Will use Slack email once `users:read` scope is added

## 🔄 Next Steps

1. **Fix Pipedream credentials** (follow steps above)
2. **Add Slack scope** (`users:read` for email extraction)
3. **Test with real tokens**

Once both are fixed, you'll get working URLs like:
`https://pipedream.com/_static/connect.html?token=ctok_REAL_TOKEN&connectLink=true&app=google_drive`
