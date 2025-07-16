import app from './app';
import { env } from './config/env';
import { simpleHeartbeatService } from './services/simple-heartbeat.service';

const PORT = parseInt(env.PORT, 10);

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`🚀 E-Tour Backend Server started on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);

  // Start simple heartbeat service (only in production/development, not in tests)
  if (process.env.NODE_ENV !== 'test') {
    try {
      console.log('🔧 Starting simple heartbeat service...');

      // Start simple heartbeat service
      simpleHeartbeatService.start();

      console.log('✅ Simple heartbeat service started successfully');
      console.log('💓 Heartbeat monitoring is now active');

    } catch (error) {
      console.error('❌ Failed to start heartbeat service:', error);
    }
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('🔒 HTTP server closed');

    try {
      // Stop heartbeat service
      console.log('🛑 Stopping heartbeat service...');
      simpleHeartbeatService.stop();

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export { server };
export default server;