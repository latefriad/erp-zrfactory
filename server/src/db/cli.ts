import { getDatabase, closeDatabase } from './connection';
import { DatabaseMigrator } from './migrator';
import { seedDatabase } from './seed';
import { logger } from '../utils/logger';

async function main() {
  const command = process.argv[2] || 'migrate';
  const db = getDatabase();

  try {
    if (command === 'migrate') {
      logger.info('Running database migrations via CLI...');
      const migrator = new DatabaseMigrator(db);
      const result = migrator.runMigrations();
      logger.info(`Migrations finished. Applied: ${result.applied.length}, Total: ${result.total}`);
    } else if (command === 'seed') {
      logger.info('Running database seed via CLI...');
      const migrator = new DatabaseMigrator(db);
      migrator.runMigrations(); // Ensure schema is up to date first
      seedDatabase(db);
      logger.info('Seed finished successfully.');
    } else {
      logger.error(`Unknown command: ${command}. Use "migrate" or "seed".`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('CLI execution error:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();
