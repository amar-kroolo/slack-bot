// Enhanced AI-Powered Natural Language Processing Service
// Supports OpenAI GPT and Google Gemini for intelligent query processing

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class NlpService {
  constructor() {
    // Initialize AI services
    this.initializeAI();

    // Initialize spell correction dictionary
    this.spellCorrections = {
      // Common typos for search terms
      'serach': 'search',
      'seach': 'search',
      'searh': 'search',
      'serch': 'search',
      'searhc': 'search',
      'saerch': 'search',
      'find': 'search',
      'lok': 'look',
      'loook': 'look',
      'documnets': 'documents',
      'documnet': 'document',
      'docuemnts': 'documents',
      'sugested': 'suggested',
      'sugest': 'suggest',
      'recomend': 'recommend',
      'recomendations': 'recommendations',
      'recnt': 'recent',
      'resent': 'recent',
      'trendig': 'trending',
      'populer': 'popular',
      'analitics': 'analytics',
      'analitycs': 'analytics'
    };

    // Context memory for conversation continuity
    this.conversationContext = {
      lastQuery: null,
      lastAPI: null,
      userPreferences: {},
      sessionStartTime: Date.now()
    };
  }

  async parseQuery(query) {
    console.log('\n🧠 ===== NLP SERVICE PROCESSING =====');
    console.log('📝 Input Query:', `"${query}"`);
    console.log('⏰ NLP Start Time:', new Date().toISOString());

    // Step 1: Clean and correct the query
    console.log('\n🔧 NLP STEP 1: Spell correction...');
    const correctedQuery = this.correctSpelling(query);
    if (correctedQuery !== query) {
      console.log('✏️ Spell correction applied:', query, '→', correctedQuery);
    } else {
      console.log('✅ No spelling corrections needed');
    }

    // Step 2: Try AI-powered NLP (OpenAI or Gemini)
    console.log('\n🤖 NLP STEP 2: AI-powered processing...');
    console.log('🎯 AI Provider configured:', this.aiProvider);
    console.log('🔍 Checking AI availability...');

    const aiResult = await this.parseWithAI(correctedQuery);
    if (aiResult) {
      console.log('✅ NLP STEP 2 SUCCESS: AI processing completed');
      console.log('🤖 AI Provider used:', aiResult.aiProvider);
      console.log('📊 AI Result:', JSON.stringify(aiResult, null, 2));
      this.updateContext(correctedQuery, aiResult.api);
      return aiResult;
    }
    console.log('❌ NLP STEP 2: AI processing failed or unavailable');

    // Step 3: Advanced pattern matching with context
    console.log('\n🎯 NLP STEP 3: Advanced pattern matching...');
    const patternResult = this.advancedPatternMatching(correctedQuery);
    if (patternResult) {
      console.log('✅ NLP STEP 3 SUCCESS: Advanced pattern matched');
      console.log('📊 Pattern Result:', JSON.stringify(patternResult, null, 2));
      this.updateContext(correctedQuery, patternResult.api);
      return patternResult;
    }
    console.log('❌ NLP STEP 3: No advanced patterns matched');

    // Step 4: Intent-based API selection
    console.log('\n🎯 NLP STEP 4: Intent-based selection...');
    const intentResult = this.intentBasedSelection(correctedQuery);
    if (intentResult) {
      console.log('✅ NLP STEP 4 SUCCESS: Intent detected');
      console.log('📊 Intent Result:', JSON.stringify(intentResult, null, 2));
      this.updateContext(correctedQuery, intentResult.api);
      return intentResult;
    }
    console.log('❌ NLP STEP 4: No clear intent detected');

    // Step 5: Context-aware fallback
    console.log('\n🔄 NLP STEP 5: Context-aware fallback...');
    const fallbackResult = this.contextAwareFallback(correctedQuery);
    console.log('✅ NLP STEP 5: Fallback result generated');
    console.log('📊 Fallback Result:', JSON.stringify(fallbackResult, null, 2));
    console.log('===== NLP SERVICE COMPLETE =====\n');

    return fallbackResult;
  }

  correctSpelling(query) {
    let corrected = query;

    // Apply spell corrections
    for (const [typo, correction] of Object.entries(this.spellCorrections)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      corrected = corrected.replace(regex, correction);
    }

    return corrected;
  }

  initializeAI() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key-here') {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('🤖 OpenAI initialized successfully');
      } catch (error) {
        console.error('❌ OpenAI initialization failed:', error.message);
        this.openai = null;
      }
    }

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiModel = this.gemini.getGenerativeModel({
          model: process.env.AI_MODEL_GEMINI || 'gemini-pro'
        });
        console.log('🧠 Gemini initialized successfully');
      } catch (error) {
        console.error('❌ Gemini initialization failed:', error.message);
        this.gemini = null;
      }
    }

    // Set AI provider preference
    this.aiProvider = process.env.AI_PROVIDER || 'openai';
    console.log(`🎯 AI Provider set to: ${this.aiProvider}`);
  }

  advancedPatternMatching(query) {
    const queryLower = query.toLowerCase();

    // Enhanced patterns for Enterprise Search APIs
    const patterns = [
      // Search patterns
      {
        patterns: [/(?:search|find|look)\s+(?:for\s+)?(.+)/i, /(.+)\s+search/i],
        api: 'search',
        confidence: 0.9,
        extractor: (match) => ({
          query: match[1]?.trim() || query,
          apps: ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360']
        })
      },

      // Recent searches patterns
      {
        patterns: [
          /(?:show|get|display)\s+(?:me\s+)?(?:my\s+)?recent\s+(?:searches?|history)/i,
          /(?:search\s+)?history/i,
          /what\s+(?:have\s+)?i\s+searched/i
        ],
        api: 'recent-searches',
        confidence: 0.95,
        extractor: () => ({ limit: 10 })
      },

      // Suggested documents patterns
      {
        patterns: [
          /(?:show|get|give)\s+(?:me\s+)?(?:some\s+)?(?:suggested?|recommended?)\s+(?:documents?|docs?|files?)/i,
          /(?:what\s+)?(?:documents?|docs?|files?)\s+(?:do\s+you\s+)?(?:suggest|recommend)/i,
          /recommendations?/i
        ],
        api: 'suggested-documents',
        confidence: 0.95,
        extractor: () => ({ limit: 10 })
      },

      // Trending documents patterns
      {
        patterns: [
          /(?:show|get|display)\s+(?:me\s+)?(?:the\s+)?trending\s+(?:documents?|docs?|files?)/i,
          /(?:what'?s\s+)?(?:popular|hot|trending)\s+(?:now|today|recently)?/i,
          /(?:discover|find)\s+trending/i
        ],
        api: 'trending-documents',
        confidence: 0.95,
        extractor: () => ({ limit: 10 })
      },

      // Dynamic suggestions patterns
      {
        patterns: [
          /(?:suggest|complete|autocomplete)\s+(.+)/i,
          /(?:help\s+me\s+)?(?:find|search)\s+(?:something\s+)?(?:like|about)\s+(.+)/i
        ],
        api: 'dynamic-suggestions',
        confidence: 0.85,
        extractor: (match) => ({
          partial_query: match[1]?.trim() || query.split(' ').pop(),
          limit: 10
        })
      }
    ];

    // Try each pattern
    for (const patternGroup of patterns) {
      for (const pattern of patternGroup.patterns) {
        const match = queryLower.match(pattern);
        if (match) {
          console.log('✅ Pattern matched:', pattern, 'for API:', patternGroup.api);
          return {
            api: patternGroup.api,
            parameters: patternGroup.extractor(match),
            confidence: patternGroup.confidence,
            method: 'pattern_matching'
          };
        }
      }
    }

    return null;
  }

  intentBasedSelection(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);

    // Intent scoring system
    const intentScores = {
      'search': 0,
      'recent-searches': 0,
      'suggested-documents': 0,
      'trending-documents': 0,
      'dynamic-suggestions': 0
    };

    // Keywords that boost specific API scores
    const apiKeywords = {
      'search': ['search', 'find', 'look', 'query', 'locate', 'discover'],
      'recent-searches': ['recent', 'history', 'past', 'previous', 'last', 'earlier'],
      'suggested-documents': ['suggest', 'recommend', 'propose', 'advice', 'tip'],
      'trending-documents': ['trending', 'popular', 'hot', 'viral', 'buzz', 'top'],
      'dynamic-suggestions': ['complete', 'autocomplete', 'help', 'assist', 'guide']
    };

    // Score each API based on keyword presence
    for (const [api, keywords] of Object.entries(apiKeywords)) {
      for (const word of words) {
        for (const keyword of keywords) {
          if (word.includes(keyword) || keyword.includes(word)) {
            intentScores[api] += 1;
          }
        }
      }
    }

    // Find the highest scoring API
    const bestMatch = Object.entries(intentScores)
      .sort(([,a], [,b]) => b - a)[0];

    if (bestMatch[1] > 0) {
      console.log('🎯 Intent-based selection:', bestMatch[0], 'score:', bestMatch[1]);

      const api = bestMatch[0];
      let parameters = {};

      // Extract parameters based on API type
      switch (api) {
        case 'search':
          parameters = {
            query: this.extractSearchQuery(query),
            apps: ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360']
          };
          break;
        case 'dynamic-suggestions':
          parameters = {
            partial_query: this.extractPartialQuery(query),
            limit: 10
          };
          break;
        default:
          parameters = { limit: 10 };
      }

      return {
        api: api,
        parameters: parameters,
        confidence: Math.min(bestMatch[1] * 0.2, 0.8),
        method: 'intent_based'
      };
    }

    return null;
  }

  contextAwareFallback(query) {
    console.log('🔄 Using context-aware fallback');

    // If we have recent context, try to infer intent
    if (this.conversationContext.lastAPI) {
      console.log('📝 Previous API context:', this.conversationContext.lastAPI);

      // If query is very short, might be a follow-up
      if (query.trim().split(' ').length <= 2) {
        return {
          api: this.conversationContext.lastAPI,
          parameters: { query: query.trim(), limit: 10 },
          confidence: 0.6,
          method: 'context_fallback'
        };
      }
    }

    // Default to search if we can't determine intent
    return {
      api: 'search',
      parameters: {
        query: query.trim(),
        apps: ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360']
      },
      confidence: 0.5,
      method: 'default_search'
    };
  }

  updateContext(query, api) {
    this.conversationContext.lastQuery = query;
    this.conversationContext.lastAPI = api;
    console.log('💾 Context updated:', { query: query.substring(0, 30), api });
  }

  extractSearchQuery(query) {
    // Remove common command words to get the actual search term
    const cleanQuery = query
      .replace(/^(?:search|find|look)\s+(?:for\s+)?/i, '')
      .replace(/\s+(?:please|pls)$/i, '')
      .trim();

    return cleanQuery || query;
  }

  extractPartialQuery(query) {
    // For autocomplete, usually the last word or phrase
    const words = query.trim().split(/\s+/);
    if (words.length > 2) {
      return words.slice(-2).join(' '); // Last 2 words
    }
    return words[words.length - 1] || query;
  }

  async parseWithAI(query) {
    try {
      console.log('🤖 AI Processing Details:');
      console.log('   Provider Config:', this.aiProvider);
      console.log('   OpenAI Available:', !!this.openai);
      console.log('   Gemini Available:', !!this.gemini);

      // Choose AI provider based on configuration
      if (this.aiProvider === 'both') {
        console.log('🔄 Using BOTH providers - will compare results');
        // Try both and use the one with higher confidence
        const [openaiResult, geminiResult] = await Promise.allSettled([
          this.parseWithOpenAI(query),
          this.parseWithGemini(query)
        ]);

        const openaiData = openaiResult.status === 'fulfilled' ? openaiResult.value : null;
        const geminiData = geminiResult.status === 'fulfilled' ? geminiResult.value : null;

        console.log('📊 OpenAI Result:', openaiData ? 'Success' : 'Failed');
        console.log('📊 Gemini Result:', geminiData ? 'Success' : 'Failed');

        if (openaiData && geminiData) {
          const winner = openaiData.confidence >= geminiData.confidence ? 'OpenAI' : 'Gemini';
          console.log('🏆 Winner:', winner, 'with confidence:', Math.max(openaiData.confidence, geminiData.confidence));
          return openaiData.confidence >= geminiData.confidence ? openaiData : geminiData;
        }
        return openaiData || geminiData;
      } else if (this.aiProvider === 'gemini' && this.gemini) {
        console.log('🧠 Using Gemini AI provider');
        return await this.parseWithGemini(query);
      } else if (this.aiProvider === 'openai' && this.openai) {
        console.log('🤖 Using OpenAI provider');
        return await this.parseWithOpenAI(query);
      }

      console.log('⚠️ No AI provider available, using fallback');
      return null;

    } catch (error) {
      console.error('❌ AI parsing error:', error.message);
      return null;
    }
  }

  async parseWithOpenAI(query) {
    if (!this.openai) {
      console.log('⚠️ OpenAI not initialized');
      return null;
    }

    try {
      console.log('🤖 OPENAI PROCESSING:');
      console.log('   Model:', process.env.AI_MODEL_OPENAI || 'gpt-3.5-turbo');
      console.log('   Query:', `"${query}"`);

      const prompt = this.createAIPrompt(query);
      console.log('📝 Generated Prompt Length:', prompt.length, 'characters');

      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL_OPENAI || 'gpt-3.5-turbo',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });
      const duration = Date.now() - startTime;

      console.log('⏱️ OpenAI Response Time:', duration, 'ms');
      console.log('📊 OpenAI Usage:', response.usage);
      console.log('🔍 Raw OpenAI Response:', response.choices[0].message.content);

      const result = JSON.parse(response.choices[0].message.content);
      console.log('✅ Parsed OpenAI Result:', result);

      return {
        ...result,
        method: 'openai_gpt',
        aiProvider: 'openai'
      };

    } catch (error) {
      console.error('❌ OpenAI Error Details:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: error.status
      });
      return null;
    }
  }

  async parseWithGemini(query) {
    if (!this.gemini) {
      console.log('⚠️ Gemini not initialized');
      return null;
    }

    try {
      console.log('🧠 GEMINI PROCESSING:');
      console.log('   Model:', process.env.AI_MODEL_GEMINI || 'gemini-pro');
      console.log('   Query:', `"${query}"`);

      const prompt = this.createAIPrompt(query);
      console.log('📝 Generated Prompt Length:', prompt.length, 'characters');

      const startTime = Date.now();
      const result = await this.geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const duration = Date.now() - startTime;

      console.log('⏱️ Gemini Response Time:', duration, 'ms');
      console.log('🔍 Raw Gemini Response:', text);

      // Clean up the response (Gemini sometimes adds markdown formatting)
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🧹 Cleaned Response:', cleanText);

      const parsedResult = JSON.parse(cleanText);
      console.log('✅ Parsed Gemini Result:', parsedResult);

      return {
        ...parsedResult,
        method: 'gemini_pro',
        aiProvider: 'gemini'
      };

    } catch (error) {
      console.error('❌ Gemini Error Details:', {
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  createAIPrompt(query) {
    return `You are an Enterprise Search API assistant. Analyze this user query and determine:

1. Which API endpoint to call
2. What parameters to extract
3. Confidence level (0-1)

Available APIs:
- search: Search documents across all platforms (needs: query, apps)
- recent-searches: Get user's search history (needs: limit)
- suggested-documents: Get recommended documents (needs: limit)
- trending-documents: Get popular/trending documents (needs: limit)
- dynamic-suggestions: Get autocomplete suggestions (needs: partial_query, limit)

Default apps for search: ["google_drive", "slack", "dropbox", "jira", "zendesk", "document360"]

User query: "${query}"

IMPORTANT: Respond with valid JSON only, no markdown formatting:
{
  "api": "api_name",
  "parameters": {"param": "value"},
  "confidence": 0.95,
  "reasoning": "why this API was chosen"
}`;
  }
  
  extractBasicParameters(query) {
    const parameters = {};
    
    // Extract IDs (numbers or alphanumeric strings)
    const idMatch = query.match(/(?:id|ID)\s+([a-zA-Z0-9]+)/);
    if (idMatch) {
      parameters.id = idMatch[1];
    }
    
    // Extract user IDs
    const userIdMatch = query.match(/user\s+(?:id\s+)?([a-zA-Z0-9]+)/i);
    if (userIdMatch) {
      parameters.userId = userIdMatch[1];
    }
    
    // Extract order IDs
    const orderIdMatch = query.match(/order\s+(?:id\s+)?([a-zA-Z0-9]+)/i);
    if (orderIdMatch) {
      parameters.orderId = orderIdMatch[1];
    }
    
    // Extract product IDs
    const productIdMatch = query.match(/product\s+(?:id\s+)?([a-zA-Z0-9]+)/i);
    if (productIdMatch) {
      parameters.productId = productIdMatch[1];
    }
    
    // Extract email addresses
    const emailMatch = query.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      parameters.email = emailMatch[1];
    }
    
    // Extract numbers (could be limits, quantities, etc.)
    const numberMatch = query.match(/(\d+)/);
    if (numberMatch) {
      const number = parseInt(numberMatch[1]);
      
      // If query mentions "latest", "recent", "last", treat as limit
      if (/latest|recent|last/i.test(query)) {
        parameters.limit = number;
      } else {
        // Otherwise, it might be an ID
        if (!parameters.id && !parameters.userId && !parameters.orderId && !parameters.productId) {
          parameters.id = numberMatch[1];
        }
      }
    }
    
    // Extract status keywords
    const statusKeywords = ['pending', 'completed', 'cancelled', 'processing', 'shipped', 'delivered'];
    for (const status of statusKeywords) {
      if (query.toLowerCase().includes(status)) {
        parameters.status = status;
        break;
      }
    }
    
    return parameters;
  }
  
  // Enhanced NLP using OpenAI (optional - requires OPENAI_API_KEY)
  async parseQueryWithOpenAI(query) {
    if (!process.env.OPENAI_API_KEY) {
      return this.parseQuery(query); // Fallback to basic NLP
    }
    
    try {
      // This would require the OpenAI SDK
      // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // const prompt = `
      // Parse this natural language query and extract:
      // 1. The API to call (users, orders, products, analytics)
      // 2. Parameters to pass to the API
      // 3. Confidence level (0-1)
      
      // Available APIs:
      // - users: Get user information (parameters: userId, email)
      // - orders: Get order information (parameters: orderId, status, userId)
      // - products: Get product information (parameters: productId, category, name)
      // - analytics: Get analytics data (parameters: metric, startDate, endDate)
      
      // Query: "${query}"
      
      // Respond with JSON only:
      // {
      //   "api": "api_name",
      //   "parameters": {"param1": "value1"},
      //   "confidence": 0.95
      // }
      // `;
      
      // const response = await openai.chat.completions.create({
      //   model: "gpt-3.5-turbo",
      //   messages: [{ role: "user", content: prompt }],
      //   temperature: 0.1
      // });
      
      // return JSON.parse(response.choices[0].message.content);
      
      // For now, return basic NLP result
      return this.parseQuery(query);
      
    } catch (error) {
      console.error('OpenAI NLP error:', error);
      return this.parseQuery(query); // Fallback to basic NLP
    }
  }
}

module.exports = new NlpService();
