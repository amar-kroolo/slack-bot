// Response Formatter - Converts JSON API responses to Slack Block Kit format

class ResponseFormatter {
  formatResponse(data, apiUsed) {
    try {
      // Handle Enterprise Search API responses
      if (data && typeof data === 'object') {
        // Handle different Enterprise Search API response structures
        switch (apiUsed) {
          case 'search':
            return this.formatSearchResults(data);
          case 'recent-searches':
            return this.formatRecentSearches(data);
          case 'suggested-documents':
            return this.formatSuggestedDocuments(data);
          case 'trending-documents':
            return this.formatTrendingDocuments(data);
          case 'dynamic-suggestions':
            return this.formatDynamicSuggestions(data);
          default:
            return this.formatGenericResponse(data, apiUsed);
        }
      } else {
        return this.formatSimpleResponse(data, apiUsed);
      }
    } catch (error) {
      console.error('Error formatting response:', error);
      return this.formatErrorResponse('Failed to format response');
    }
  }

  formatSearchResults(data) {
    const blocks = [];

    // Handle real API response structure
    const results = data.results || [];
    const total = data.summary?.total || results.length || 0;
    const searchTime = data.summary?.search_duration_ms;

    // Header with search stats
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `🔍 Search Results (${total} found)`
      }
    });

    // Add search performance info
    if (searchTime) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `⚡ Query completed in ${Math.round(searchTime)}ms • 🔒 Triple RBAC enforced`
          }
        ]
      });
    }

    if (results && results.length > 0) {
      // Show first 5 results to avoid overwhelming
      const resultsToShow = results.slice(0, 5);

      resultsToShow.forEach((result, index) => {
        blocks.push({ type: "divider" });

        // Clean up content preview
        const contentPreview = result.content_preview
          ? this.cleanContentPreview(result.content_preview)
          : 'No preview available';

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${result.title || 'Untitled'}*\n${contentPreview}`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open"
            },
            url: result.file_url || '#',
            action_id: `open_${result.id}`
          }
        });

        // Format metadata
        const integrationIcon = this.getIntegrationIcon(result.integration_type);
        const updatedDate = result.updated_at ? new Date(result.updated_at).toLocaleDateString() : 'Unknown';

        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${integrationIcon} ${result.integration_type || 'unknown'} • 📊 Score: ${result.relevance_score || 0} • 📅 ${updatedDate}`
            }
          ]
        });
      });

      // Show "and X more" if there are more results
      if (results.length > 5) {
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_... and ${results.length - 5} more results_`
            }
          ]
        });
      }

    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No results found for your search query."
        }
      });
    }

    return blocks;
  }

  formatRecentSearches(data) {
    const blocks = [];

    // Handle real API response structure - data.data contains the searches array
    const searches = data.data || [];
    const total = data.total || searches.length || 0;

    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `📚 Recent Searches (${total})`
      }
    });

    if (searches && searches.length > 0) {
      searches.forEach((search) => {
        blocks.push({ type: "divider" });

        // Show document title if available
        const documentInfo = search.has_document && search.document_title
          ? `\n📄 Found: ${search.document_title}`
          : '';

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*"${search.query}"*\n${search.results_count} results found${documentInfo}`
          }
        });

        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🕒 ${new Date(search.searched_at).toLocaleString()} • 🔍 ${search.account_ids.length} accounts searched`
            }
          ]
        });
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No recent searches found."
        }
      });
    }

    return blocks;
  }

  formatSuggestedDocuments(data) {
    const blocks = [];

    // Handle real API response structure - data.suggested_documents contains the documents
    const documents = data.suggested_documents || [];
    const total = data.total_found || documents.length || 0;

    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `💡 Suggested Documents (${total})`
      }
    });

    if (documents && documents.length > 0) {
      documents.forEach((doc) => {
        blocks.push({ type: "divider" });

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${doc.title}*\n📧 ${doc.author_email} • 📁 ${doc.file_type || 'unknown'}`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open"
            },
            url: doc.url,
            action_id: `open_${doc.id}`
          }
        });

        const integrationIcon = this.getIntegrationIcon(doc.integration_type);
        const updatedDate = new Date(doc.last_updated).toLocaleDateString();

        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${integrationIcon} ${doc.integration_type} • 📅 Updated: ${updatedDate} • 🏢 ${doc.account_id}`
            }
          ]
        });
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No document suggestions available."
        }
      });
    }

    return blocks;
  }

  formatTrendingDocuments(data) {
    const blocks = [];

    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `🔥 Trending Documents (${data.total_trending || 0})`
      }
    });

    if (data.documents && data.documents.length > 0) {
      data.documents.forEach((doc, index) => {
        blocks.push({ type: "divider" });

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${doc.title}*\n${doc.content?.substring(0, 150)}...`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open"
            },
            url: doc.url,
            action_id: `open_${doc.id}`
          }
        });

        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📁 ${doc.source} • 🔥 "${doc.trending_query}" (${doc.search_count} searches) • 📊 Trend: ${(doc.trend_score * 100).toFixed(0)}%`
            }
          ]
        });
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No trending documents found."
        }
      });
    }

    return blocks;
  }

  formatDynamicSuggestions(data) {
    const blocks = [];

    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `💭 Search Suggestions for "${data.partial_query}"`
      }
    });

    if (data.suggestions && data.suggestions.length > 0) {
      const suggestionText = data.suggestions.map((suggestion, index) =>
        `${index + 1}. ${suggestion}`
      ).join('\n');

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: suggestionText
        }
      });

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `💡 ${data.total_suggestions} suggestions found`
          }
        ]
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No suggestions available for this query."
        }
      });
    }

    return blocks;
  }

  formatGenericResponse(data, apiUsed) {
    return this.formatObjectResponse(data, apiUsed);
  }

  formatArrayResponse(data, apiUsed) {
    const blocks = [];
    
    // Header
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 ${this.getApiDisplayName(apiUsed)} Results (${data.length} items)`
      }
    });

    // If too many items, show only first few
    const itemsToShow = Math.min(data.length, 5);
    const hasMore = data.length > itemsToShow;

    for (let i = 0; i < itemsToShow; i++) {
      const item = data[i];
      blocks.push({
        type: "divider"
      });
      
      blocks.push(...this.formatSingleItem(item, i + 1));
    }

    // Show "and X more" if there are more items
    if (hasMore) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_... and ${data.length - itemsToShow} more items_`
          }
        ]
      });
    }

    return blocks;
  }

  formatObjectResponse(data, apiUsed) {
    const blocks = [];
    
    // Header
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 ${this.getApiDisplayName(apiUsed)} Details`
      }
    });

    blocks.push({
      type: "divider"
    });

    // Format object fields
    blocks.push(...this.formatSingleItem(data));

    return blocks;
  }

  formatSingleItem(item, index = null) {
    const blocks = [];
    
    // Create fields for the item
    const fields = [];
    const importantFields = this.getImportantFields(item);
    
    // Add important fields first
    for (const [key, value] of Object.entries(importantFields)) {
      fields.push({
        type: "mrkdwn",
        text: `*${this.formatFieldName(key)}:*\n${this.formatFieldValue(value)}`
      });
    }

    // Add other fields (limit to avoid overwhelming)
    const otherFields = Object.entries(item)
      .filter(([key]) => !importantFields.hasOwnProperty(key))
      .slice(0, 6); // Limit to 6 additional fields

    for (const [key, value] of otherFields) {
      if (this.shouldIncludeField(key, value)) {
        fields.push({
          type: "mrkdwn",
          text: `*${this.formatFieldName(key)}:*\n${this.formatFieldValue(value)}`
        });
      }
    }

    // Create section block
    const sectionBlock = {
      type: "section",
      fields: fields.slice(0, 10) // Slack limits to 10 fields per section
    };

    // Add index if provided
    if (index !== null) {
      sectionBlock.text = {
        type: "mrkdwn",
        text: `*Item ${index}*`
      };
    }

    blocks.push(sectionBlock);

    return blocks;
  }

  formatSimpleResponse(data, apiUsed) {
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `✅ ${this.getApiDisplayName(apiUsed)} Response`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
        }
      }
    ];
  }

  formatErrorResponse(error) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `❌ *Error:* ${error}`
        }
      }
    ];
  }

  getApiDisplayName(apiUsed) {
    const displayNames = {
      search: 'Search Results',
      'recent-searches': 'Recent Searches',
      'suggested-documents': 'Suggested Documents',
      'trending-documents': 'Trending Documents',
      'dynamic-suggestions': 'Search Suggestions'
    };

    return displayNames[apiUsed] || apiUsed.charAt(0).toUpperCase() + apiUsed.slice(1);
  }

  getIntegrationIcon(integrationType) {
    const icons = {
      'google_drive': '📄',
      'slack': '💬',
      'dropbox': '📦',
      'jira': '🎫',
      'zendesk': '🎮',
      'document360': '📚'
    };

    return icons[integrationType] || '📁';
  }

  cleanContentPreview(content) {
    if (!content) return 'No preview available';

    // Remove special characters, control characters, and excessive whitespace
    let cleaned = content
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[=]{3,}/g, '') // Remove separator lines like ===
      .replace(/[-]{3,}/g, '') // Remove separator lines like ---
      .trim();

    // Truncate to reasonable length
    if (cleaned.length > 150) {
      cleaned = cleaned.substring(0, 150) + '...';
    }

    return cleaned || 'Content preview not available';
  }

  getImportantFields(item) {
    const important = {};
    
    // Common important field patterns
    const importantPatterns = [
      'id', 'name', 'title', 'email', 'status', 'state',
      'userId', 'orderId', 'productId', 'customerId',
      'amount', 'price', 'total', 'quantity',
      'createdAt', 'updatedAt', 'date', 'timestamp'
    ];

    for (const pattern of importantPatterns) {
      // Exact match
      if (item.hasOwnProperty(pattern)) {
        important[pattern] = item[pattern];
      }
      
      // Case-insensitive match
      const key = Object.keys(item).find(k => 
        k.toLowerCase() === pattern.toLowerCase()
      );
      if (key && !important.hasOwnProperty(key)) {
        important[key] = item[key];
      }
    }

    return important;
  }

  formatFieldName(key) {
    // Convert camelCase/snake_case to readable format
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim();
  }

  formatFieldValue(value) {
    if (value === null || value === undefined) {
      return '_Not set_';
    }
    
    if (typeof value === 'boolean') {
      return value ? '✅ Yes' : '❌ No';
    }
    
    if (typeof value === 'object') {
      // For nested objects, show a summary or JSON
      if (Array.isArray(value)) {
        return `Array (${value.length} items)`;
      } else {
        return `\`${JSON.stringify(value, null, 2)}\``;
      }
    }
    
    // Format dates
    if (this.isDateString(value)) {
      try {
        const date = new Date(value);
        return date.toLocaleString();
      } catch (e) {
        return value;
      }
    }
    
    // Format numbers with commas for large values
    if (typeof value === 'number' && value > 999) {
      return value.toLocaleString();
    }
    
    return String(value);
  }

  shouldIncludeField(key, value) {
    // Skip fields that are not useful to display
    const skipPatterns = [
      /^_/, // Private fields starting with underscore
      /password/i,
      /secret/i,
      /token/i,
      /key$/i,
      /hash$/i
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(key)) {
        return false;
      }
    }
    
    // Skip null/undefined values
    if (value === null || value === undefined) {
      return false;
    }
    
    // Skip very long strings (probably not useful for display)
    if (typeof value === 'string' && value.length > 200) {
      return false;
    }
    
    return true;
  }

  isDateString(value) {
    if (typeof value !== 'string') return false;
    
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // ISO date
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
      /\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /\d{2}-\d{2}-\d{4}/ // MM-DD-YYYY
    ];
    
    return datePatterns.some(pattern => pattern.test(value));
  }
}

module.exports = {
  formatResponse: (data, apiUsed) => new ResponseFormatter().formatResponse(data, apiUsed)
};
