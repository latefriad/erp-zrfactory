import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseMigrator } from '../src/db/migrator';

describe('Database Migrator Engine', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should initialize schema_migrations table', () => {
    const migrator = new DatabaseMigrator(db);
    migrator.initMigrationTable();

    const row = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'
    `).get();

    expect(row).toBeDefined();
  });

  it('should run migrations atomically and be idempotent on consecutive runs', () => {
    const migrator = new DatabaseMigrator(db);

    const firstRun = migrator.runMigrations();
    expect(firstRun.applied.length).toBeGreaterThan(0);
    expect(firstRun.total).toBe(firstRun.applied.length);

    // Second run should apply 0 pending migrations
    const secondRun = migrator.runMigrations();
    expect(secondRun.applied.length).toBe(0);
    expect(secondRun.total).toBe(firstRun.total);
  });

  it('should list applied migrations accurately', () => {
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();

    const applied = migrator.getAppliedMigrations();
    expect(applied.length).toBeGreaterThan(0);
    expect(applied[0].name).toBe('001_initial_schema.sql');
  });
});
