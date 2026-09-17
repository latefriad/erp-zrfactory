import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app';
import { AuditService } from '../src/services/auditService';
import { SystemService } from '../src/services/systemService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { config } from '../src/config';

describe('Phase 9: System Settings, Audit Logs Explorer & Database Backup', () => {
  let db: Database.Database;
  let auditService: AuditService;
  let systemService: SystemService;
  let authService: AuthService;
  let app: any;
  let createdBackupFiles: string[] = [];

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    auditService = new AuditService(db);
    systemService = new SystemService(db);
    authService = new AuthService(db);
    app = createApp();
    createdBackupFiles = [];
  });

  afterEach(() => {
    // Clean up any backup files created during tests
    for (const file of createdBackupFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // ignore cleanup errors
      }
    }
    closeDatabase();
  });

  describe('Audit Service', () => {
    it('should list seeded audit logs with pagination', () => {
      const result = auditService.listLogs({ limit: 10, offset: 0 });
      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(result.logs.length);

      const first = result.logs[0];
      expect(first.id).toBeDefined();
      expect(first.action).toBeDefined();
      expect(first.entityType).toBeDefined();
      expect(first.timestamp).toBeDefined();
    });

    it('should filter audit logs by action', () => {
      // Seeded logs contain LOGIN, CREATE, SEED_INIT actions
      const result = auditService.listLogs({ action: 'SEED_INIT' });
      expect(result.logs.length).toBeGreaterThan(0);
      for (const log of result.logs) {
        expect(log.action).toBe('SEED_INIT');
      }
    });

    it('should filter audit logs by entityType', () => {
      const result = auditService.listLogs({ entityType: 'SYSTEM' });
      expect(result.logs.length).toBeGreaterThan(0);
      for (const log of result.logs) {
        expect(log.entityType).toBe('SYSTEM');
      }
    });

    it('should filter audit logs by search query', () => {
      const result = auditService.listLogs({ search: 'SYSTEM' });
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should retrieve a single audit log with parsed old and new values', () => {
      const result = auditService.listLogs({ limit: 1 });
      const logId = result.logs[0].id;

      const single = auditService.getLogById(logId);
      expect(single.id).toBe(logId);
      expect(single.action).toBe(result.logs[0].action);
    });

    it('should return aggregated audit stats', () => {
      const stats = auditService.getAuditStats();
      expect(stats).toBeDefined();
      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(typeof stats.byAction).toBe('object');
      expect(typeof stats.byEntity).toBe('object');
      expect(Array.isArray(stats.recentActors)).toBe(true);
    });
  });

  describe('System Service', () => {
    it('should get system settings and settings map', () => {
      const { settings, map } = systemService.getSettings();
      expect(settings.length).toBeGreaterThanOrEqual(4);
      expect(map['company_name']).toBe('ZR FACTORY');
      expect(map['currency']).toBe('DZD');
      expect(map['partner_split_riad']).toBe('30');
      expect(map['partner_split_brother']).toBe('70');
    });

    it('should update a system setting and log an audit record', () => {
      const updated = systemService.updateSetting(
        'company_name',
        'ZR Factory Algiers',
        'usr-admin',
        'Administrateur Principal'
      );

      expect(updated.value).toBe('ZR Factory Algiers');

      const { map } = systemService.getSettings();
      expect(map['company_name']).toBe('ZR Factory Algiers');

      // Verify audit log was recorded
      const logs = auditService.listLogs({ action: 'UPDATE_SETTING' });
      expect(logs.logs.length).toBeGreaterThan(0);
      expect(logs.logs[0].entityId).toBe('company_name');
    });

    it('should throw NotFoundError when updating non-existent setting', () => {
      expect(() => {
        systemService.updateSetting('unknown_setting_key', 'val');
      }).toThrow();
    });

    it('should create database backup and list it', async () => {
      const backup = await systemService.createBackup('usr-admin', 'Admin');
      expect(backup).toBeDefined();
      expect(backup.filename).toContain('zr_factory_backup_');
      expect(backup.sizeBytes).toBeGreaterThan(0);
      expect(fs.existsSync(backup.filepath)).toBe(true);
      createdBackupFiles.push(backup.filepath);

      const backups = systemService.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      expect(backups.some(b => b.filename === backup.filename)).toBe(true);
    });

    it('should perform PRAGMA integrity check successfully', () => {
      const integrity = systemService.checkDatabaseIntegrity();
      expect(integrity.status).toBe('ok');
      expect(integrity.result).toBe('ok');
    });
  });

  describe('API Endpoints & RBAC Security', () => {
    let adminToken: string;
    let partnerToken: string;
    let employeeToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      adminToken = (await authService.login('admin@zrfactory.dz', 'admin123456')).token;
      partnerToken = (await authService.login('riad@zrfactory.dz', 'riad123456')).token;
      employeeToken = (await authService.login('employee@zrfactory.dz', 'employee123456')).token;
      viewerToken = (await authService.login('viewer@zrfactory.dz', 'viewer123456')).token;
    });

    it('should allow ADMIN to read audit logs and stats', async () => {
      const resLogs = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resLogs.status).toBe(200);
      expect(resLogs.body.success).toBe(true);
      expect(Array.isArray(resLogs.body.data.logs)).toBe(true);

      const resStats = await request(app)
        .get('/api/audit/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resStats.status).toBe(200);
      expect(resStats.body.data.stats).toBeDefined();
    });

    it('should block non-ADMIN roles from reading audit logs', async () => {
      const resPartner = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(resPartner.status).toBe(403);

      const resEmployee = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(resEmployee.status).toBe(403);

      const resViewer = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(resViewer.status).toBe(403);
    });

    it('should allow authenticated users to view settings but only ADMIN to update', async () => {
      // Authenticated users can view settings
      const resGet = await request(app)
        .get('/api/system/settings')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(resGet.status).toBe(200);
      expect(resGet.body.data.settings).toBeDefined();

      // Employee cannot update settings
      const resForbidden = await request(app)
        .put('/api/system/settings/company_name')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ value: 'Hacked Name' });
      expect(resForbidden.status).toBe(403);

      // Admin can update settings
      const resAdmin = await request(app)
        .put('/api/system/settings/company_name')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'ZR FACTORY ALGERIE' });
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.setting.value).toBe('ZR FACTORY ALGERIE');
    });

    it('should allow ADMIN to trigger backup and check integrity', async () => {
      const resBackup = await request(app)
        .post('/api/system/backup')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resBackup.status).toBe(201);
      expect(resBackup.body.data.backup).toBeDefined();
      if (resBackup.body.data.backup.filepath) {
        createdBackupFiles.push(resBackup.body.data.backup.filepath);
      }

      const resList = await request(app)
        .get('/api/system/backups')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resList.status).toBe(200);
      expect(Array.isArray(resList.body.data.backups)).toBe(true);

      const resIntegrity = await request(app)
        .get('/api/system/integrity')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resIntegrity.status).toBe(200);
      expect(resIntegrity.body.data.status).toBe('ok');
    });

    it('should block non-ADMIN from creating backups or checking integrity', async () => {
      const resBackup = await request(app)
        .post('/api/system/backup')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(resBackup.status).toBe(403);

      const resIntegrity = await request(app)
        .get('/api/system/integrity')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(resIntegrity.status).toBe(403);
    });
  });
});
