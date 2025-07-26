// Enhanced AI-Powered Natural Language Processing Service with OpenAI Only
const OpenAI = require('openai');

class NlpService {
  constructor() {
    this.openaiClient = null;
    this.activeProvider = null;
    
    this.initializeOpenAI();

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

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        this.activeProvider = 'openai';
        console.log('🤖 OpenAI initialized successfully with powerful model');
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
    return `You are an AI Assistant. Your primary role is to help users find information across various enterprise platforms including Google Drive, Slack, Dropbox, JIRA, Zendesk, and Document360.

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

  // Get the most powerful OpenAI model available
  getPowerfulModel() {
    // Order by preference: most powerful first
    const powerfulModels = [
      'gpt-4o',           // Most powerful multimodal
      'gpt-4-turbo',      // Latest GPT-4 variant
      'gpt-4',            // Standard GPT-4
      'gpt-3.5-turbo'     // Fallback
    ];
    
    // Return environment variable if set, otherwise use most powerful
    return process.env.AI_MODEL_OPENAI || powerfulModels[0];
  }

  // Clean JSON response from potential markdown wrapping
  cleanJsonResponse(text) {
    if (!text) return text;
    
    // Remove various markdown code fence patterns
    return text
      .replace(/```json/g, '')
       .replace(/``````/g, '')    // Removed invalid/unterminated regex
      .replace(/`{3,}/g, '')        // Remove multiple backticks
      .trim();
  }

  async parseQuery(query) {
    console.log('\n🧠 ===== INTENT ENGINE NLP SERVICE PROCESSING (OPENAI ONLY) =====');
    console.log('📝 Input Query:', `"${query}"`);
    console.log('🤖 Active Provider:', this.activeProvider || 'None');
    console.log('🔥 Model:', this.getPowerfulModel());
    console.log('⏰ NLP Start Time:', new Date().toISOString());

    // Check if OpenAI is available
    if (!this.openaiClient) {
      console.error('❌ OpenAI client not initialized.');
      return this.buildMessageResponse('AI service unavailable. Please try again later.');
    }

    try {
      const response = await this.processWithOpenAI(query);
      return response;
    } catch (error) {
      console.error('❌ OpenAI processing failed:', error);
      return this.buildMessageResponse('AI service error. Please try again later.');
    }
  }

  async processWithOpenAI(query) {
    const contextualPrompt = this.createContextualPrompt(query);
    
    const completion = await this.openaiClient.chat.completions.create({
      model: this.getPowerfulModel(),
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
      max_tokens: 1000,
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
          provider: this.activeProvider,
          model: this.getPowerfulModel()
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
      provider: this.activeProvider || 'fallback',
      model: this.getPowerfulModel()
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

      const completion = await this.openaiClient.chat.completions.create({
        model: this.getPowerfulModel(),
        messages: [{ role: 'user', content: contextPrompt }],
        temperature: 0.7,
        max_tokens: 200
      });
      
      const rawText = completion.choices[0].message.content.trim();
      const cleanedText = this.cleanJsonResponse(rawText);
      
      try {
        const parsed = JSON.parse(cleanedText);
        return this.buildMessageResponse(parsed.message || "Hello! I'm here to help you search and find information across your enterprise platforms.");
      } catch (err) {
        return this.buildMessageResponse(
          "Hello! I'm here to help you search and find information across your enterprise platforms. How can I assist you with finding documents, checking search history, or getting recommendations?"
        );
      }
    } catch (error) {
      return this.buildMessageResponse(
        "Hello! I'm your AI Assistant. I can help you find documents, view your search history, get recommendations, and more. What would you like to search for?"
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

      const completion = await this.openaiClient.chat.completions.create({
        model: this.getPowerfulModel(),
        messages: [{ role: 'user', content: clarificationPrompt }],
        temperature: 0.7,
        max_tokens: 200
      });
      
      const rawText = completion.choices[0].message.content.trim();
      const cleanedText = this.cleanJsonResponse(rawText);
      
      try {
        const parsed = JSON.parse(cleanedText);
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
      provider: this.activeProvider,
      model: this.getPowerfulModel()
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
      activeProvider: this.activeProvider,
      model: this.getPowerfulModel()
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

  // Method to get current provider status
  getProviderStatus() {
    return {
      openaiAvailable: !!this.openaiClient,
      activeProvider: this.activeProvider,
      model: this.getPowerfulModel(),
      powerfulModelEnabled: true
    };
  }
}

module.exports = new NlpService();
