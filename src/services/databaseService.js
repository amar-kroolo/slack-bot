// Database Service
// Handles all database operations for users and connections

const mongoose = require('mongoose');
const User = require('../models/User');
const Connection = require('../models/Connection');

// Ensure user exists, create if not
async function ensureUser(slackUserId, email) {
  let user = await User.findOne({ slackUserId });
  if (!user) {
    user = new User({
      slackUserId,
      email,
      createdAt: new Date()
    });
    await user.save();
  }
  return user;
}

async function storeConnection({ slackUserId, appName, accountId, accountEmail }) {

  let connection = await Connection.findOne({ slackUserId });

  if (!connection) {
    // No document exists — create a new one
    connection = new Connection({
      slackUserId,
      appNames: [appName],
      accountIds: [accountId],
      accountEmails: accountEmail ? [accountEmail] : [],
      status: 'active',
      connectedAt: new Date()
    });

    await connection.save();
    return connection;
  }

  // Document exists — append new values if not already present
  let updated = false;

  if (!connection.appNames.includes(appName)) {
    connection.appNames.push(appName);
    updated = true;
  }

  if (!connection.accountIds.includes(accountId)) {
    connection.accountIds.push(accountId);
    updated = true;
  }

  if (accountEmail && !connection.accountEmails.includes(accountEmail)) {
    connection.accountEmails.push(accountEmail);
    updated = true;
  }

  if (updated) {
    connection.updatedAt = new Date();
    await connection.save();
  }

  return connection;
}

// Get appName and accountIds for a given slackUserId
async function getUserConnections(slackUserId, slackEmail) {
  try {
    const connection = await Connection.findOne({ slackUserId });

    if (!connection) {
      // Fallback: return static/default connection
      return {
        slackUserId,
        slackEmail,
        appNames: ["google_drive","slack"],
        accountIds: ["apn_XehedEz",
          "apn_Xehed1w",
          "apn_yghjwOb",
          "apn_7rhaEpm",
          "apn_x7hrxmn",
          "apn_arhpXvr"]
      };
    }

    return {
      slackUserId: connection.slackUserId,
      slackEmail: slackEmail || connection.accountEmails?.[0] || null,
      appNames: connection.appNames || [],
      accountIds: connection.accountIds || []
    };
  } catch (err) {
    console.error('❌ Error fetching user connections:', err.message);
    return {
      slackUserId,
      slackEmail,
      appNames: [],
      accountIds: [],
      error: 'Failed to fetch connection info'
    };
  }
}

module.exports = {
  ensureUser,
  storeConnection,
  getUserConnections
};

