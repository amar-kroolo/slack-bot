const { API_ENDPOINTS, QUERY_PATTERNS } = require('../config/apis');
const apiService = require('../services/apiService');
const nlpService = require('../services/nlpService');
const pipedreamHandler = require('./pipedreamHandler');
const slackHandler = require('./slackHandler');
const connectToolsHandler = require('./connectToolsHandler');

class QueryHandler {
  async processQuery(query, userContext = null) {
    try {
      console.log('\n🚀 ===== STARTING QUERY PROCESSING =====');
      console.log('📝 Original Query from Slack:', `"${query}"`);
      console.log('👤 User Context:', userContext);
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('🔍 Query Length:', query.length, 'characters');

      // Extract slackUserId from userContext for backward compatibility
      const slackUserId = userContext?.slackUserId || userContext;

      // Check if this is a unified connect tools command (highest priority)
      const connectToolsCommand = connectToolsHandler.parseConnectToolsCommand(query);
      if (connectToolsCommand) {
        console.log('🛠️ Connect tools command detected:', connectToolsCommand.command);
        return await connectToolsHandler.handleCommand(connectToolsCommand, slackUserId, userContext);
      }

      // Check if this is a Pipedream-related command
      const pipedreamCommand = pipedreamHandler.parsePipedreamCommand(query);
      if (pipedreamCommand) {
        console.log('🔗 Pipedream command detected:', pipedreamCommand.command);
        return await this.handlePipedreamCommand(pipedreamCommand, slackUserId);
      }

      // Check if this is a Slack-related command
      const slackCommand = this.parseSlackCommand(query);
      if (slackCommand) {
        console.log('💬 Slack command detected:', slackCommand.command);
        return await this.handleSlackCommand(slackCommand, slackUserId);
      }

      // Step 1: Parse the natural language query with enhanced NLP
      console.log('\n📊 STEP 1: Starting Query Parsing...');
      const parsedQuery = await this.parseQuery(query);
      
      if (!parsedQuery) {
        console.log('❌ STEP 1 FAILED: Could not parse query');
        return {
          error: "I couldn't understand your query. Please try rephrasing it or use one of these examples:\n• get user data for user ID 123\n• show me the latest orders\n• what's the status of order 456"
        };
      }

      // Check if this is a general query response
      if (parsedQuery.message) {
        console.log('💬 STEP 1 RESULT: General query detected, providing helpful response');
        return this.createHelpfulGeneralResponse(query, userContext);
      }

      console.log('✅ STEP 1 SUCCESS: Query parsed successfully');
      console.log('🎯 Selected API:', parsedQuery.api);
      console.log('📋 Extracted Parameters:', JSON.stringify(parsedQuery.parameters, null, 2));
      console.log('📈 Confidence Score:', parsedQuery.confidence);
      console.log('🔧 Method Used:', parsedQuery.method);
      console.log('🤖 AI Provider:', parsedQuery.aiProvider || 'None');
      if (parsedQuery.reasoning) {
        console.log('💭 AI Reasoning:', parsedQuery.reasoning);
      }

      // Step 2: Validate the API endpoint exists
      console.log('\n🔍 STEP 2: Validating API endpoint...');
      const apiConfig = API_ENDPOINTS[parsedQuery.api];
      if (!apiConfig) {
        console.log('❌ STEP 2 FAILED: API endpoint not found:', parsedQuery.api);
        return {
          error: `API endpoint '${parsedQuery.api}' not found`
        };
      }
      console.log('✅ STEP 2 SUCCESS: API endpoint validated');

      // Step 3: Call the Enterprise Search API
      console.log('\n🌐 STEP 3: Calling Enterprise Search API...');
      console.log('📡 API Endpoint:', parsedQuery.api);
      console.log('📤 Request Parameters:', JSON.stringify(parsedQuery.parameters, null, 2));

      const apiStartTime = Date.now();
      const apiResponse = await apiService.callAPI(
        parsedQuery.api,
        parsedQuery.parameters,
        slackUserId
      );
      const apiDuration = Date.now() - apiStartTime;

      if (apiResponse.error) {
        console.log('❌ STEP 3 FAILED: API call failed');
        console.log('💥 API Error:', apiResponse.error);
        console.log('⏱️ API Call Duration:', apiDuration, 'ms');
        return {
          error: apiResponse.error
        };
      }

      console.log('✅ STEP 3 SUCCESS: API call completed');
      console.log('⏱️ API Call Duration:', apiDuration, 'ms');
      console.log('📊 API Response Status:', apiResponse.status || 'Success');

      // Log response summary
      if (apiResponse.data) {
        if (apiResponse.data.results) {
          console.log('📄 Results Found:', apiResponse.data.results.length);
        } else if (apiResponse.data.data) {
          console.log('📄 Data Items:', Array.isArray(apiResponse.data.data) ? apiResponse.data.data.length : 'Object');
        } else if (apiResponse.data.trending_documents) {
          console.log('📄 Trending Documents:', apiResponse.data.trending_documents.length);
        } else if (apiResponse.data.suggested_documents) {
          console.log('📄 Suggested Documents:', apiResponse.data.suggested_documents.length);
        }
      }

      // Step 4: Prepare final response
      console.log('\n🎉 STEP 4: Preparing final response...');
      const finalResponse = {
        data: apiResponse.data,
        apiUsed: parsedQuery.api,
        parameters: parsedQuery.parameters,
        confidence: parsedQuery.confidence,
        method: parsedQuery.method,
        aiProvider: parsedQuery.aiProvider,
        reasoning: parsedQuery.reasoning
      };

      console.log('✅ QUERY PROCESSING COMPLETE');
      console.log('🏁 Final Response Ready for Slack formatting');
      console.log('===== END QUERY PROCESSING =====\n');

      return finalResponse;

    } catch (error) {
      console.error('Error in processQuery:', error);
      return {
        error: `Failed to process query: ${error.message}`
      };
    }
  }

  async parseQuery(query) {
    console.log('🔍 PARSING PHASE: Starting query analysis...');
    console.log('📝 Query to parse:', `"${query}"`);

    // Phase 1: Try predefined patterns first (fastest)
    console.log('\n🎯 PHASE 1: Checking predefined patterns...');
    for (const [index, pattern] of QUERY_PATTERNS.entries()) {
      console.log(`   Trying pattern ${index + 1}:`, pattern.pattern);
      const match = query.match(pattern.pattern);
      if (match) {
        console.log('✅ PHASE 1 SUCCESS: Pattern matched!');
        console.log('🎯 Matched Pattern:', pattern.pattern);
        console.log('📊 Match Groups:', match);
        const result = {
          api: pattern.api,
          parameters: pattern.paramExtractor(match),
          confidence: 0.9,
          method: 'pattern_matching'
        };
        console.log('📋 Extracted Result:', JSON.stringify(result, null, 2));
        return result;
      }
    }
    console.log('❌ PHASE 1: No predefined patterns matched');

    // Phase 2: Try keyword matching
    console.log('\n🔍 PHASE 2: Trying keyword matching...');
    const keywordMatch = this.matchByKeywords(query);
    if (keywordMatch) {
      console.log('✅ PHASE 2 SUCCESS: Keywords matched!');
      console.log('📋 Keyword Match Result:', JSON.stringify(keywordMatch, null, 2));
      return keywordMatch;
    }
    console.log('❌ PHASE 2: No keywords matched');

    // Phase 3: Use enhanced NLP service (AI-powered)
    console.log('\n🧠 PHASE 3: Using AI-powered NLP service...');
    console.log('🤖 Delegating to NLP service for advanced processing');
    const nlpResult = await nlpService.parseQuery(query);

    if (nlpResult) {
      console.log('✅ PHASE 3 SUCCESS: NLP service returned result');
      console.log('📋 NLP Result:', JSON.stringify(nlpResult, null, 2));
    } else {
      console.log('❌ PHASE 3 FAILED: NLP service could not parse query');
    }

    return nlpResult;
  }

  // Create helpful response for general queries
  createHelpfulGeneralResponse(query, userContext = null) {
    console.log('🎯 Creating helpful response for general query:', query);

    const userName = userContext?.slackRealName || userContext?.slackName || 'there';

    return {
      response_type: 'ephemeral',
      text: `👋 Hi ${userName}! I'm your Enterprise Search Assistant`,
      attachments: [{
        color: 'good',
        title: '🔍 What I Can Help You With',
        text: 'I can help you search and find information across your connected tools:',
        fields: [
          {
            title: '📊 Search Commands',
            value: '• "search for project reports"\n• "find documents about marketing"\n• "show me files from last week"',
            short: true
          },
          {
            title: '📈 Analytics Commands',
            value: '• "show trending documents"\n• "what\'s popular today"\n• "get my recent searches"',
            short: true
          }
        ]
      }, {
        color: '#36a64f',
        title: '🛠️ Available Tools & APIs',
        text: 'I can search across these connected platforms:',
        fields: [
          {
            title: '☁️ Cloud Storage',
            value: '• Google Drive\n• Dropbox\n• SharePoint',
            short: true
          },
          {
            title: '💼 Business Tools',
            value: '• Jira\n• Confluence\n• Slack\n• Microsoft Teams',
            short: true
          },
          {
            title: '📚 Documentation',
            value: '• Document 360\n• Zendesk\n• Notion',
            short: true
          },
          {
            title: '🔧 Development',
            value: '• GitHub\n• Airtable\n• Custom APIs',
            short: true
          }
        ]
      }, {
        color: '#4A154B',
        title: '🚀 Quick Actions',
        text: 'Try these commands to get started:',
        actions: [
          {
            type: 'button',
            text: '🔗 Connect Tools',
            value: 'connect_tools_action',
            style: 'primary'
          }
        ],
        fields: [
          {
            title: '🔗 Connect Your Tools',
            value: 'Type: `@SmartBot connect tools`',
            short: true
          },
          {
            title: '🔍 Search Example',
            value: 'Type: `@SmartBot search for quarterly reports`',
            short: true
          }
        ]
      }, {
        color: 'warning',
        title: '💡 Pro Tips',
        text: 'To get the best results:',
        fields: [
          {
            title: '✅ Good Queries',
            value: '• "search for budget documents"\n• "find emails about project X"\n• "show trending files this week"',
            short: false
          },
          {
            title: '❌ I Can\'t Help With',
            value: '• Personal questions\n• Weather or news\n• General conversation\n• Non-work related queries',
            short: false
          }
        ],
        footer: `User: ${userContext?.slackEmail || 'Unknown'} | Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`
      }]
    };
  }

  matchByKeywords(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    let bestMatch = null;
    let maxScore = 0;

    for (const [apiName, config] of Object.entries(API_ENDPOINTS)) {
      let score = 0;
      
      // Check how many keywords match
      for (const keyword of config.keywords) {
        if (words.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      // Boost score if API name is mentioned
      if (words.includes(apiName.toLowerCase())) {
        score += 2;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = {
          api: apiName,
          parameters: this.extractParameters(query, config.parameters),
          confidence: Math.min(score / config.keywords.length, 1.0)
        };
      }
    }

    return maxScore > 0 ? bestMatch : null;
  }

  extractParameters(query, parameterNames) {
    const parameters = {};

    // Extract common parameter patterns
    const patterns = {
      id: /(?:id|ID)\s+(\w+)/,
      userId: /user\s+(?:id|ID)?\s*(\w+)/,
      orderId: /order\s+(?:id|ID)?\s*(\w+)/,
      productId: /product\s+(?:id|ID)?\s*(\w+)/,
      status: /status\s+(\w+)/,
      email: /(\w+@\w+\.\w+)/,
      limit: /(?:latest|last|recent)\s+(\d+)|(\d+)\s+(?:latest|last|recent)/,
      // Enhanced search query extraction
      query: /(?:search|find|look|searh|serach)\s+(?:for\s+)?(.+)/i
    };

    for (const [paramName, pattern] of Object.entries(patterns)) {
      if (parameterNames.includes(paramName)) {
        const match = query.match(pattern);
        if (match) {
          parameters[paramName] = match[1] || match[2];
        }
      }
    }

    // Special handling for search queries
    if (parameterNames.includes('query') && !parameters.query) {
      // If no pattern matched, use the whole query as search term
      const cleanQuery = query.trim();
      if (cleanQuery.length > 0) {
        parameters.query = cleanQuery;
      }
    }

    // Set default limit for list queries
    if (parameterNames.includes('limit') && !parameters.limit) {
      if (query.toLowerCase().includes('latest') || query.toLowerCase().includes('recent')) {
        parameters.limit = 10;
      }
    }

    // Add default apps for search queries
    if (parameterNames.includes('apps') && !parameters.apps) {
      parameters.apps = ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360'];
    }

    return parameters;
  }

  // Handle Pipedream-specific commands
  async handlePipedreamCommand(pipedreamCommand, slackUserId) {
    try {
      console.log('🔗 Processing Pipedream command:', pipedreamCommand.command);

      switch (pipedreamCommand.command) {
        case 'connect':
          return await pipedreamHandler.handleConnectCommand(slackUserId);

        case 'disconnect':
          return await pipedreamHandler.handleDisconnectCommand(slackUserId);

        case 'status':
          return await pipedreamHandler.handleStatusCommand(slackUserId);

        case 'tools':
          return await pipedreamHandler.handleToolsCommand(slackUserId);

        default:
          return {
            error: `Unknown Pipedream command: ${pipedreamCommand.command}`
          };
      }

    } catch (error) {
      console.error('❌ Error handling Pipedream command:', error.message);
      return {
        error: `Pipedream command error: ${error.message}`
      };
    }
  }
  // Parse Slack-specific commands
  parseSlackCommand(query) {
    const normalizedQuery = query.toLowerCase().trim();

    // Slack connection commands
    if (normalizedQuery.includes('connect slack') || normalizedQuery.includes('slack connect')) {
      return { command: 'connect', type: 'slack' };
    }

    if (normalizedQuery.includes('slack status') || normalizedQuery.includes('status slack')) {
      return { command: 'status', type: 'slack' };
    }

    if (normalizedQuery.includes('disconnect slack') || normalizedQuery.includes('slack disconnect')) {
      return { command: 'disconnect', type: 'slack' };
    }

    if (normalizedQuery.includes('slack apps') || normalizedQuery.includes('manage slack')) {
      return { command: 'manage', type: 'slack' };
    }

    return null;
  }

  // Handle Slack-specific commands
  async handleSlackCommand(slackCommand, slackUserId) {
    try {
      console.log('💬 Processing Slack command:', slackCommand.command);

      switch (slackCommand.command) {
        case 'connect':
          return await slackHandler.handleConnectCommand(slackUserId);

        case 'status':
          return await slackHandler.handleStatusCommand(slackUserId);

        case 'disconnect':
          return await slackHandler.handleDisconnectCommand(slackUserId);

        case 'manage':
          return await slackHandler.handleManageAppsCommand(slackUserId);

        default:
          console.log('❌ Unknown Slack command:', slackCommand.command);
          return {
            error: `Unknown Slack command: ${slackCommand.command}`
          };
      }
    } catch (error) {
      console.error('❌ Error handling Slack command:', error.message);
      return {
        error: `Error processing Slack command: ${error.message}`
      };
    }
  }
}

module.exports = new QueryHandler();
