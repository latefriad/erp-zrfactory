import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger';

export interface MigrationRecord {
  id: string;
  name: string;
  applied_at: string;
}

export class DatabaseMigrator {
  private db: Database.Database;
  private migrationsDir: string;

  constructor(db: Database.Database, migrationsDir?: string) {
    this.db = db;
    if (migrationsDir && fs.existsSync(migrationsDir)) {
      this.migrationsDir = migrationsDir;
    } else {
      const candidates = [
        path.resolve(__dirname, 'migrations'),
        path.resolve(__dirname, '../../src/db/migrations'),
        path.resolve(process.cwd(), 'src/db/migrations'),
        path.resolve(process.cwd(), 'server/src/db/migrations'),
      ];
      this.migrationsDir = candidates.find(c => fs.existsSync(c)) || path.resolve(__dirname, 'migrations');
    }
  }

  public initMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (DATETIME('now'))
      );
    `);
  }

  public getAppliedMigrations(): MigrationRecord[] {
    this.initMigrationTable();
    return this.db.prepare('SELECT id, name, applied_at FROM schema_migrations ORDER BY name ASC').all() as MigrationRecord[];
  }

  public getPendingMigrations(): string[] {
    this.initMigrationTable();

    if (!fs.existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory does not exist: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const appliedRows = this.getAppliedMigrations();
    const appliedNames = new Set(appliedRows.map(m => m.name));

    return files.filter(file => !appliedNames.has(file));
  }

  public runMigrations(): { applied: string[]; total: number } {
    this.initMigrationTable();
    const pendingFiles = this.getPendingMigrations();

    if (pendingFiles.length === 0) {
      logger.info('Database is already up to date. No pending migrations.');
      return { applied: [], total: this.getAppliedMigrations().length };
    }

    logger.info(`Found ${pendingFiles.length} pending migration(s) to execute.`);
    const applied: string[] = [];

    for (const file of pendingFiles) {
      const filePath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Applying migration: ${file}`);

      const applyTx = this.db.transaction(() => {
        // Execute the migration SQL
        this.db.exec(sql);

        // Record the migration
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        this.db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, DATETIME(\'now\'))')
          .run(id, file);
      });

      try {
        applyTx();
        applied.push(file);
        logger.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        logger.error(`Failed to apply migration ${file}:`, err);
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    return { applied, total: this.getAppliedMigrations().length };
  }
}
