const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const socketService = require('./services/socketService');
const { testConnection } = require('./services/prismaService');
const socketMiddleware = require('./middlewares/socketMiddleware');

// Routes
const adminRoutes = require('./routes/admin');
const questionsRoutes = require('./routes/questions');
const sessionsRoutes = require('./routes/sessions');

// Initialize app
const app = express();
const server = http.createServer(app);

// Initialize socket.io
socketService.init(server);

// Test database connection
testConnection();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(socketMiddleware);

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/sessions', sessionsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

module.exports = { app, server };