// Slack Apps Configuration
// Defines popular Slack apps and their connection details
// Similar to Pipedream apps configuration

const SLACK_APPS = {
  slack_workspace: {
    name: 'Slack Workspace',
    icon: '💬',
    description: 'Connect your Slack workspace for enhanced search and management',
    category: 'workspace',
    scopes: [
      'channels:read',
      'users:read', 
      'files:read',
      'search:read',
      'team:read'
    ],
    features: [
      'Search across all channels',
      'Access user directory',
      'View workspace information',
      'Read file metadata'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: true
  },

  slack_files: {
    name: 'Slack Files',
    icon: '📁',
    description: 'Access and search your Slack files and attachments',
    category: 'files',
    scopes: [
      'files:read',
      'files:write'
    ],
    features: [
      'Search uploaded files',
      'Download attachments',
      'Upload new files',
      'Manage file permissions'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: true
  },

  slack_channels: {
    name: 'Slack Channels',
    icon: '📢',
    description: 'Search and manage your Slack channels',
    category: 'channels',
    scopes: [
      'channels:read',
      'channels:history',
      'groups:read',
      'groups:history',
      'channels:manage'
    ],
    features: [
      'Search channel messages',
      'View channel history',
      'Access private groups',
      'Manage channel settings'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: true
  },

  slack_messages: {
    name: 'Slack Messages',
    icon: '💬',
    description: 'Search your Slack message history across all conversations',
    category: 'messages',
    scopes: [
      'search:read',
      'channels:history',
      'groups:history',
      'im:history',
      'mpim:history'
    ],
    features: [
      'Search message history',
      'Access direct messages',
      'View group conversations',
      'Search across all channels'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: true
  },

  slack_apps: {
    name: 'Slack Apps',
    icon: '🔧',
    description: 'Connect to Slack app integrations and workflows',
    category: 'integrations',
    scopes: [
      'apps:read',
      'workflow.steps:execute'
    ],
    features: [
      'View installed apps',
      'Execute workflows',
      'Manage integrations',
      'Access app data'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: false
  },

  slack_notifications: {
    name: 'Slack Notifications',
    icon: '🔔',
    description: 'Manage Slack notifications and send messages',
    category: 'notifications',
    scopes: [
      'chat:write',
      'chat:write.public',
      'chat:write.customize'
    ],
    features: [
      'Send messages',
      'Post to channels',
      'Customize message appearance',
      'Manage notifications'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: false
  },

  slack_admin: {
    name: 'Slack Admin',
    icon: '👑',
    description: 'Administrative access for workspace management',
    category: 'admin',
    scopes: [
      'admin',
      'users:read',
      'users:write',
      'channels:manage',
      'team:read'
    ],
    features: [
      'Manage users',
      'Configure workspace',
      'Access admin settings',
      'Manage permissions'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: false,
    requires_admin: true
  },

  slack_analytics: {
    name: 'Slack Analytics',
    icon: '📊',
    description: 'Access Slack usage analytics and insights',
    category: 'analytics',
    scopes: [
      'team:read',
      'channels:read',
      'users:read'
    ],
    features: [
      'View usage statistics',
      'Channel analytics',
      'User activity insights',
      'Workspace metrics'
    ],
    oauth_url: 'https://slack.com/oauth/v2/authorize',
    popular: false
  }
};

// App categories for organization
const SLACK_APP_CATEGORIES = {
  workspace: {
    name: 'Workspace',
    icon: '🏢',
    description: 'Core workspace functionality'
  },
  files: {
    name: 'Files & Storage',
    icon: '📁',
    description: 'File management and storage'
  },
  channels: {
    name: 'Channels & Groups',
    icon: '📢',
    description: 'Channel and group management'
  },
  messages: {
    name: 'Messages & Chat',
    icon: '💬',
    description: 'Messaging and communication'
  },
  integrations: {
    name: 'Apps & Integrations',
    icon: '🔧',
    description: 'Third-party integrations'
  },
  notifications: {
    name: 'Notifications',
    icon: '🔔',
    description: 'Alerts and notifications'
  },
  admin: {
    name: 'Administration',
    icon: '👑',
    description: 'Administrative functions'
  },
  analytics: {
    name: 'Analytics',
    icon: '📊',
    description: 'Usage analytics and insights'
  }
};

// Get popular apps for quick connection
function getPopularSlackApps() {
  return Object.entries(SLACK_APPS)
    .filter(([key, app]) => app.popular)
    .map(([key, app]) => ({
      app_id: key,
      ...app
    }));
}

// Get all apps by category
function getSlackAppsByCategory(category) {
  return Object.entries(SLACK_APPS)
    .filter(([key, app]) => app.category === category)
    .map(([key, app]) => ({
      app_id: key,
      ...app
    }));
}

// Get app by ID
function getSlackAppById(appId) {
  const app = SLACK_APPS[appId];
  if (!app) return null;
  
  return {
    app_id: appId,
    ...app
  };
}

// Get all scopes for multiple apps
function getCombinedScopes(appIds) {
  const allScopes = new Set();
  
  appIds.forEach(appId => {
    const app = SLACK_APPS[appId];
    if (app && app.scopes) {
      app.scopes.forEach(scope => allScopes.add(scope));
    }
  });
  
  return Array.from(allScopes);
}

// Default comprehensive scopes for general connection
const DEFAULT_SLACK_SCOPES = [
  'channels:read',
  'users:read',
  'files:read',
  'search:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'im:history',
  'chat:write'
];

module.exports = {
  SLACK_APPS,
  SLACK_APP_CATEGORIES,
  DEFAULT_SLACK_SCOPES,
  getPopularSlackApps,
  getSlackAppsByCategory,
  getSlackAppById,
  getCombinedScopes
};
