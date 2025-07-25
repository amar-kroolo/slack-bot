const axios = require('axios');
const { API_ENDPOINTS, RBAC_CONFIG, DEFAULT_APPS } = require('../config/apis');
const { getMockData } = require('../utils/testData');
const pipedreamService = require('./pipedreamService');

// Ensure dotenv is loaded
require('dotenv').config();

class ApiService {
  constructor() {
    // Debug environment variables
    console.log('🔍 Environment check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   API_BASE_URL from env:', process.env.API_BASE_URL);
    console.log('   All env keys containing API:', Object.keys(process.env).filter(key => key.includes('API')));

    this.baseURL = process.env.API_BASE_URL;
    console.log('🔧 API Service initialized with baseURL:', this.baseURL);
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Slack-API-Query-Bot/1.0'
      }
    });

    // No authorization headers needed - RBAC is handled in request body

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async callAPI(apiName, parameters = {}, slackUserId = null, slackEmail = null) {
    try {
      console.log('\n🌐 ===== API SERVICE CALL =====');
      console.log('📡 API Endpoint:', apiName);
      console.log('⏰ API Call Start:', new Date().toISOString());

      const apiConfig = API_ENDPOINTS[apiName];

      if (!apiConfig) {
        console.log('❌ API Configuration Error: Unknown endpoint');
        return {
          error: `Unknown API: ${apiName}`
        };
      }

      console.log('✅ API Configuration found');
      console.log('🔧 HTTP Method:', apiConfig.method);
      console.log('🔗 Endpoint:', apiConfig.endpoint);
      console.log('🔐 Requires Auth:', apiConfig.requiresAuth);
      console.log('📤 Input Parameters:', JSON.stringify(parameters, null, 2));

     

      console.log(`🌐 Calling REAL API: ${this.baseURL}${apiConfig.endpoint}`);

      // Build the request with Enterprise Search API structure
      console.log('\n🔧 Building Request Configuration...');
      const requestConfig = {
        method: apiConfig.method.toLowerCase(),
        url: apiConfig.endpoint
      };
      console.log('📋 Base Request Config:', requestConfig);

      // For Enterprise Search API, all requests are POST with RBAC in body
      if (apiConfig.requiresAuth) {
        console.log('🔐 Applying Dynamic RBAC Security...');

        // Get dynamic credentials with enhanced fallback strategy
        let dynamicCredentials;
        try {
          console.log('🎯 Attempting to get dynamic credentials...');
          dynamicCredentials = await pipedreamService.getDynamicCredentials(slackUserId, slackEmail);

          console.log('👤 User Credentials Retrieved:', {
            dynamic: dynamicCredentials.dynamic,
            email: dynamicCredentials.user_email,
            userId: dynamicCredentials.external_user_id,
            accountCount: dynamicCredentials.account_ids.length,
            totalAccounts: dynamicCredentials.total_accounts || 'N/A',
            authSource: dynamicCredentials.auth_source,
            emailSource: dynamicCredentials.email_source,
            externalUserIdSource: dynamicCredentials.external_user_id_source,
            tokensExtracted: dynamicCredentials.auth_tokens?.extracted_tokens || 0,
            fallbackReason: dynamicCredentials.fallback_reason || 'none'
          });

          // Log authentication quality
          if (dynamicCredentials.dynamic) {
            console.log('✅ AUTHENTICATION QUALITY: Dynamic credentials successfully obtained');
            console.log('   🔐 Auth Source:', dynamicCredentials.auth_source);
            console.log('   📧 Email Source:', dynamicCredentials.email_source);
            console.log('   🆔 User ID Source:', dynamicCredentials.external_user_id_source);
          } else {
            console.log('⚠️ AUTHENTICATION QUALITY: Using static fallback credentials');
            console.log('   ⚠️ Fallback Reason:', dynamicCredentials.fallback_reason);
            console.log('   💡 Recommendation: User should connect their Pipedream account');
          }

        } catch (credentialError) {
          console.error('❌ CRITICAL: Failed to get any credentials:', credentialError.message);
          console.log('🚨 EMERGENCY FALLBACK: Using hardcoded static credentials');

          // Emergency fallback to prevent complete failure
          dynamicCredentials = {
            external_user_id: "686652ee4314417de20af851",
            user_email: slackEmail || "ayush.enterprise.search@gmail.com",
            account_ids: [
              "apn_XehedEz", "apn_Xehed1w", "apn_yghjwOb",
              "apn_7rhaEpm", "apn_x7hrxmn", "apn_arhpXvr"
            ],
            dynamic: false,
            auth_source: 'emergency_fallback',
            email_source: slackEmail ? 'slack_emergency' : 'static_emergency',
            external_user_id_source: 'static_emergency',
            fallback_reason: 'credential_service_failure',
            error: credentialError.message
          };
        }

        const requestBody = {
          account_ids: dynamicCredentials.account_ids,
          external_user_id: dynamicCredentials.external_user_id,
          user_email: dynamicCredentials.user_email,
          ...this.cleanParameters(parameters)
        };

        // Add dynamic connected apps for search queries
        if (apiName === 'search' && !requestBody.apps) {
          console.log('📱 Getting user\'s connected apps for search query');
          try {
            const connectedApps = await pipedreamService.getConnectedAppsForSearch(dynamicCredentials.external_user_id);
            requestBody.apps = connectedApps;
            console.log('🔗 Using connected apps:', connectedApps);
            console.log('📊 Total apps in search:', connectedApps.length);
          } catch (error) {
            console.error('⚠️ Failed to get connected apps, using default:', error.message);
            requestBody.apps = ["google_drive", "slack", "dropbox", "jira", "zendesk", "document360"];
          }
        }

        console.log('📤 Complete Request Body:');
        console.log(JSON.stringify(requestBody, null, 2));
        requestConfig.data = requestBody;
      } else {
        // Handle parameters based on HTTP method for non-RBAC endpoints
        if (apiConfig.method.toLowerCase() === 'get') {
          requestConfig.params = this.cleanParameters(parameters);
        } else {
          requestConfig.data = this.cleanParameters(parameters);
        }
      }

      // Handle URL path parameters (e.g., /api/users/{userId})
      if (requestConfig.url.includes('{') && requestConfig.url.includes('}')) {
        requestConfig.url = this.replacePathParameters(requestConfig.url, parameters);
      }

      console.log('\n📋 Final Request Config:');
      console.log(JSON.stringify(requestConfig, null, 2));

      // Make the API call
      console.log('\n🚀 Sending HTTP Request...');
      const requestStartTime = Date.now();
      const response = await this.client(requestConfig);
      const requestDuration = Date.now() - requestStartTime;

      // Log the real API response
      console.log('✅ HTTP Response Received!');
      console.log('⏱️ Request Duration:', requestDuration, 'ms');
      console.log('📊 HTTP Status:', response.status, response.statusText);
      console.log('📏 Response Size:', JSON.stringify(response.data).length, 'bytes');

      // Detailed response analysis
      console.log('\n📄 RESPONSE ANALYSIS:');
      if (response.data.status) {
        console.log('   API Status:', response.data.status);
      }

      if (response.data.results) {
        console.log('   Results Found:', response.data.results.length);
        if (response.data.results.length > 0) {
          const integrationTypes = [...new Set(response.data.results.map(r => r.integration_type))];
          console.log('   Integration Types:', integrationTypes);
        }
      } else if (response.data.data) {
        const dataLength = Array.isArray(response.data.data) ? response.data.data.length : 'Object';
        console.log('   Data Items:', dataLength);
      } else if (response.data.trending_documents) {
        console.log('   Trending Documents:', response.data.trending_documents.length);
      } else if (response.data.suggested_documents) {
        console.log('   Suggested Documents:', response.data.suggested_documents.length);
      }

      if (response.data.summary) {
        console.log('   Summary:', response.data.summary);
      }

      if (response.data.rbac_structure) {
        console.log('   RBAC Structure:', response.data.rbac_structure);
      }

      console.log('\n📋 Complete Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('===== API SERVICE COMPLETE =====\n');

      return {
        data: response.data,
        status: response.status,
        headers: response.headers
      };

    } catch (error) {
      console.error(`Error calling ${apiName} API:`, error);

      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const statusText = error.response.statusText;

        // Handle specific HTTP status codes with user-friendly messages
        if (status === 503) {
          console.error('🚨 SERVICE UNAVAILABLE: The API server is temporarily down');
          console.error('   This is usually a temporary issue with the API service');
          console.error('   Please try again in a few minutes');

          return {
            error: `🚨 Search service is temporarily unavailable (503). This is usually temporary - please try again in a few minutes.`,
            status: status,
            details: error.response.data
          };
        } else if (status === 500) {
          console.error('🚨 SERVER ERROR: Internal server error');
          return {
            error: `🚨 Search service encountered an internal error (500). Please try again later.`,
            status: status,
            details: error.response.data
          };
        } else if (status === 404) {
          console.error('🚨 NOT FOUND: API endpoint not found');
          return {
            error: `🚨 Search endpoint not found (404). Please check the API configuration.`,
            status: status,
            details: error.response.data
          };
        } else if (status === 401) {
          console.error('🚨 UNAUTHORIZED: Authentication failed');
          return {
            error: `🚨 Authentication failed (401). Please check your API credentials.`,
            status: status,
            details: error.response.data
          };
        } else if (status === 403) {
          console.error('🚨 FORBIDDEN: Access denied');
          return {
            error: `🚨 Access denied (403). You don't have permission to access this resource.`,
            status: status,
            details: error.response.data
          };
        }

        // Generic error for other status codes
        return {
          error: `API Error (${status}): ${error.response.data?.message || statusText}`,
          status: status,
          details: error.response.data
        };
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNREFUSED') {
          console.error('🚨 CONNECTION REFUSED: Cannot connect to API server');
          return {
            error: '🚨 Cannot connect to search service. The server might be down - please try again later.',
            details: error.message
          };
        } else if (error.code === 'ENOTFOUND') {
          console.error('🚨 DNS ERROR: API server not found');
          return {
            error: '🚨 Search service not found. Please check your internet connection.',
            details: error.message
          };
        } else if (error.code === 'ETIMEDOUT') {
          console.error('🚨 TIMEOUT: API request timed out');
          return {
            error: '🚨 Search request timed out. The service might be slow - please try again.',
            details: error.message
          };
        }

        return {
          error: '🚨 No response from search service. Please check if the service is running.',
          details: error.message
        };
      } else {
        // Something else happened
        return {
          error: `🚨 Request failed: ${error.message}`,
          details: error.message
        };
      }
    }
  }

  cleanParameters(parameters) {
    // Remove undefined/null values and empty strings
    const cleaned = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  replacePathParameters(url, parameters) {
    let processedUrl = url;
    
    // Replace path parameters like {userId} with actual values
    const pathParamRegex = /\{(\w+)\}/g;
    let match;
    
    while ((match = pathParamRegex.exec(url)) !== null) {
      const paramName = match[1];
      const paramValue = parameters[paramName];
      
      if (paramValue) {
        processedUrl = processedUrl.replace(`{${paramName}}`, paramValue);
      }
    }
    
    return processedUrl;
  }

  // Method to test API connectivity
  async testConnection() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return {
        success: true,
        status: response.status,
        message: 'API connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to API'
      };
    }
  }

  // Method to get API status/info
  async getApiInfo() {
    const info = {
      baseURL: this.baseURL,
      authMethod: 'RBAC in request body (no headers needed)',
      availableEndpoints: Object.keys(API_ENDPOINTS),
      endpointDetails: API_ENDPOINTS
    };

    return info;
  }
}

module.exports = new ApiService();
