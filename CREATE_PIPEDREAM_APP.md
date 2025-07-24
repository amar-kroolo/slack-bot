# 🔧 Create New Pipedream OAuth App

## ❌ Current Issue
Your Pipedream credentials are **INVALID**:
```
Client ID: gZ5qCUiHNk...
Project ID: proj_36syN...
Client Secret: FdZqzJsihG...
```

**Error**: `invalid_client` - These credentials don't exist in Pipedream's system.

## ✅ Solution: Create New OAuth App

### Step 1: Go to Pipedream Apps
```
https://pipedream.com/apps
```

### Step 2: Sign In
- Use your Pipedream account
- If you don't have one, create it first

### Step 3: Create New App
1. Click **"Create App"** or **"New App"**
2. Choose **"OAuth App"** (NOT webhook or other types)
3. Fill in details:
   - **App Name**: `Slack Bot Integration`
   - **Description**: `OAuth app for Slack bot tool connections`
   - **Redirect URI**: `http://localhost:3000/auth/pipedream/callback`
   - **Website**: `http://localhost:3000` (optional)

### Step 4: Get New Credentials
After creating the app, you'll see:
- ✅ **Client ID**: Copy this exactly
- ✅ **Client Secret**: Copy this exactly
- ✅ **Project ID**: Should be visible in URL or settings

### Step 5: Update .env File
Replace your current invalid credentials:

```bash
# OLD (INVALID) - Remove these
PIPEDREAM_CLIENT_ID=gZ5qCUiHNk...
PIPEDREAM_PROJECT_ID=proj_36syN...
PIPEDREAM_CLIENT_SECRET=FdZqzJsihG...

# NEW (VALID) - Add these
PIPEDREAM_CLIENT_ID=your-new-client-id-here
PIPEDREAM_PROJECT_ID=your-new-project-id-here
PIPEDREAM_CLIENT_SECRET=your-new-client-secret-here
```

### Step 6: Test New Credentials
```bash
# Test with Python
python3 test-pipedream-python.py

# Should show:
# ✅ SUCCESS: Got access token: abc123...
# ✅ SUCCESS: Got connect token: ctok_xyz...
```

### Step 7: Restart Bot
```bash
npm start
```

### Step 8: Test in Slack
```
@SmartBot connect tools
```

**Expected**: Real working URLs instead of demo tokens!

## 🎯 What You'll Get

Once you have valid credentials, you'll get **real working URLs**:

```
https://pipedream.com/_static/connect.html?token=ctok_REAL_TOKEN&connectLink=true&app=google_drive
https://pipedream.com/_static/connect.html?token=ctok_REAL_TOKEN&connectLink=true&app=gmail
https://pipedream.com/_static/connect.html?token=ctok_REAL_TOKEN&connectLink=true&app=github
```

**When users click these URLs**:
1. ✅ Opens Pipedream connect page
2. ✅ Shows tool selection (Google Drive, Gmail, etc.)
3. ✅ User authenticates with their account
4. ✅ Tool gets connected to your Pipedream project
5. ✅ You can make API calls through Pipedream proxy

## 🔍 Why Your Current Credentials Don't Work

**Possible reasons**:
1. **App was deleted**: Someone deleted the OAuth app
2. **Wrong environment**: Credentials from different Pipedream account
3. **Typo in .env**: Copy-paste error when setting up
4. **Old credentials**: From a test app that was removed

## 🚀 Quick Test

**Current status** (with invalid credentials):
```bash
@SmartBot connect tools
# Shows: Demo URLs with fake tokens
```

**After fixing** (with valid credentials):
```bash
@SmartBot connect tools  
# Shows: Real URLs with working tokens
```

## 📞 Need Help?

If you're still having issues:
1. Check Pipedream documentation: https://pipedream.com/docs
2. Verify your Pipedream account has OAuth app creation permissions
3. Make sure you're creating an "OAuth App" not other app types

**The Python test confirms your credentials are invalid - you MUST create a new OAuth app to proceed.**
