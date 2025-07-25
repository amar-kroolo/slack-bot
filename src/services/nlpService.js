// Enhanced AI-Powered Natural Language Processing Service with System Instructions and OpenAI Fallback
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class NlpService {
  constructor() {
    this.geminiModel = null;
    this.openaiClient = null;
    this.activeProvider = null;
    
    this.initializeModels();

    this.conversationContext = {
      lastQuery: null,
      lastAPI: null,
      lastIntent: null,
      intentHistory: [],
      userPreferences: {},
      sessionStartTime: Date.now()
    };

    this.intentCategories = {
      search: { api: 'search', confidenceThreshold: 0.8 },
      'recent-searches': { api: 'recent-searches', confidenceThreshold: 0.85 },
      'suggested-documents': { api: 'suggested-documents', confidenceThreshold: 0.8 },
      'trending-documents': { api: 'trending-documents', confidenceThreshold: 0.8 },
      'dynamic-suggestions': { api: 'dynamic-suggestions', confidenceThreshold: 0.9 },
    };
  }

  initializeModels() {
    // Try to initialize Gemini first
    this.initializeGemini();
    
    // If Gemini fails, initialize OpenAI as fallback
    if (!this.geminiModel) {
      this.initializeOpenAI();
    }
  }

  initializeGemini() {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiModel = gemini.getGenerativeModel({
          model: process.env.AI_MODEL_GEMINI || 'gemini-pro',
          systemInstruction: this.getSystemInstruction()
        });
        this.activeProvider = 'gemini';
        console.log('🧠 Gemini initialized successfully with system instructions');
      } catch (e) {
        console.error('❌ Gemini initialization failed:', e.message);
        this.geminiModel = null;
      }
    } else {
      console.log('⚠️ Gemini API key not set or invalid, trying OpenAI fallback...');
      this.geminiModel = null;
    }
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        this.activeProvider = 'openai';
        console.log('🤖 OpenAI initialized successfully as fallback');
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
    return `You are an AI Assitant. Your primary role is to help users find information across various enterprise platforms including Google Drive, Slack, Dropbox, JIRA, Zendesk, and Document360.

CORE RESPONSIBILITIES:
1. Analyze user queries to determine if they relate to enterprise search functionality
2. For enterprise search queries, classify the intent and extract parameters
3. For non-enterprise queries, provide helpful, contextual responses that guide users back to enterprise search capabilities

AVAILABLE ENTERPRISE SEARCH INTENTS:
- search: Find documents across platforms
- recent-searches: View search history  
- suggested-documents: Get recommended content
- trending-documents: See popular documents
- dynamic-suggestions: Get autocomplete suggestions

RESPONSE GUIDELINES:
- For enterprise search queries: Respond with structured JSON containing intent, confidence, parameters, and reasoning
- For greetings/casual conversation: Be friendly and mention your enterprise search capabilities
- For unrelated queries: Politely redirect to enterprise search while being helpful
- Always maintain a professional, helpful tone
- Use context from previous interactions when relevant

CRITICAL JSON FORMATTING RULES:
- NEVER use markdown code fences (\`\`\`)
- NEVER wrap JSON in code blocks
- Always respond with pure, clean JSON only
- No explanatory text before or after the JSON
- Ensure JSON is properly formatted and parseable

CONTEXT AWARENESS:
- Remember previous queries in the conversation
- Adapt responses based on user patterns
- Provide suggestions based on conversation history`;
  }

  async parseQuery(query) {
    console.log('\n🧠 ===== INTENT ENGINE NLP SERVICE PROCESSING =====');
    console.log('📝 Input Query:', `"${query}"`);
    console.log('🤖 Active Provider:', this.activeProvider || 'None');
    console.log('⏰ NLP Start Time:', new Date().toISOString());

    // Check if any model is available
    if (!this.geminiModel && !this.openaiClient) {
      console.error('❌ No AI models initialized.');
      return this.buildMessageResponse('AI service unavailable. Please try again later.');
    }

    try {
      let response;
      
      // Try Gemini first if available
      if (this.geminiModel) {
        try {
          response = await this.processWithGemini(query);
        } catch (error) {
          console.error('❌ Gemini processing failed:', error.message);
          console.log('🔄 Falling back to OpenAI...');
          
          // Initialize OpenAI if not already done
          if (!this.openaiClient) {
            this.initializeOpenAI();
          }
          
          if (this.openaiClient) {
            response = await this.processWithOpenAI(query);
          } else {
            throw new Error('Both Gemini and OpenAI failed');
          }
        }
      } 
      // Use OpenAI if Gemini is not available
      else if (this.openaiClient) {
        response = await this.processWithOpenAI(query);
      }

      return response;

    } catch (error) {
      console.error('❌ All AI providers failed:', error);
      return this.buildMessageResponse('AI service error. Please try again later.');
    }
  }

  async processWithGemini(query) {
    const contextualPrompt = this.createContextualPrompt(query);
    const result = await this.geminiModel.generateContent(contextualPrompt);
    let text = result.response.text().trim();

    return this.parseAIResponse(text, query);
  }

  async processWithOpenAI(query) {
    const contextualPrompt = this.createContextualPrompt(query);
    
    const completion = await this.openaiClient.chat.completions.create({
      model: process.env.AI_MODEL_OPENAI || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: this.getSystemInstruction()
        },
        {
          role: 'user',
          content: contextualPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const text = completion.choices[0].message.content.trim();
    return this.parseAIResponse(text, query);
  }

  parseAIResponse(text, query) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse AI JSON:', text);
      return this.buildMessageResponse(
        "Hello! I'm your AI Assistant. I can help you find documents, view your search history, get recommendations, and more. What would you like to search for?"
      );
    }

    // Handle enterprise search intents
    if (parsed.intent && this.intentCategories[parsed.intent]) {
      const intentInfo = this.intentCategories[parsed.intent];
      if (parsed.confidence >= intentInfo.confidenceThreshold) {
        const parameters = parsed.parameters || {};
        this.updateContext(query, intentInfo.api, parsed.intent);
        return {
          api: intentInfo.api,
          parameters,
          confidence: parsed.confidence,
          intent: parsed.intent,
          reasoning: parsed.reasoning || 'Intent detected successfully',
          type: 'actionable',
          provider: this.activeProvider
        };
      } else {
        return this.buildMessageResponse(
          `I think you might be asking about ${parsed.intent}, but I'm not completely sure. Could you please rephrase your request? For example, you can ask me to 'search for project reports' or 'show my recent searches'.`
        );
      }
    }

    // Handle general conversation or unknown intents
    if (parsed.message) {
      return this.buildMessageResponse(parsed.message);
    }

    // Final fallback
    return this.buildMessageResponse(
      "Hello! I'm your AI Assistant. I can help you find documents across Google Drive, Slack, Dropbox, JIRA, Zendesk, and Document360. How can I assist you today?"
    );
  }

  buildMessageResponse(messageText) {
    return {
      api: '_none',
      parameters: null,
      confidence: 1.0,
      intent: 'GENERAL_MESSAGE',
      message: messageText,
      type: 'message',
      provider: this.activeProvider || 'fallback'
    };
  }

  createContextualPrompt(query) {
    const intentNames = Object.keys(this.intentCategories).join(', ');
    const conversationHistory = this.getConversationSummary();
    
    return `Analyze this user query in the context of our enterprise search system.

CONVERSATION CONTEXT:
${conversationHistory}

USER QUERY: "${query}"

INSTRUCTIONS:
1. If this is an enterprise search query, respond with PURE JSON (no code fences, no markdown):
{
  "intent": "one of: ${intentNames}",
  "confidence": 0.0-1.0,
  "parameters": {"key": "value"},
  "reasoning": "explanation"
}

2. If this is NOT an enterprise search query (greetings, general questions, etc.), respond with PURE JSON (no code fences, no markdown):
{
  "message": "Your helpful, contextual response that acknowledges the query and guides toward enterprise search capabilities"
}

IMPORTANT: Return ONLY the JSON object. No explanatory text, no code fences, no markdown formatting. Just pure, clean JSON.`;
  }

  async generateContextualResponse(query) {
    try {
      const contextPrompt = `The user asked: "${query}"

This doesn't seem to be related to enterprise search. Generate a helpful, contextual response that:
1. Acknowledges their query appropriately
2. Gently guides them toward enterprise search capabilities
3. Is friendly and professional
4. Takes into account our conversation context: ${this.getConversationSummary()}

Respond with PURE JSON only (no code fences, no markdown): {"message": "your response"}`;

      let text;
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(contextPrompt);
        text = result.response.text().trim();
      } else if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: process.env.AI_MODEL_OPENAI || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: contextPrompt }],
          temperature: 0.7,
          max_tokens: 200
        });
        text = completion.choices[0].message.content.trim();
      }
      
      try {
        const parsed = JSON.parse(text);
        return this.buildMessageResponse(parsed.message || "Hello! I'm here to help you search and find information across your enterprise platforms.");
      } catch (err) {
        return this.buildMessageResponse(
          "Hello! I'm here to help you search and find information across your enterprise platforms. How can I assist you with finding documents, checking search history, or getting recommendations?"
        );
      }
    } catch (error) {
      return this.buildMessageResponse(
        "Hello! I'm your enterprise search assistant. I can help you find documents, view your search history, get recommendations, and more. What would you like to search for?"
      );
    }
  }

  async generateClarificationResponse(query, parsedResult) {
    try {
      const clarificationPrompt = `The user asked: "${query}"
I detected intent "${parsedResult.intent}" but with low confidence (${parsedResult.confidence}).

Generate a helpful clarification response that:
1. Acknowledges what I think they might want
2. Asks for clarification
3. Provides examples of how to phrase their request better
4. Maintains a helpful tone

Respond with PURE JSON only (no code fences, no markdown): {"message": "your clarification request"}`;

      let text;
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(clarificationPrompt);
        text = result.response.text().trim();
      } else if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: process.env.AI_MODEL_OPENAI || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: clarificationPrompt }],
          temperature: 0.7,
          max_tokens: 200
        });
        text = completion.choices[0].message.content.trim();
      }
      
      try {
        const parsed = JSON.parse(text);
        return this.buildMessageResponse(parsed.message || "I'm not quite sure what you're looking for. Could you please rephrase your request?");
      } catch (err) {
        return this.buildMessageResponse(
          "I'm not quite sure what you're looking for. Could you please rephrase your request? For example, you can ask me to 'search for project reports' or 'show my recent searches'."
        );
      }
    } catch (error) {
      return this.buildMessageResponse(
        "Could you please clarify what you're looking for? I can help you search documents, view history, get suggestions, or find trending content."
      );
    }
  }

  getConversationSummary() {
    const recentHistory = this.conversationContext.intentHistory.slice(-3);
    if (recentHistory.length === 0) {
      return "This is the start of our conversation.";
    }
    
    const summary = recentHistory.map(item => 
      `User asked: "${item.query.substring(0, 50)}..." (Intent: ${item.intent})`
    ).join('\n');
    
    return `Recent conversation:\n${summary}`;
  }

  updateContext(query, api, intent) {
    this.conversationContext.lastQuery = query;
    this.conversationContext.lastAPI = api;
    this.conversationContext.lastIntent = intent;
    this.conversationContext.intentHistory.push({ 
      query, 
      intent, 
      timestamp: Date.now() 
    });
    
    if (this.conversationContext.intentHistory.length > 10) {
      this.conversationContext.intentHistory = this.conversationContext.intentHistory.slice(-10);
    }
    
    this.conversationContext.userPreferences[intent] = 
      (this.conversationContext.userPreferences[intent] || 0) + 1;
    
    console.log('💾 Context updated:', { 
      query: query.substring(0, 30), 
      api, 
      intent,
      provider: this.activeProvider
    });
  }

  getAnalytics() {
    return {
      totalInteractions: this.conversationContext.intentHistory.length,
      sessionDuration: Date.now() - this.conversationContext.sessionStartTime,
      topIntents: Object.entries(this.conversationContext.userPreferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3),
      lastActivity: this.conversationContext.intentHistory.slice(-1)[0] || null,
      activeProvider: this.activeProvider
    };
  }

  resetContext() {
    this.conversationContext = {
      lastQuery: null,
      lastAPI: null,
      lastIntent: null,
      intentHistory: [],
      userPreferences: {},
      sessionStartTime: Date.now()
    };
    console.log('🔄 Conversation context reset');
  }

  // NEW: Method to get current provider status
  getProviderStatus() {
    return {
      geminiAvailable: !!this.geminiModel,
      openaiAvailable: !!this.openaiClient,
      activeProvider: this.activeProvider,
      fallbackEnabled: !!(this.geminiModel && this.openaiClient)
    };
  }
}

module.exports = new NlpService();