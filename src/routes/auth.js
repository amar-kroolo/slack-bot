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

// Pipedream Connect success callback
router.get('/pipedream/success', async (req, res) => {
  try {
    console.log('✅ Pipedream Connect success callback received');
    console.log('   Query params:', req.query);

    const { external_user_id, account_id, app } = req.query;
    let userEmail = null;
    let connectionDetails = null;

    if (external_user_id && account_id) {
      console.log('🔗 Processing successful connection:');
      console.log('   External User ID:', external_user_id);
      console.log('   Account ID:', account_id);
      console.log('   App:', app || 'Unknown');

      try {
        // Store the connection in our service
        const pipedreamService = require('../services/pipedreamService');
        await pipedreamService.storeUserConnection(external_user_id, account_id, app);

        // Extract user email from account credentials for dynamic API calls
        const accountCredentials = await pipedreamService.getAccountCredentials(account_id);
        userEmail = accountCredentials.email;
        connectionDetails = {
          account_id,
          app: app || 'Unknown',
          email: userEmail,
          connected_at: new Date().toISOString()
        };

        console.log('✅ Account credentials retrieved successfully');
        console.log('   📧 User Email extracted:', userEmail);
        console.log('   🔧 This email will be used for dynamic API calls');

        // Store the email for future API calls (you can implement persistent storage here)
        // For now, we'll use it in the response

      } catch (connectionError) {
        console.error('⚠️ Error extracting user credentials:', connectionError.message);
        // Continue anyway - connection might still work
      }
    }

    // Success response with connection details
    res.send(`
      <html>
        <head>
          <title>Pipedream Connection Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #27ae60; font-size: 48px; margin-bottom: 20px; }
            .title { color: #2c3e50; margin-bottom: 15px; }
            .subtitle { color: #7f8c8d; margin-bottom: 30px; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; }
            .button { padding: 12px 24px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .button:hover { background: #219a52; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">🎉</div>
            <h1 class="title">Pipedream Connected Successfully!</h1>
            <p class="subtitle">Your account has been connected and you can now use dynamic tool access.</p>

            ${external_user_id ? `
              <div class="details">
                <strong>Connection Details:</strong><br>
                👤 User ID: ${external_user_id}<br>
                🔗 Account ID: ${account_id || 'N/A'}<br>
                📱 App: ${app || 'General Connection'}<br>
                ${userEmail ? `📧 Email: ${userEmail}<br>` : ''}
                ${userEmail ? `🎯 <strong>This email will be used for dynamic API calls!</strong>` : ''}
              </div>
            ` : ''}

            <p><strong>Next Steps:</strong></p>
            <ul style="text-align: left; display: inline-block;">
              <li>Return to Slack</li>
              <li>Try: <code>@SmartBot pipedream status</code></li>
              <li>Try: <code>@SmartBot search for documents</code></li>
            </ul>

            <button class="button" onclick="window.close()">Close & Return to Slack</button>
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

  } catch (error) {
    console.error('❌ Pipedream success callback error:', error.message);
    res.redirect('/auth/pipedream/error?message=' + encodeURIComponent(error.message));
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
