// OAuth Authentication Routes for Pipedream Integration
// Handles OAuth callbacks and authentication flow

const express = require('express');
const pipedreamService = require('../services/pipedreamService');

const router = express.Router();

// Pipedream OAuth callback endpoint
router.get('/pipedream/callback', async (req, res) => {
  try {
    console.log('🔄 Pipedream OAuth callback received');
    console.log('   Query params:', req.query);

    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error);
      return res.status(400).send(`
        <html>
          <head><title>Authentication Error</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #e74c3c;">❌ Authentication Failed</h1>
            <p>Error: ${error}</p>
            <p>Please try connecting again from Slack.</p>
            <button onclick="window.close()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
          </body>
        </html>
      `);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing required OAuth parameters');
      return res.status(400).send(`
        <html>
          <head><title>Authentication Error</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #e74c3c;">❌ Invalid Request</h1>
            <p>Missing required authentication parameters.</p>
            <p>Please try connecting again from Slack.</p>
            <button onclick="window.close()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
          </body>
        </html>
      `);
    }

    // Process the OAuth callback
    const userAuth = await pipedreamService.handleAuthCallback(code, state);

    // Success response
    res.send(`
      <html>
        <head>
          <title>Pipedream Connected Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .success-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .success-icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #27ae60; margin-bottom: 20px; }
            .user-info { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .close-btn { padding: 15px 30px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px; }
            .close-btn:hover { background: #229954; }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✅</div>
            <h1>Successfully Connected!</h1>
            <p>Your Pipedream account has been connected to the Slack bot.</p>
            
            <div class="user-info">
              <strong>Connected Account:</strong><br>
              📧 ${userAuth.email}<br>
              👤 ${userAuth.name}<br>
              🆔 ${userAuth.pipedreamUserId}
            </div>
            
            <p>You can now use personalized search in Slack!</p>
            <p><strong>Try these commands:</strong></p>
            <ul style="text-align: left; display: inline-block;">
              <li><code>@SmartBot search for documents</code></li>
              <li><code>@SmartBot pipedream status</code></li>
              <li><code>@SmartBot pipedream tools</code></li>
            </ul>
            
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
          
          <script>
            // Auto-close after 10 seconds
            setTimeout(() => {
              window.close();
            }, 10000);
          </script>
        </body>
      </html>
    `);

    console.log('✅ OAuth callback processed successfully');
    console.log('   User:', userAuth.email);
    console.log('   Slack User ID:', userAuth.slackUserId);

  } catch (error) {
    console.error('❌ OAuth callback error:', error.message);
    
    res.status(500).send(`
      <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e74c3c;">❌ Authentication Error</h1>
          <p>An error occurred while connecting your account:</p>
          <p style="color: #7f8c8d; font-style: italic;">${error.message}</p>
          <p>Please try connecting again from Slack.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});


// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'oauth-auth'
  });
});

// Enhanced Pipedream Connect success callback with real account ID tracking
router.get('/pipedream/success', async (req, res) => {
  try {
    console.log('🎉 PIPEDREAM CONNECTION SUCCESS!');
    console.log('📊 Query params:', req.query);
    console.log('📊 Headers:', req.headers);

    const { external_user_id, account_id, app, token } = req.query;
    
    if (external_user_id && account_id) {
      console.log('✅ REAL CONNECTION DETECTED:');
      console.log('   👤 User:', external_user_id);
      console.log('   🔗 Account ID:', account_id);
      console.log('   📱 App:', app || 'Unknown');
      console.log('   🎯 Token:', token ? `${token.substring(0, 20)}...` : 'No token');

      // Store the REAL connection immediately (like your frontend onSuccess callback)
      const pipedreamService = require('../services/pipedreamService');

      // Map app name to match your frontend logic
      let appSlug = app;
      if (app === 'Google Drive') appSlug = 'google_drive';
      if (app === 'Microsoft Teams') appSlug = 'microsoft_teams';
      if (app === 'Document 360') appSlug = 'document360';

      const storeResult = await pipedreamService.storeRealConnection(
        external_user_id,
        appSlug,
        account_id,
        null // email will be extracted from user context
      );

      if (storeResult.success) {
        console.log('✅ Real connection stored successfully!');
        console.log('   📊 Total connections for user:', storeResult.total_connections);

        // Notify the user in Slack about successful connection
        await pipedreamService.notifyConnectionSuccess(external_user_id, appSlug, account_id);
      } else {
        console.error('❌ Failed to store real connection:', storeResult.error);
      }
    }

    // Show success page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful!</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #27ae60; font-size: 48px; }
            .details { background: #f8f9fa; padding: 20px; margin: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="success">🎉</div>
          <h1>Successfully Connected!</h1>
          <p>Your ${app || 'tool'} account has been connected successfully.</p>
          
          <div class="details">
            <strong>Connection Details:</strong><br>
            👤 User: ${external_user_id}<br>
            🔗 Account ID: ${account_id}<br>
            📱 App: ${app || 'General'}<br>
            ⏰ Connected: ${new Date().toLocaleString()}
          </div>
          
          <p>You can now close this window and return to Slack.</p>
          <p>Your bot will now use this real account ID for searches!</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Error in success callback:', error.message);
    res.status(500).send('Error processing connection');
  }
});

// Pipedream Connect error callback
router.get('/pipedream/error', async (req, res) => {
  try {
    console.log('❌ Pipedream Connect error callback received');
    console.log('   Query params:', req.query);

    const errorMessage = req.query.message || 'Unknown error occurred';

    res.send(`
      <html>
        <head>
          <title>Pipedream Connection Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #e74c3c; font-size: 48px; margin-bottom: 20px; }
            .title { color: #2c3e50; margin-bottom: 15px; }
            .subtitle { color: #7f8c8d; margin-bottom: 30px; }
            .button { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
            .button:hover { background: #2980b9; }
            .retry { background: #e67e22; }
            .retry:hover { background: #d35400; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌</div>
            <h1 class="title">Connection Failed</h1>
            <p class="subtitle">There was an issue connecting your Pipedream account.</p>
            <p style="color: #7f8c8d; font-style: italic;">${errorMessage}</p>
            <p>Please try connecting again from Slack by typing: <code>@SmartBot connect pipedream</code></p>
            <button class="button" onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Pipedream error callback error:', error.message);
    res.send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e74c3c;">❌ Error</h1>
          <p>An unexpected error occurred.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

module.exports = router;
