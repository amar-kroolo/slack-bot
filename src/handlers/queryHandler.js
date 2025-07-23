const { API_ENDPOINTS, QUERY_PATTERNS } = require('../config/apis');
const apiService = require('../services/apiService');
const nlpService = require('../services/nlpService');
const pipedreamHandler = require('./pipedreamHandler');

class QueryHandler {
  async processQuery(query, slackUserId = null) {
    try {
      console.log('\n🚀 ===== STARTING QUERY PROCESSING =====');
      console.log('📝 Original Query from Slack:', `"${query}"`);
      console.log('👤 Slack User ID:', slackUserId || 'Anonymous');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('🔍 Query Length:', query.length, 'characters');

      // Check if this is a Pipedream-related command
      const pipedreamCommand = pipedreamHandler.parsePipedreamCommand(query);
      if (pipedreamCommand) {
        console.log('🔗 Pipedream command detected:', pipedreamCommand.command);
        return await this.handlePipedreamCommand(pipedreamCommand, slackUserId);
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
}

module.exports = new QueryHandler();
