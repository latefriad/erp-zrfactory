import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = dbPath || config.dbFilePath;

  // In-memory support for testing
  if (targetPath !== ':memory:') {
    const dbDir = path.dirname(targetPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  logger.info(`Opening SQLite database at ${targetPath}`);

  dbInstance = new Database(targetPath);

  // Enable performance & integrity pragmas
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('Database connection closed gracefully.');
    } catch (err) {
      logger.error('Error closing database:', err);
    } finally {
      dbInstance = null;
    }
  }
}

export function setDatabaseInstance(db: Database.Database): void {
  if (dbInstance && dbInstance !== db) {
    dbInstance.close();
  }
  dbInstance = db;
}
