// Mock data for Enterprise Search API testing
// This helps you test the bot functionality before connecting to real APIs

const MOCK_RESPONSES = {
  search: {
    success: true,
    results: [
      {
        id: "doc_123",
        title: "Q4 Financial Report",
        content: "Quarterly financial analysis and projections...",
        source: "google_drive",
        account_id: "apn_XehedEz",
        url: "https://drive.google.com/file/d/abc123",
        last_modified: "2024-01-15T10:30:00Z",
        relevance_score: 0.95,
        file_type: "pdf"
      },
      {
        id: "doc_124",
        title: "Team Meeting Notes - Jan 2024",
        content: "Discussion about project roadmap and deliverables...",
        source: "slack",
        account_id: "apn_Xehed1w",
        url: "https://workspace.slack.com/archives/C123/p1642123456",
        last_modified: "2024-01-18T14:22:00Z",
        relevance_score: 0.87,
        file_type: "message"
      }
    ],
    total_results: 2,
    query_time_ms: 145
  },

  'recent-searches': {
    success: true,
    searches: [
      {
        query: "financial report Q4",
        timestamp: "2024-01-20T14:22:00Z",
        results_count: 15,
        apps_searched: ["google_drive", "slack"]
      },
      {
        query: "team meeting notes",
        timestamp: "2024-01-20T11:15:00Z",
        results_count: 8,
        apps_searched: ["slack", "jira"]
      },
      {
        query: "project roadmap",
        timestamp: "2024-01-19T16:30:00Z",
        results_count: 12,
        apps_searched: ["jira", "document360"]
      }
    ],
    total_searches: 3
  },

  'suggested-documents': {
    success: true,
    documents: [
      {
        id: "doc_456",
        title: "API Documentation v3.1",
        content: "Complete API reference and integration guide...",
        source: "document360",
        account_id: "apn_yghjwOb",
        url: "https://docs.company.com/api/v3.1",
        last_accessed: "2024-01-19T09:30:00Z",
        suggestion_reason: "frequently_accessed",
        file_type: "documentation"
      },
      {
        id: "doc_457",
        title: "Security Best Practices",
        content: "Guidelines for secure development and deployment...",
        source: "google_drive",
        account_id: "apn_7rhaEpm",
        url: "https://drive.google.com/file/d/def456",
        last_accessed: "2024-01-18T15:45:00Z",
        suggestion_reason: "related_to_recent_searches",
        file_type: "pdf"
      }
    ],
    total_suggestions: 2
  },

  'trending-documents': {
    success: true,
    documents: [
      {
        id: "doc_789",
        title: "Product Launch Strategy 2024",
        content: "Comprehensive strategy for upcoming product launches...",
        source: "google_drive",
        account_id: "apn_x7hrxmn",
        url: "https://drive.google.com/file/d/ghi789",
        trending_query: "product launch",
        search_count: 45,
        last_accessed: "2024-01-20T13:15:00Z",
        trend_score: 0.92,
        file_type: "presentation"
      },
      {
        id: "doc_790",
        title: "Customer Feedback Analysis",
        content: "Analysis of customer feedback and satisfaction metrics...",
        source: "zendesk",
        account_id: "apn_arhpXvr",
        url: "https://company.zendesk.com/tickets/12345",
        trending_query: "customer feedback",
        search_count: 32,
        last_accessed: "2024-01-20T10:22:00Z",
        trend_score: 0.88,
        file_type: "report"
      }
    ],
    total_trending: 2
  },

  'dynamic-suggestions': {
    success: true,
    suggestions: [
      "api documentation",
      "api integration guide",
      "api best practices",
      "authentication methods",
      "authorization patterns"
    ],
    partial_query: "a",
    total_suggestions: 5
  }
};

// Function to get mock data based on API and parameters
function getMockData(apiName, parameters = {}) {
  const apiData = MOCK_RESPONSES[apiName];

  if (!apiData) {
    return {
      error: `No mock data available for API: ${apiName}`
    };
  }

  // All Enterprise Search APIs return the full response structure
  return { data: apiData };
}

module.exports = {
  MOCK_RESPONSES,
  getMockData
};
