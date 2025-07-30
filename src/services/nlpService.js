// Enhanced AI-Powered Natural Language Processing Service - Unified Intent Engine

const OpenAI = require('openai');

class NlpService {
  constructor() {
    this.openaiClient = null;
    this.activeProvider = null;
    this.initializeOpenAI();
    
    // Intent to action mapping
    this.intentActionMap = {
      connect: 'createConnectToken',
      disconnect: 'removeUserConnection', 
      status: 'getStatus',
      search: 'callSearchApi',
      recent_searches: 'getRecentSearches',
      suggested_documents: 'getSuggestedDocuments',
      trending_documents: 'getTrendingDocuments',
      dynamic_suggestions: 'getDynamicSuggestions',
      connect_tools: 'handleConnectToolsCommand',   // <-- new
    
      general: 'generalResponse'
    };

    // Domain mappings for tools
    this.toolDomains = [
      'gmail', 'google_drive', 'slack', 'pipedream', 'dropbox', 'jira', 
      'confluence', 'microsoft_teams', 'microsoft_sharepoint', 'document_360',
      'github', 'notion', 'airtable', 'zendesk'
    ];
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        this.activeProvider = 'openai';
        console.log('🤖 OpenAI initialized successfully for intent engine');
      } catch (e) {
        console.error('❌ OpenAI initialization failed:', e.message);
        this.openaiClient = null;
      }
    } else {
      console.error('❌ OpenAI API key not set or invalid.');
      this.openaiClient = null;
    }
  }

  getSystemInstruction() {
    const toolList = this.toolDomains.join(', ');
    
    return `You are a powerful Intent Engine for enterprise search and tool connection management.

CORE FUNCTION: Analyze user queries and return structured JSON with intent, domain, parameters, and action.

AVAILABLE INTENTS:
- connect: User wants to connect a tool (e.g., "connect to gmail", "connect google drive")
- connect_tools: user wants to see a list / UI card of all available tools (Example → "connect tools")
- disconnect: User wants to disconnect a tool (e.g., "disconnect jira", "remove slack connection")
- status: User wants connection status (e.g., "show my connections", "pipedream status")
- search: User wants to search documents (e.g., "find project reports", "search for contracts")
- recent_searches: User wants search history (e.g., "show recent searches", "my search history")
- suggested_documents: User wants recommendations (e.g., "suggest documents", "recommended files")
- trending_documents: User wants popular content (e.g., "trending documents", "what's popular")
- dynamic_suggestions: User wants autocomplete (e.g., "suggest completions for 'project'")
- general: Casual conversation, greetings, or unrelated queries

AVAILABLE DOMAINS (TOOLS):
${toolList}

RESPONSE FORMAT - Always return clean JSON (no markdown, no code fences):
{
  "intent": "one of the intents above",
  "domain": "tool name or null",
  "parameters": {"key": "value"},
  "action": "method name to call",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

ACTION MAPPING:
- connect → createConnectToken
- disconnect → removeUserConnection
- status → getStatus
- search → callSearchApi
- recent_searches → getRecentSearches
- suggested_documents → getSuggestedDocuments
- trending_documents → getTrendingDocuments
- dynamic_suggestions → getDynamicSuggestions
- general → generalResponse

PARAMETER EXTRACTION RULES:
- For search: extract "query", "apps" (array), "limit" (number)
- For connect/disconnect: extract "tool" (domain name)
- For suggestions: extract "partial_query", "limit"
- For general: extract "message" (your response)

EXAMPLES:
"connect to gmail" → {"intent": "connect", "domain": "gmail", "parameters": {"tool": "gmail"}, "action": "createConnectToken", "confidence": 0.95}
"search for project reports" → {"intent": "search", "domain": null, "parameters": {"query": "project reports", "apps": ["google_drive", "slack", "dropbox"]}, "action": "callSearchApi", "confidence": 0.9}
"hello" → {"intent": "general", "domain": null, "parameters": {"message": "Hello! I can help you connect tools and search documents. What would you like to do?( or any relavant response in casual, friendly tone )"}, "action": "generalResponse", "confidence": 1.0}
"connect tools" → {
  "intent": "connect_tools",
  "domain": null,
  "parameters": {},
  "action": "handleConnectToolsCommand",
  "confidence": 0.95
}
"connect to jira and slack" → {"intent": "general", "domain": null, "parameters": {"message": "please connect one tool at a time"}, "action": "generalResponse", "confidence": 1.0}

CRITICAL: Return ONLY the JSON object. No explanatory text, no code fences, no markdown formatting.`;
  }

  getPowerfulModel() {
    const powerfulModels = [
      'gpt-4o',
      'gpt-4-turbo', 
      'gpt-4',
      'gpt-3.5-turbo'
    ];
    return process.env.AI_MODEL_OPENAI || powerfulModels[0];
  }

  cleanJsonResponse(text) {
    if (!text) return text;
    return text
      .replace(/```/g,'')
      .replace(/```json/g, '')
      .replace(/`{3,}/g, '')
      .trim();
  }

  async parseQuery(query) {
    console.log('\n🧠 ===== UNIFIED INTENT ENGINE PROCESSING =====');
    console.log('📝 Input Query:', `"${query}"`);
    console.log('🤖 Active Provider:', this.activeProvider || 'None');
    console.log('🔥 Model:', this.getPowerfulModel());

    if (!this.openaiClient) {
      console.error('❌ OpenAI client not initialized.');
      return this.buildFallbackResponse(query);
    }

    try {
      const response = await this.processWithOpenAI(query);
      return response;
    } catch (error) {
      console.error('❌ OpenAI processing failed:', error);
      return this.buildFallbackResponse(query);
    }
  }

  async processWithOpenAI(query) {
    const prompt = this.createUnifiedPrompt(query);
    
    const completion = await this.openaiClient.chat.completions.create({
      model: this.getPowerfulModel(),
      messages: [
        {
          role: 'system',
          content: this.getSystemInstruction()
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const rawText = completion.choices[0].message.content.trim();
    const cleanedText = this.cleanJsonResponse(rawText);
    
    console.log('🔧 Raw AI Response:', rawText.substring(0, 100) + '...');
    console.log('✨ Cleaned Response:', cleanedText.substring(0, 100) + '...');
    
    return this.parseAIResponse(cleanedText, query);
  }

  parseAIResponse(text, query) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse AI JSON:', text);
      return this.buildFallbackResponse(query);
    }

    // Validate required fields
    if (!parsed.intent || !parsed.action) {
      console.error('❌ Missing required fields in AI response');
      return this.buildFallbackResponse(query);
    }

    // Ensure action matches intent
    const expectedAction = this.intentActionMap[parsed.intent];
    if (expectedAction && parsed.action !== expectedAction) {
      console.warn('⚠️ Correcting action mapping');
      parsed.action = expectedAction;
    }

    // Validate confidence
    if (!parsed.confidence || parsed.confidence < 0 || parsed.confidence > 1) {
      parsed.confidence = 0.7; // Default confidence
    }

    console.log('✅ Intent Engine Result:', {
      intent: parsed.intent,
      domain: parsed.domain,
      action: parsed.action,
      confidence: parsed.confidence
    });

    return {
      intent: parsed.intent,
      domain: parsed.domain,
      parameters: parsed.parameters || {},
      action: parsed.action,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || 'Intent detected successfully',
      type: 'actionable',
      provider: this.activeProvider,
      model: this.getPowerfulModel()
    };
  }

  createUnifiedPrompt(query) {
    return `Analyze this user query for the intent engine:

USER QUERY: "${query}"

INSTRUCTIONS:
1. Determine the primary intent (connect, disconnect, status, search, etc.)
2. Extract the domain/tool if mentioned (gmail, google_drive, slack, etc.)
3. Extract relevant parameters based on the intent
4. Assign the correct action method name
5. Provide confidence score (0.0-1.0)

Return ONLY the JSON object. No code fences, no markdown, no explanatory text.`;
  }

  buildFallbackResponse(query) {
    // Simple keyword-based fallback for critical intents
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('connect')) {
      const tool = this.extractToolFromQuery(queryLower);
      return {
        intent: 'connect',
        domain: tool,
        parameters: { tool: tool },
        action: 'createConnectToken',
        confidence: 0.6,
        reasoning: 'Fallback pattern matching',
        type: 'actionable',
        provider: 'fallback'
      };
    }

    if (queryLower.includes('search') || queryLower.includes('find')) {
      const searchQuery = this.extractSearchQuery(query);
      return {
        intent: 'search',
        domain: null,
        parameters: { 
          query: searchQuery,
          apps: ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360']
        },
        action: 'callSearchApi',
        confidence: 0.6,
        reasoning: 'Fallback pattern matching',
        type: 'actionable',
        provider: 'fallback'
      };
    }

    // General response fallback
    return {
      intent: 'general',
      domain: null,
      parameters: { 
        message: "Hello! I'm your AI Assistant. I can help you connect tools like Gmail, Google Drive, Slack, and search documents across your platforms. What would you like to do?"
      },
      action: 'generalResponse',
      confidence: 1.0,
      reasoning: 'Fallback general response',
      type: 'message',
      provider: 'fallback'
    };
  }

  extractToolFromQuery(queryLower) {
    for (const tool of this.toolDomains) {
      if (queryLower.includes(tool.replace('_', ' ')) || queryLower.includes(tool)) {
        return tool;
      }
    }
    return null;
  }

  extractSearchQuery(query) {
    const searchPatterns = [
      /(?:search|find|look)\s+(?:for\s+)?(.+)/i,
      /(.+)/ // fallback to entire query
    ];

    for (const pattern of searchPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return query.trim();
  }

  // Get current provider status
  getProviderStatus() {
    return {
      openaiAvailable: !!this.openaiClient,
      activeProvider: this.activeProvider,
      model: this.getPowerfulModel(),
      intentEngine: true
    };
  }
}

module.exports = new NlpService();
