import { createApp } from './app';
import { config } from './config';
import { getDatabase, closeDatabase } from './db/connection';
import { DatabaseMigrator } from './db/migrator';
import { seedDatabase } from './db/seed';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    logger.info('Initializing ZR Factory ERP backend service...');

    // Initialize Database & Run Migrations
    const db = getDatabase();
    const migrator = new DatabaseMigrator(db);
    const migrationResult = migrator.runMigrations();

    if (migrationResult.applied.length > 0) {
      logger.info(`Applied ${migrationResult.applied.length} initial migration(s). Seeding base configuration...`);
      seedDatabase(db);
    } else {
      logger.info('Database schema is already up to date.');
    }

    // Start Express HTTP Server
    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`🚀 ZR Factory ERP Server listening on port ${config.port} (${config.env})`);
      logger.info(`👉 API Health Endpoint: http://localhost:${config.port}/api/health`);
    });

    // Graceful Shutdown
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        closeDatabase();
        logger.info('HTTP server and Database closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    logger.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
