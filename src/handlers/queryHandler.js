// Simplified Query Handler - Unified Intent Engine Approach

const apiService = require('../services/apiService');
const nlpService = require('../services/nlpService');
const pipedreamHandler = require('./pipedreamHandler');
const slackHandler = require('./slackHandler');
const connectToolsHandler = require('./connectToolsHandler');

class QueryHandler {
  formatLegacyApiResponse(apiResponse, apiType, parameters, duration, nlpResult) {
  // Handle API errors
  if (apiResponse.error) {
    console.log('❌ API call failed');
    console.log('💥 API Error:', apiResponse.error);
    console.log('⏱️ API Call Duration:', duration, 'ms');
    return {
      error: apiResponse.error
    };
  }

  console.log('✅ API call completed');
  console.log('⏱️ API Call Duration:', duration, 'ms');
  console.log('📊 API Response Status:', apiResponse.status || 'Success');

  // Log response summary based on API type
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

  // Step 4: Prepare final response in legacy format
  console.log('\n🎉 Preparing final response in legacy format...');
  const finalResponse = {
    data: apiResponse.data,
    apiUsed: apiType,
    parameters: parameters,
    confidence: nlpResult.confidence,
    method: nlpResult.provider === 'openai' ? 'ai_powered' : 'pattern_matching',
    aiProvider: nlpResult.provider || 'OpenAI NLP',
    reasoning: nlpResult.reasoning
  };

  console.log('✅ QUERY PROCESSING COMPLETE');
  console.log('🏁 Final Response Ready for Slack formatting');
  
  return finalResponse;
}

  async processQuery(query, userContext = null) {
    try {
      console.log('\n🚀 ===== UNIFIED INTENT ENGINE QUERY PROCESSING =====');
      console.log('📝 Original Query:', `"${query}"`);
      console.log('👤 User Context:', userContext ? 'Available' : 'None');
      console.log('⏰ Timestamp:', new Date().toISOString());

      // Extract slackUserId for backward compatibility
      const slackUserId = userContext?.slackUserId || userContext;

      // Step 1: Parse query through unified NLP service
      console.log('\n🧠 STEP 1: Processing through Intent Engine...');
      const nlpResult = await nlpService.parseQuery(query);
      
      if (!nlpResult || !nlpResult.action) {
        console.log('❌ STEP 1 FAILED: Intent Engine could not process query');
        return {
          error: "I couldn't understand your request. Please try rephrasing it or ask me to 'connect gmail', 'search for documents', or 'show my connections'."
        };
      }

      console.log('✅ STEP 1 SUCCESS: Intent Engine processed query');
      console.log('🎯 Intent:', nlpResult.intent);
      console.log('🏷️ Domain:', nlpResult.domain || 'None');
      console.log('⚡ Action:', nlpResult.action);
      console.log('📊 Confidence:', nlpResult.confidence);
      console.log('📋 Parameters:', JSON.stringify(nlpResult.parameters, null, 2));

      // Step 2: Handle general conversation
      if (nlpResult.intent === 'general') {
        console.log('💬 STEP 2: Handling general conversation');
        return {
          message: nlpResult.parameters.message,
          type: 'conversational',
          confidence: nlpResult.confidence,
          intent: nlpResult.intent,
          provider: nlpResult.provider
        };
      }

      // Step 3: Dispatch to appropriate handler based on action
      console.log('\n⚡ STEP 2: Dispatching to action handler...');
      console.log('🎯 Action to execute:', nlpResult.action);

      switch (nlpResult.action) {
       case 'createConnectToken':
        if (!nlpResult.domain) {
          // Nothing recognised – fall back to the UI card
          return await connectToolsHandler.handleConnectToolsCommand(
            slackUserId,
            userContext?.slackEmail
          );
        }
        return await connectToolsHandler.handleDirectToolConnection(
          slackUserId,
          nlpResult.domain,
          userContext?.slackEmail
        );


        case 'removeUserConnection':
          console.log('🗑️ Executing: Remove User Connection');
          return await connectToolsHandler.handleDisconnectTool(
            slackUserId,
            nlpResult.domain,
            userContext?.slackEmail
          );

        case 'getStatus':
          console.log('📊 Executing: Get Status');
          return await this.handleStatusRequest(nlpResult, slackUserId, userContext);

          case 'handleConnectToolsCommand':          // “connect tools”
            console.log('🔗 Showing list of connectable tools');
            return await connectToolsHandler.handleConnectToolsCommand(
            slackUserId,
            userContext?.slackEmail
        );


        // In the switch statement for API-related actions, modify them to return the legacy format:

        case 'callSearchApi':
          console.log('🔍 Executing: Search API Call');
          const searchStartTime = Date.now();
          const searchResponse = await apiService.callAPI(
            'search',
            nlpResult.parameters,
            slackUserId,
            userContext?.slackEmail
          );
          const searchDuration = Date.now() - searchStartTime;
          
          return this.formatLegacyApiResponse(searchResponse, 'search', nlpResult.parameters, searchDuration, nlpResult);

        case 'getRecentSearches':
          console.log('📋 Executing: Get Recent Searches');
          const recentStartTime = Date.now();
          const recentResponse = await apiService.callAPI(
            'recent-searches',
            nlpResult.parameters,
            slackUserId,
            userContext?.slackEmail
          );
          const recentDuration = Date.now() - recentStartTime;
          
          return this.formatLegacyApiResponse(recentResponse, 'recent-searches', nlpResult.parameters, recentDuration, nlpResult);

        case 'getSuggestedDocuments':
          console.log('💡 Executing: Get Suggested Documents');
          const suggestedStartTime = Date.now();
          const suggestedResponse = await apiService.callAPI(
            'suggested-documents',
            nlpResult.parameters,
            slackUserId,
            userContext?.slackEmail
          );
          const suggestedDuration = Date.now() - suggestedStartTime;
          
          return this.formatLegacyApiResponse(suggestedResponse, 'suggested-documents', nlpResult.parameters, suggestedDuration, nlpResult);

        case 'getTrendingDocuments':
          console.log('📈 Executing: Get Trending Documents');
          const trendingStartTime = Date.now();
          const trendingResponse = await apiService.callAPI(
            'trending-documents',
            nlpResult.parameters,
            slackUserId,
            userContext?.slackEmail
          );
          const trendingDuration = Date.now() - trendingStartTime;
          
          return this.formatLegacyApiResponse(trendingResponse, 'trending-documents', nlpResult.parameters, trendingDuration, nlpResult);

        case 'getDynamicSuggestions':
          console.log('🔮 Executing: Get Dynamic Suggestions');
          const dynamicStartTime = Date.now();
          const dynamicResponse = await apiService.callAPI(
            'dynamic-suggestions',
            nlpResult.parameters,
            slackUserId,
            userContext?.slackEmail
          );
          const dynamicDuration = Date.now() - dynamicStartTime;
          
          return this.formatLegacyApiResponse(dynamicResponse, 'dynamic-suggestions', nlpResult.parameters, dynamicDuration, nlpResult);


        default:
          console.log('❌ Unknown action:', nlpResult.action);
          return {
            error: `Unsupported action: ${nlpResult.action}. Please try rephrasing your request.`
          };
      }

    } catch (error) {
      console.error('❌ Error in unified query processing:', error);
      return {
        error: `Failed to process query: ${error.message}`
      };
    }
  }

  // Add this method to your QueryHandler class in src/handlers/queryHandler.js

async processSlashCommand(commandName, commandText, userContext) {
    try {
        console.log(`🔧 Processing slash command: /${commandName} ${commandText}`);
        
        // Direct command handling without NLP
        switch (commandName) {
            case 'connect':
                if (!commandText.trim()) {
                    // Show all tools
                    const connectToolsHandler = require('./connectToolsHandler');
                    return await connectToolsHandler.handleConnectToolsCommand(
                        userContext.slackUserId,
                        userContext.slackEmail
                    );
                } else {
                    // Connect specific tool
                    const tool = commandText.trim().toLowerCase();
                    const connectToolsHandler = require('./connectToolsHandler');
                    return await connectToolsHandler.handleDirectToolConnection(
                        userContext.slackUserId,
                        tool,
                        userContext.slackEmail
                    );
                }

            case 'search':
                const apiService = require('../services/apiService');
                const searchParams = {
                    query: commandText.trim(),
                    apps: ['gmail', 'google_drive', 'slack', 'dropbox', 'jira', 'zendesk']
                };
                
                return await apiService.callAPI(
                    'search',
                    searchParams,
                    userContext.slackUserId,
                    userContext.slackEmail
                );

            case 'status':
                const tool = commandText.trim().toLowerCase();
                if (tool === 'pipedream') {
                    const pipedreamHandler = require('./pipedreamHandler');
                    return await pipedreamHandler.handleStatusCommand(userContext.slackUserId);
                } else if (tool === 'slack') {
                    const slackHandler = require('./slackHandler');
                    return await slackHandler.handleStatusCommand(userContext.slackUserId);
                } else {
                    // All connections status or specific tool
                    const connectToolsHandler = require('./connectToolsHandler');
                    return await connectToolsHandler.handleShowConnections(userContext.slackUserId);
                }

            case 'disconnect':
                const toolToDisconnect = commandText.trim().toLowerCase();
                const connectToolsHandler = require('./connectToolsHandler');
                return await connectToolsHandler.handleDisconnectTool(
                    userContext.slackUserId,
                    toolToDisconnect,
                    userContext.slackEmail
                );

            default:
                return { error: `Unknown command: /${commandName}` };
        }
        
    } catch (error) {
        console.error('❌ Error processing slash command:', error);
        return { error: `Failed to process /${commandName}: ${error.message}` };
    }
}

  async handleMultipleToolConnect(tools = [], slackUserId, slackEmail) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return { error: 'No tools recognised to connect.' };
  }

  const results = [];
  for (const tool of tools) {
    try {
      const res = await connectToolsHandler.handleDirectToolConnection(
        slackUserId,
        tool,
        slackEmail
      );
      results.push({ tool, status: 'ok', res });
    } catch (e) {
      console.error(`❌ Failed to connect ${tool}:`, e);
      results.push({ tool, status: 'error', message: e.message });
    }
  }
  return { type: 'multiConnectResult', results };
}

  // Handle status requests with domain-specific logic
  async handleStatusRequest(nlpResult, slackUserId, userContext) {
    const domain = nlpResult.domain;
    
    try {
      if (domain === 'pipedream') {
        console.log('📊 Getting Pipedream status');
        return await pipedreamHandler.handleStatusCommand(slackUserId);
      } else if (domain === 'slack') {
        console.log('📊 Getting Slack status');
        return await slackHandler.handleStatusCommand(slackUserId);
      } else {
        console.log('📊 Getting general connection status');
        return await connectToolsHandler.handleShowConnections(slackUserId);
      }
    } catch (error) {
      console.error('❌ Error handling status request:', error);
      return {
        error: `Error getting status: ${error.message}`
      };
    }
  }

  // Simplified method for getting service info
  getServiceInfo() {
    return {
      version: '2.0.0',
      approach: 'unified_intent_engine',
      nlpProvider: nlpService.getProviderStatus(),
      features: [
        'Direct query to NLP service',
        'Intent-based action mapping',
        'Unified parameter extraction',
        'Tool connection management',
        'Enterprise search integration'
      ],
      supportedIntents: [
        'connect', 'disconnect', 'status', 'search',
        'recent_searches', 'suggested_documents', 
        'trending_documents', 'dynamic_suggestions', 'general'
      ],
      supportedTools: [
        'gmail', 'google_drive', 'slack', 'pipedream', 'dropbox',
        'jira', 'confluence', 'microsoft_teams', 'microsoft_sharepoint',
        'document_360', 'github', 'notion', 'airtable', 'zendesk'
      ]
    };
  }
}

module.exports = new QueryHandler();
