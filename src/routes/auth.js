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

// Test endpoint to simulate app ID extraction
router.get('/test-app-id-extraction', async (req, res) => {
  try {
    console.log('🧪 Testing app ID extraction');

    // Simulate the URL from your screenshot: pipedream.com/popup/auth/success?ap_id=apn_EOhw3ya&is_connect=true
    const testParams = {
      ap_id: 'apn_EOhw3ya',
      is_connect: 'true',
      external_user_id: 'test_user_123',
      app: 'google_drive'
    };

    console.log('🔍 Test parameters:', testParams);

    const pipedreamService = require('../services/pipedreamService');

    // Store the test connection
    const storeResult = await pipedreamService.storeRealConnection(
      testParams.external_user_id,
      testParams.app,
      testParams.ap_id,
      'test@example.com'
    );

    // Get user status to verify storage
    const userStatus = await pipedreamService.getUserStatus(testParams.external_user_id);

    // Get dynamic payload to verify it's used in API calls
    const dynamicPayload = await pipedreamService.getDynamicCredentials(testParams.external_user_id, 'test@slack.com');

    res.json({
      test: 'app_id_extraction',
      success: true,
      test_params: testParams,
      store_result: storeResult,
      user_status: userStatus,
      dynamic_payload: dynamicPayload,
      extracted_app_id: testParams.ap_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    res.status(500).json({
      test: 'app_id_extraction',
      success: false,
      error: error.message
    });
  }
});

// Enhanced Pipedream Connect success callback with real app ID tracking
router.get('/pipedream/success', async (req, res) => {
  try {
    console.log('🎉 PIPEDREAM CONNECTION SUCCESS!');
    console.log('📊 Query params:', req.query);
    console.log('📊 Headers:', req.headers);

    // Extract the real app ID from ap_id parameter (like apn_EOhw3ya)
    const { external_user_id, account_id, app, token, ap_id, is_connect } = req.query;

    // Priority 1: Use ap_id if available (this is the real Pipedream app ID)
    const realAppId = ap_id || account_id;

    if (external_user_id && realAppId) {
      console.log('✅ REAL CONNECTION DETECTED:');
      console.log('   👤 User:', external_user_id);
      console.log('   🔗 Real App ID:', realAppId);
      console.log('   📱 App:', app || 'Unknown');
      console.log('   🎯 Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      console.log('   🔗 Is Connect:', is_connect);

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
        realAppId, // Use the real app ID (ap_id)
        null // email will be extracted from user context
      );

      if (storeResult.success) {
        console.log('✅ Real connection stored successfully!');
        console.log('   📊 Total connections for user:', storeResult.total_connections);
        console.log('   🔗 Stored App ID:', realAppId);

        // Notify the user in Slack about successful connection
        await pipedreamService.notifyConnectionSuccess(external_user_id, appSlug, realAppId);
      } else {
        console.error('❌ Failed to store real connection:', storeResult.error);
      }
    } else if (realAppId && !external_user_id) {
      // Handle case where we have app ID but no external user ID
      console.log('⚠️ PARTIAL CONNECTION: App ID found but no external user ID');
      console.log('   🔗 Real App ID:', realAppId);
      console.log('   📱 App:', app || 'Unknown');

      // Try to extract user ID from URL or other sources
      // This might happen in some authentication flows
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
            .app-id { background: #e8f5e8; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="success">🎉</div>
          <h1>Successfully Connected!</h1>
          <p>Your ${app || 'tool'} account has been connected successfully.</p>

          <div class="details">
            <strong>Connection Details:</strong><br>
            👤 User: ${external_user_id || 'Not provided'}<br>
            🔗 Real App ID: <div class="app-id">${realAppId || 'Not extracted'}</div>
            📱 App: ${app || 'General'}<br>
            ⏰ Connected: ${new Date().toLocaleString()}<br>
            ${ap_id ? `🎯 Extracted from ap_id: ${ap_id}` : ''}
          </div>

          <p>You can now close this window and return to Slack.</p>
          <p>Your bot will now use this real app ID (${realAppId}) for searches!</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Error in success callback:', error.message);
    res.status(500).send('Error processing connection');
  }
});

// Handle Pipedream popup auth success (matches the URL pattern from your screenshot)
router.get('/popup/auth/success', async (req, res) => {
  try {
    console.log('🎉 PIPEDREAM POPUP AUTH SUCCESS!');
    console.log('📊 Query params:', req.query);
    console.log('📊 Full URL:', req.url);

    const { ap_id, is_connect, external_user_id, app } = req.query;

    if (ap_id) {
      console.log('✅ REAL APP ID EXTRACTED FROM POPUP:');
      console.log('   🔗 App ID (ap_id):', ap_id);
      console.log('   🔗 Is Connect:', is_connect);
      console.log('   👤 External User ID:', external_user_id || 'Not provided');
      console.log('   📱 App:', app || 'Not specified');

      // Store the REAL connection with the extracted app ID
      const pipedreamService = require('../services/pipedreamService');

      // If we have external_user_id, store the connection
      if (external_user_id) {
        const storeResult = await pipedreamService.storeRealConnection(
          external_user_id,
          app || 'unknown_app',
          ap_id, // Use the real app ID from ap_id parameter
          null // email will be extracted from user context
        );

        if (storeResult.success) {
          console.log('✅ Real app ID stored successfully!');
          console.log('   📊 Total connections for user:', storeResult.total_connections);
          console.log('   🔗 Stored App ID:', ap_id);

          // Notify the user in Slack about successful connection
          await pipedreamService.notifyConnectionSuccess(external_user_id, app || 'unknown_app', ap_id);
        } else {
          console.error('❌ Failed to store real app ID:', storeResult.error);
        }
      } else {
        console.log('⚠️ No external_user_id provided, storing app ID for later association');
        // You might want to store this temporarily and associate it later
      }
    } else {
      console.log('⚠️ No ap_id found in popup success URL');
    }

    // Show success page with extracted app ID
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>App Connected Successfully!</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .success-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .success { color: #27ae60; font-size: 64px; margin-bottom: 20px; }
            .app-id { background: #e8f5e8; padding: 15px; border-radius: 8px; font-family: monospace; margin: 15px 0; font-size: 18px; font-weight: bold; }
            .details { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: left; }
            .close-btn { padding: 15px 30px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px; }
            .close-btn:hover { background: #229954; }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success">🎉</div>
            <h1>App Connected Successfully!</h1>
            <p>Your ${app || 'application'} has been connected and the real app ID has been extracted.</p>

            <div class="app-id">
              Real App ID: ${ap_id || 'Not extracted'}
            </div>

            <div class="details">
              <strong>Connection Details:</strong><br>
              🔗 App ID: ${ap_id || 'Not available'}<br>
              📱 App: ${app || 'Not specified'}<br>
              👤 User: ${external_user_id || 'Not provided'}<br>
              🔗 Connect Mode: ${is_connect || 'false'}<br>
              ⏰ Connected: ${new Date().toLocaleString()}
            </div>

            <p>This real app ID will now be used for all API calls and searches!</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Error in popup auth success:', error.message);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e74c3c;">❌ Error</h1>
          <p>Error processing connection: ${error.message}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
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
