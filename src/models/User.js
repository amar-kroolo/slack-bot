// User Model
// Stores user information, authentication data, and connection tracking

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Slack User Information
  slackUserId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Slack user ID (primary identifier)'
  },
  
  slackEmail: {
    type: String,
    required: false,
    index: true,
    description: 'User email from Slack profile'
  },
  
  slackName: {
    type: String,
    required: false,
    description: 'User display name from Slack'
  },
  
  slackTeamId: {
    type: String,
    required: false,
    index: true,
    description: 'Slack team/workspace ID'
  },

  // Pipedream User Information
  pipedreamUserId: {
    type: String,
    required: false,
    index: true,
    description: 'Pipedream user ID from OAuth'
  },
  
  pipedreamEmail: {
    type: String,
    required: false,
    description: 'User email from Pipedream profile'
  },
  
  pipedreamName: {
    type: String,
    required: false,
    description: 'User name from Pipedream profile'
  },

  // External User ID (used for API calls)
  externalUserId: {
    type: String,
    required: true,
    index: true,
    description: 'External user ID for API authentication'
  },

  // Primary Email (resolved from Slack or Pipedream)
  primaryEmail: {
    type: String,
    required: false,
    index: true,
    description: 'Primary email address (Slack priority, Pipedream fallback)'
  },

  // Authentication Status
  authStatus: {
    slack: {
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
      accessToken: { type: String, default: null },
      scopes: [{ type: String }]
    },
    pipedream: {
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiresAt: { type: Date, default: null }
    }
  },

  // Connection Statistics
  connectionStats: {
    totalConnections: { type: Number, default: 0 },
    activeConnections: { type: Number, default: 0 },
    lastConnectionAt: { type: Date, default: null },
    connectedApps: [{ type: String }] // Array of connected app names
  },

  // User Preferences
  preferences: {
    defaultApps: [{ type: String }], // User's preferred apps for search
    searchLimit: { type: Number, default: 10 },
    enableNotifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' }
  },

  // Activity Tracking
  activity: {
    lastActiveAt: { type: Date, default: Date.now },
    totalQueries: { type: Number, default: 0 },
    lastQueryAt: { type: Date, default: null },
    favoriteApps: [{ type: String }] // Most used apps
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  
  // Additional data storage
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'users'
});

// Additional indexes for better performance (primary indexes are defined in schema)
userSchema.index({ 'authStatus.slack.connected': 1 });
userSchema.index({ 'authStatus.pipedream.connected': 1 });
userSchema.index({ 'connectionStats.totalConnections': 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ updatedAt: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.slackName || this.pipedreamName || 'Unknown User';
});

// Virtual for connection status
userSchema.virtual('isConnected').get(function() {
  return this.authStatus.slack.connected || this.authStatus.pipedream.connected;
});

// Instance Methods
userSchema.methods.updateActivity = function() {
  this.activity.lastActiveAt = new Date();
  this.activity.totalQueries += 1;
  this.activity.lastQueryAt = new Date();
  return this.save();
};

userSchema.methods.addConnection = function(appName) {
  if (!this.connectionStats.connectedApps.includes(appName)) {
    this.connectionStats.connectedApps.push(appName);
    this.connectionStats.totalConnections += 1;
    this.connectionStats.activeConnections += 1;
    this.connectionStats.lastConnectionAt = new Date();
  }
  return this.save();
};

userSchema.methods.removeConnection = function(appName) {
  const index = this.connectionStats.connectedApps.indexOf(appName);
  if (index > -1) {
    this.connectionStats.connectedApps.splice(index, 1);
    this.connectionStats.activeConnections -= 1;
  }
  return this.save();
};

userSchema.methods.getConnectionSummary = function() {
  return {
    userId: this.slackUserId,
    email: this.primaryEmail,
    totalConnections: this.connectionStats.totalConnections,
    activeConnections: this.connectionStats.activeConnections,
    connectedApps: this.connectionStats.connectedApps,
    slackConnected: this.authStatus.slack.connected,
    pipedreamConnected: this.authStatus.pipedream.connected,
    lastActive: this.activity.lastActiveAt
  };
};

// Static Methods
userSchema.statics.findBySlackId = function(slackUserId) {
  return this.findOne({ slackUserId });
};

userSchema.statics.findByExternalId = function(externalUserId) {
  return this.findOne({ externalUserId });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    $or: [
      { primaryEmail: email },
      { slackEmail: email },
      { pipedreamEmail: email }
    ]
  });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ 
    isActive: true,
    'activity.lastActiveAt': { 
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  });
};

userSchema.statics.getConnectionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        slackConnected: { 
          $sum: { $cond: ['$authStatus.slack.connected', 1, 0] }
        },
        pipedreamConnected: { 
          $sum: { $cond: ['$authStatus.pipedream.connected', 1, 0] }
        },
        totalConnections: { $sum: '$connectionStats.totalConnections' },
        averageConnections: { $avg: '$connectionStats.totalConnections' }
      }
    }
  ]);
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  // Set primary email priority: Slack > Pipedream
  if (this.slackEmail) {
    this.primaryEmail = this.slackEmail;
  } else if (this.pipedreamEmail) {
    this.primaryEmail = this.pipedreamEmail;
  }
  
  next();
});

// Export the model
const User = mongoose.model('User', userSchema);

module.exports = User;
