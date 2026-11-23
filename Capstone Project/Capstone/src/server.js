const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { initListeners } = require('./events/listeners');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize event listeners
initListeners();

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 E-Commerce API running on port ${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`🏥 Health Check: http://localhost:${env.PORT}/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server };
