const express = require('express');
const authRoutes = require('./src/routes/auth');
const toolsRoutes = require('./src/routes/tools');

function setupExpressApp(app) {
  // Add existing web routes
  app.use('/', authRoutes);
  app.use('/api/tools', toolsRoutes);

  // Add your other routes...
  
  return app;
}

module.exports = setupExpressApp;
