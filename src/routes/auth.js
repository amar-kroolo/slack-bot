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
    service: 'pipedream-auth'
  });
});

module.exports = router;
