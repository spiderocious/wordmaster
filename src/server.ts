import { createServer } from 'http';
import { App } from './app';
import { database, logger } from '@utils';
import { envConfig } from '@configs';
import { letterService } from '@services';
import { initializeWebSocket } from './websocket/server';

class Server {
  private app: App;

  constructor() {
    this.app = new App();
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await database.connect();

      // Build letter-category cache
      await letterService.buildLetterCategoryCache();

      // Create HTTP server
      const httpServer = createServer(this.app.getApp());

      // Initialize WebSocket server
      initializeWebSocket(httpServer);

      // Start server
      const server = httpServer.listen(envConfig.port, () => {
        logger.info(`AlphaGame API Server ${String(envConfig.port).padEnd(31)}  `);
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.warn('SIGTERM received, shutting down gracefully...');
        server.close(async () => {
          await database.disconnect();
          process.exit(0);
        });
      });

      process.on('SIGINT', async () => {
        logger.warn('SIGINT received, shutting down gracefully...');
        server.close(async () => {
          await database.disconnect();
          process.exit(0);
        });
      });
    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();
