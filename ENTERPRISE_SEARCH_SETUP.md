# 🔍 Enterprise Search API - Slack Bot Setup Guide

Your Slack bot is now configured for the **Enterprise Search API v3.1** with **Triple RBAC Enforcement**!

## 🎯 What Your Bot Can Do

### Natural Language Queries Supported:
- **Search**: `"search for financial report"`, `"find team meeting notes"`
- **Recent Searches**: `"show me recent searches"`, `"my search history"`
- **Suggested Documents**: `"suggested documents"`, `"recommend files"`
- **Trending Documents**: `"trending documents"`, `"what's popular now"`
- **Dynamic Suggestions**: `"suggest api documentation"`, `"complete project"`

## 🔧 API Configuration

### Current RBAC Settings (in `src/config/apis.js`):
```javascript
const RBAC_CONFIG = {
  account_ids: [
    "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb",
    "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
  ],
  external_user_id: "686652ee4314417de20af851",
  user_email: "ayush.enterprise.search@gmail.com"
};
```

### Supported Apps:
- Google Drive
- Slack
- Dropbox
- Jira
- Zendesk
- Document360

## 🚀 Quick Start

### 1. Test with Mock Data (Immediate)
```bash
# Test the bot logic
node test-bot.js

# Start the bot with mock data
npm run dev
```

### 2. Connect to Real API
Update your `.env` file:
```env
API_BASE_URL=https://qa-es-api.kroolo.com
# No API_KEY needed - authentication handled in request body
```

### 3. Customize RBAC (if needed)
Edit `src/config/apis.js` to update:
- `account_ids`: User's accessible accounts
- `external_user_id`: User's external ID
- `user_email`: User's email address

## 📊 API Endpoint Mapping

| Slack Query | API Endpoint | Payload Example |
|-------------|--------------|-----------------|
| "search for X" | `POST /search` | `{query: "X", account_ids: [...], ...}` |
| "recent searches" | `POST /recent-searches` | `{limit: 10, account_ids: [...], ...}` |
| "suggested documents" | `POST /suggested-documents` | `{limit: 10, account_ids: [...], ...}` |
| "trending documents" | `POST /trending-documents` | `{limit: 10, account_ids: [...], ...}` |
| "suggest X" | `POST /suggestions` | `{partial_query: "X", account_ids: [...], ...}` |

## 🎨 Response Formatting

### Search Results
- Shows document title, content preview, and source
- Includes relevance score and last modified date
- Provides clickable "Open" buttons for each result
- Displays query performance metrics

### Recent Searches
- Lists previous search queries with timestamps
- Shows result counts and apps searched
- Formatted for easy scanning

### Suggested Documents
- Displays recommended documents with reasons
- Shows source, access date, and suggestion rationale
- Includes direct links to documents

### Trending Documents
- Highlights popular documents with trend scores
- Shows trending queries and search counts
- Includes trend analytics

### Dynamic Suggestions
- Provides autocomplete suggestions
- Numbered list format for easy selection
- Shows suggestion count

## 🔒 Security Features

### Triple RBAC Enforcement
Every API request includes:
1. **account_ids**: Array of accessible accounts
2. **external_user_id**: User's external identifier
3. **user_email**: User's email address

### Request Structure Example:
```javascript
{
  // User query parameters
  "query": "financial report",
  "limit": 10,
  
  // Triple RBAC (automatically added)
  "account_ids": ["apn_XehedEz", "apn_Xehed1w", ...],
  "external_user_id": "686652ee4314417de20af851",
  "user_email": "ayush.enterprise.search@gmail.com"
}
```

## 🧪 Testing Examples

Try these queries in Slack:

### Search Queries
```
@YourBot search for quarterly reports
@YourBot find project documentation
@YourBot look for team meeting notes
```

### History & Suggestions
```
@YourBot show me recent searches
@YourBot what documents do you suggest?
@YourBot what's trending now?
```

### Autocomplete
```
@YourBot suggest api
@YourBot complete financial
@YourBot recommend project
```

## 🔧 Customization Options

### 1. Update User Context
Edit `RBAC_CONFIG` in `src/config/apis.js` for different users:
```javascript
const RBAC_CONFIG = {
  account_ids: ["your_account_ids"],
  external_user_id: "your_user_id", 
  user_email: "your_email@company.com"
};
```

### 2. Modify Query Patterns
Add new patterns in `QUERY_PATTERNS` array:
```javascript
{
  pattern: /your custom pattern/i,
  api: 'search',
  paramExtractor: (match) => ({ query: match[1] })
}
```

### 3. Customize Response Formatting
Edit methods in `src/utils/formatter.js`:
- `formatSearchResults()`
- `formatRecentSearches()`
- `formatSuggestedDocuments()`
- `formatTrendingDocuments()`
- `formatDynamicSuggestions()`

## 🚨 Troubleshooting

### Common Issues:

**Bot not understanding queries:**
- Check `QUERY_PATTERNS` in `src/config/apis.js`
- Add more specific patterns for your use cases

**API connection errors:**
- Verify `API_BASE_URL` in `.env`
- Check API key validity
- Ensure RBAC parameters are correct

**Empty responses:**
- Verify user has access to the specified accounts
- Check if external_user_id and user_email are correct
- Test with mock data first

### Debug Mode:
```bash
# Enable detailed logging
DEBUG=* npm run dev
```

## 📈 Production Deployment

### Environment Variables:
```env
# Required
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret
SLACK_APP_TOKEN=xapp-your-token
API_BASE_URL=https://qa-es-api.kroolo.com

# Optional
NODE_ENV=production
PORT=3000
```

### Health Check:
Your API should respond to `GET /health` for monitoring.

## 🎉 You're Ready!

Your Enterprise Search Slack bot is configured and ready to use! The bot will:

✅ **Understand natural language** queries about documents  
✅ **Enforce Triple RBAC** on every request  
✅ **Format responses beautifully** in Slack  
✅ **Handle all 5 API endpoints** seamlessly  
✅ **Work immediately** with mock data for testing  

Start with `npm run dev` and test in Slack! 🚀
