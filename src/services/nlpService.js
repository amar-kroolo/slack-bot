// Enhanced AI-Powered Natural Language Processing Service
// Now uses only Google Gemini for intelligent query processing and intent detection

const { GoogleGenerativeAI } = require('@google/generative-ai');

class NlpService {
  constructor() {
    // Initialize Gemini only
    this.initializeGemini();

    // Context memory for conversation continuity
    this.conversationContext = {
      lastQuery: null,
      lastAPI: null,
      userPreferences: {},
      sessionStartTime: Date.now()
    };
  }

  initializeGemini() {
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
    } else {
      this.gemini = null;
      console.error('❌ Gemini API key not set or invalid.');
    }
  }

  async parseQuery(query) {
    console.log('\n🧠 ===== NLP SERVICE PROCESSING (GEMINI ONLY) =====');
    console.log('📝 Input Query:', `"${query}"`);
    console.log('⏰ NLP Start Time:', new Date().toISOString());

    if (!this.geminiModel) {
      console.error('❌ Gemini model not initialized.');
      return {
        message: 'AI service unavailable. Please try again later.'
      };
    }

    // Build the system prompt
    const prompt = this.createGeminiPrompt(query);
    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = result.response;
      let text = response.text();
      // Clean up Gemini's response (remove markdown, etc.)
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error('❌ Failed to parse Gemini JSON:', text);
        return {
          message: 'Sorry, I could not understand your request. Please try rephrasing.'
        };
      }
      // If Gemini returns a message, treat as general/personal
      if (parsed.message) {
        return parsed;
      }
      // If Gemini returns an API call, update context and return
      if (parsed.api) {
        this.updateContext(query, parsed.api);
        return parsed;
      }
      // Fallback
      return {
        message: 'Sorry, I could not process your request.'
      };
    } catch (error) {
      console.error('❌ Gemini Error Details:', error);
      return {
        message: 'AI service error. Please try again later.'
      };
    }
  }

  createGeminiPrompt(userQuery) {
    return `You are an Enterprise Search API assistant. Your job is to analyze the user's query and determine if it is actionable (related to enterprise search) or general/personal (not actionable).\n\n1. If the query is actionable, select the most appropriate API to call from the list below, and extract the required parameters.\n2. If the query is general, personal, or not related to enterprise search (e.g., greetings, jokes, personal questions, weather, etc.), do NOT select any API. Instead, respond with: \"Sorry, I can't process personal or general queries. Please ask something related to enterprise search.\"\n\nAvailable APIs:\n- search: Search documents across all platforms (parameters: query, apps)\n- recent-searches: Get user's search history (parameters: limit)\n- suggested-documents: Get recommended documents (parameters: limit)\n- trending-documents: Get popular/trending documents (parameters: limit)\n- dynamic-suggestions: Get autocomplete suggestions (parameters: partial_query, limit)\n\nDefault apps for search: [\"google_drive\", \"slack\", \"dropbox\", \"jira\", \"zendesk\", \"document360\"]\n\nFor actionable queries, respond ONLY with valid JSON in this format (no markdown, no extra text):\n{\n  \"api\": \"api_name\",\n  \"parameters\": { \"param\": \"value\" },\n  \"confidence\": 0.95,\n  \"reasoning\": \"why this API was chosen\"\n}\n\nFor general/personal queries, respond ONLY with:\n{\n  \"message\": \"Sorry, I can't process personal or general queries. Please ask something related to enterprise search.\"\n}\n\nUser query: \"${userQuery}\"`;
  }

  updateContext(query, api) {
    this.conversationContext.lastQuery = query;
    this.conversationContext.lastAPI = api;
    console.log('💾 Context updated:', { query: query.substring(0, 30), api });
  }
}

module.exports = new NlpService();
