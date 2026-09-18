import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';

describe('HTTP API Endpoints & Middlewares', () => {
  let app: any;
  let testDb: Database.Database;

  beforeAll(() => {
    // Setup in-memory test database instance
    testDb = new Database(':memory:');
    const migrator = new DatabaseMigrator(testDb);
    migrator.runMigrations();
    seedDatabase(testDb);

    setDatabaseInstance(testDb);
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /api/health should return status 200 and healthy database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
  });

  it('GET /api/system/info should return partners and migrations info', async () => {
    const res = await request(app).get('/api/system/info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.partners.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.migrations.length).toBeGreaterThan(0);
  });

  it('GET /api/dashboard/summary should return financial metrics structure', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.financials).toHaveProperty('revenue');
    expect(res.body.data.financials).toHaveProperty('cashBalance');
    expect(res.body.data.partners.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/nonexistent should return 404 with structured JSON error', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET / should serve the SPA index.html when client dist exists', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
  });
});
