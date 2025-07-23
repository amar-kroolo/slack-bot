# 🔗 Pipedream OAuth Setup Guide

## Why Pipedream OAuth is Needed

Pipedream OAuth allows your Slack bot to:
- 🔐 Authenticate users individually 
- 🛠️ Access their connected tools (Google Drive, Slack, Dropbox, etc.)
- 📊 Provide personalized search results based on their actual accounts
- 🔄 Dynamically switch between user credentials

## Step-by-Step Pipedream OAuth Setup

### Step 1: Create OAuth Application

1. **Go to Pipedream Developer Console**:
   ```
   https://pipedream.com/apps
   ```

2. **Click "Create App" or "New Application"**
   - If you don't see this option, look for "Developer" or "OAuth Apps" section

3. **Fill in Application Details**:
   ```
   Application Name: Slack Enterprise Search Bot
   Description: AI-powered enterprise search with dynamic user authentication
   Website URL: http://localhost:3000 (for development)
   ```

4. **Add Redirect URI**:
   ```
   http://localhost:3000/auth/pipedream/callback
   ```

5. **Select Scopes**:
   ```
   ✅ read:user (to get user profile)
   ✅ read:connections (to see connected tools)
   ✅ write:connections (to manage connections)
   ```

6. **Save and Get Credentials**:
   - Copy the **Client ID**
   - Copy the **Client Secret** 
   - Copy the **Project ID** (if shown)

### Step 2: Update Your .env File

Replace the placeholder values in your `.env` file:

```bash
# Replace these with your actual OAuth app credentials
PIPEDREAM_CLIENT_ID=your-actual-client-id-from-step-1
PIPEDREAM_PROJECT_ID=your-actual-project-id-from-step-1  
PIPEDREAM_CLIENT_SECRET=your-actual-client-secret-from-step-1
```

### Step 3: Test the OAuth Flow

1. **Start your servers**:
   ```bash
   # Terminal 1: OAuth callback server
   npm run server
   
   # Terminal 2: Slack bot
   npm start
   ```

2. **Test in Slack**:
   ```
   @SmartBot connect pipedream
   ```

3. **Click the "Connect to Pipedream" button**
   - Should open browser to Pipedream OAuth page
   - Login with your Pipedream account
   - Grant permissions
   - Redirect back to your localhost callback

## Troubleshooting

### "No OAuth Apps Found"
- You need to create the OAuth app first (Step 1 above)
- Make sure you're in the right section of Pipedream dashboard

### "404 Not Found" on OAuth URL
- Check that redirect URI is exactly: `http://localhost:3000/auth/pipedream/callback`
- Make sure your Express server is running on port 3000

### "Invalid Client ID"
- Double-check the Client ID in your .env file
- Make sure there are no extra spaces or characters

## What Happens After Setup

1. **User Authentication**: Each Slack user can connect their own Pipedream account
2. **Dynamic Credentials**: Bot uses individual user's email and account IDs
3. **Personalized Search**: Results come from user's actual connected tools
4. **Tool Management**: Users can manage their connected tools through Slack

## Benefits of This Approach

- ✅ **Secure**: Each user authenticates individually
- ✅ **Personalized**: Search results from user's own accounts
- ✅ **Scalable**: Works for entire organization
- ✅ **Flexible**: Users control their own tool connections
- ✅ **Compliant**: Proper OAuth 2.0 security standards
