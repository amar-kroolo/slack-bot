# 🚀 Deployment Guide

## Quick Local Testing

### 1. Test the Bot Logic
```bash
# Test without Slack integration
node test-bot.js
```

### 2. Run the Bot Locally
```bash
# Start the development server
npm run dev
```

## Production Deployment Options

### Option 1: Heroku (Recommended for beginners)

#### 1.1 Install Heroku CLI
```bash
# macOS
brew install heroku/brew/heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

#### 1.2 Deploy to Heroku
```bash
# Login to Heroku
heroku login

# Create a new app
heroku create your-slack-bot-name

# Set environment variables
heroku config:set SLACK_BOT_TOKEN=xoxb-your-token
heroku config:set SLACK_SIGNING_SECRET=your-secret
heroku config:set SLACK_APP_TOKEN=xapp-your-token
heroku config:set API_BASE_URL=https://your-api.com
heroku config:set API_KEY=your-api-key

# Deploy
git add .
git commit -m "Initial deployment"
git push heroku main
```

#### 1.3 Scale the App
```bash
# Ensure at least one dyno is running
heroku ps:scale web=1
```

### Option 2: Railway

#### 2.1 Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### 2.2 Set Environment Variables
Go to your Railway dashboard and add:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_APP_TOKEN`
- `API_BASE_URL`
- `API_KEY`

### Option 3: DigitalOcean App Platform

#### 3.1 Create App
1. Go to DigitalOcean App Platform
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `npm install`
   - Run Command: `npm start`

#### 3.2 Environment Variables
Add in the App Platform dashboard:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_APP_TOKEN`
- `API_BASE_URL`
- `API_KEY`

### Option 4: AWS (Advanced)

#### 4.1 Using AWS Lambda + API Gateway
```bash
# Install Serverless Framework
npm install -g serverless

# Create serverless.yml configuration
# Deploy
serverless deploy
```

#### 4.2 Using AWS ECS/Fargate
- Create Docker container
- Deploy to ECS
- Configure load balancer

## Environment Variables Checklist

Make sure these are set in your production environment:

```env
# Required Slack tokens
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...

# Server configuration
PORT=3000
NODE_ENV=production

# Your API configuration
API_BASE_URL=https://your-api.com
API_KEY=your-api-key

# Optional: Enhanced NLP
OPENAI_API_KEY=sk-... (optional)
```

## Health Check Endpoint

The bot includes a basic health check. Add this to your app.js if needed:

```javascript
// Add to app.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Monitoring and Logging

### Basic Logging
The bot logs to console. In production, consider:

```javascript
// Enhanced logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Error Tracking
Consider adding error tracking:

```bash
# Sentry for error tracking
npm install @sentry/node

# Add to your app.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use secure environment variable management
- Rotate tokens regularly

### 2. API Security
- Use HTTPS for all API calls
- Implement rate limiting
- Validate all inputs

### 3. Slack Security
- Verify request signatures
- Use Socket Mode for better security
- Limit bot permissions to minimum required

## Scaling Considerations

### 1. Multiple Instances
- The bot is stateless and can run multiple instances
- Use a load balancer if needed
- Consider Redis for shared state if required

### 2. Database
- Add database for persistent storage
- Consider PostgreSQL or MongoDB
- Implement connection pooling

### 3. Caching
- Cache API responses when appropriate
- Use Redis for distributed caching
- Implement cache invalidation strategies

## Troubleshooting Production Issues

### 1. Bot Not Responding
- Check if the service is running
- Verify environment variables
- Check Slack app configuration
- Review logs for errors

### 2. API Timeouts
- Increase timeout values
- Implement retry logic
- Add circuit breakers
- Monitor API health

### 3. Memory Issues
- Monitor memory usage
- Implement garbage collection
- Check for memory leaks
- Scale horizontally if needed

## Maintenance

### 1. Regular Updates
```bash
# Update dependencies
npm audit
npm update

# Test after updates
npm test
node test-bot.js
```

### 2. Monitoring
- Set up uptime monitoring
- Monitor error rates
- Track response times
- Monitor resource usage

### 3. Backups
- Backup configuration
- Document API endpoints
- Keep deployment scripts updated

## Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Slack app permissions set
- [ ] API endpoints tested
- [ ] Health check working
- [ ] Logging configured
- [ ] Error handling implemented
- [ ] Security measures in place
- [ ] Monitoring set up
- [ ] Documentation updated

Your bot is now ready for production! 🎉
