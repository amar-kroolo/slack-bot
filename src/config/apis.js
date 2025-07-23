// Enterprise Search API Configuration
// Triple RBAC Enforced API with account_ids + external_user_id + user_email

const API_ENDPOINTS = {
  search: {
    endpoint: '/search',
    method: 'POST',
    description: 'Multi-account search with triple RBAC',
    parameters: ['query', 'apps', 'limit'],
    keywords: ['search', 'find', 'look', 'query', 'documents', 'files'],
    requiresAuth: true
  },
  'recent-searches': {
    endpoint: '/recent-searches',
    method: 'POST',
    description: 'Get recent searches',
    parameters: ['limit'],
    keywords: ['recent', 'history', 'previous', 'last', 'searches'],
    requiresAuth: true
  },
  'suggested-documents': {
    endpoint: '/suggested-documents',
    method: 'POST',
    description: 'Get suggested documents',
    parameters: ['limit'],
    keywords: ['suggested', 'recommendations', 'documents', 'files', 'recommend'],
    requiresAuth: true
  },
  'trending-documents': {
    endpoint: '/trending-documents',
    method: 'POST',
    description: 'Discover trending documents based on search analytics',
    parameters: ['limit'],
    keywords: ['trending', 'popular', 'hot', 'documents', 'files', 'analytics'],
    requiresAuth: true
  },
  'dynamic-suggestions': {
    endpoint: '/suggestions',
    method: 'POST',
    description: 'Get autocomplete suggestions',
    parameters: ['partial_query', 'limit'],
    keywords: ['suggestions', 'autocomplete', 'complete', 'suggest'],
    requiresAuth: true
  }
};

// Natural language patterns to API mapping for Enterprise Search
const QUERY_PATTERNS = [
  {
    pattern: /(?:search|find|look)\s+(?:for\s+)?(.+)/i,
    api: 'search',
    paramExtractor: (match) => ({
      query: match[1].trim(),
      apps: ['google_drive', 'slack', 'dropbox', 'jira', 'zendesk', 'document360']
    })
  },
  {
    pattern: /(?:show\s+)?(?:me\s+)?(?:my\s+)?recent\s+searches?/i,
    api: 'recent-searches',
    paramExtractor: () => ({ limit: 10 })
  },
  {
    pattern: /(?:show\s+)?(?:me\s+)?suggested?\s+(?:documents?|files?)/i,
    api: 'suggested-documents',
    paramExtractor: () => ({ limit: 10 })
  },
  {
    pattern: /(?:show\s+)?(?:me\s+)?trending\s+(?:documents?|files?)/i,
    api: 'trending-documents',
    paramExtractor: () => ({ limit: 10 })
  },
  {
    pattern: /(?:suggest|complete|autocomplete)\s+(.+)/i,
    api: 'dynamic-suggestions',
    paramExtractor: (match) => ({
      partial_query: match[1].trim(),
      limit: 10
    })
  },
  {
    pattern: /(?:what's\s+)?(?:popular|trending|hot)\s+(?:now|today)?/i,
    api: 'trending-documents',
    paramExtractor: () => ({ limit: 10 })
  },
  {
    pattern: /(?:discover|show|get)\s+trending\s+documents?/i,
    api: 'trending-documents',
    paramExtractor: () => ({ limit: 10 })
  },
  {
    pattern: /(?:recommend|suggestions?)\s+(?:for\s+)?(.+)/i,
    api: 'dynamic-suggestions',
    paramExtractor: (match) => ({
      partial_query: match[1].trim(),
      limit: 10
    })
  }
];

// Triple RBAC Configuration - ALL REQUIRED for every request
const RBAC_CONFIG = {
  account_ids: [
    "apn_XehedEz",
    "apn_Xehed1w",
    "apn_yghjwOb",
    "apn_7rhaEpm",
    "apn_x7hrxmn",
    "apn_arhpXvr"
  ],
  external_user_id: "686652ee4314417de20af851",
  user_email: "ayush.enterprise.search@gmail.com"
};

// Default apps for search queries
const DEFAULT_APPS = [
  "google_drive",
  "slack",
  "dropbox",
  "jira",
  "zendesk",
  "document360"
];

module.exports = {
  API_ENDPOINTS,
  QUERY_PATTERNS,
  RBAC_CONFIG,
  DEFAULT_APPS
};
