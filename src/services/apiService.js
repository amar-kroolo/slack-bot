const axios = require('axios');
const { API_ENDPOINTS, RBAC_CONFIG, DEFAULT_APPS } = require('../config/apis');
const pipedreamService = require('./pipedreamService');
const { getUserConnections } = require('./databaseService');

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
      const apiConfig = API_ENDPOINTS[apiName];
      if (!apiConfig) {
        return { error: `Unknown API: ${apiName}` };
      }

      const requestConfig = {
        method: apiConfig.method.toLowerCase(),
        url: apiConfig.endpoint
      };

      if (apiConfig.requiresAuth) {
        let connectionData;
        try {
          connectionData = await getUserConnections(slackUserId, slackEmail);
        } catch (err) {
          console.error('❌ Failed to fetch connection data:', err.message);
          connectionData = {
            slackUserId,
            slackEmail,
            appNames: ["google_drive"],
            accountIds: ["apn_wGhDOAY"]
          };
        }

        const requestBody = {
          account_ids: connectionData.accountIds,
          user_email: connectionData.slackEmail,
          external_user_id: connectionData.slackUserId,
          ...this.cleanParameters(parameters)
        };

        console.log('📤 Complete Request Body:');
        console.log(JSON.stringify(requestBody, null, 2));

        if (apiName === 'search' && !requestBody.apps) {
          requestBody.apps = connectionData.appNames.length > 0 ? connectionData.appNames : DEFAULT_APPS;
        }

        requestConfig.data = requestBody;
      } else {
        if (apiConfig.method.toLowerCase() === 'get') {
          requestConfig.params = this.cleanParameters(parameters);
        } else {
          requestConfig.data = this.cleanParameters(parameters);
        }
      }

      if (requestConfig.url.includes('{') && requestConfig.url.includes('}')) {
        requestConfig.url = this.replacePathParameters(requestConfig.url, parameters);
      }

      const response = await this.client(requestConfig);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers
      };

    } catch (error) {
      const errRes = error.response;
      const status = errRes?.status;
      const message = errRes?.data?.message || error.message;

      return {
        error: `API Error${status ? ` (${status})` : ''}: ${message}`,
        status,
        details: errRes?.data || error.message
      };
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
