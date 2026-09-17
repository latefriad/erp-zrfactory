import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { UserRole } from '@zr-erp/shared';

describe('Phase 2: Authentication, Users, Roles & Permissions', () => {
  let db: Database.Database;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Password Hashing & Token Engine', () => {
    it('should hash passwords and verify successfully', async () => {
      const rawPassword = 'SecurePassword123!';
      const hash = await authService.hashPassword(rawPassword);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await authService.verifyPassword(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isWrong = await authService.verifyPassword('WrongPassword', hash);
      expect(isWrong).toBe(false);
    });

    it('should sign and verify JWT tokens accurately', () => {
      const payload = {
        id: 'usr-123',
        name: 'Test User',
        email: 'test@zrfactory.dz',
        role: UserRole.PARTNER,
        partnerId: 'partner-riad',
        isActive: true,
      };

      const token = authService.generateToken(payload);
      expect(token).toBeDefined();

      const decoded = authService.verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(UserRole.PARTNER);
      expect(decoded.partnerId).toBe('partner-riad');
    });
  });

  describe('User Authentication & Login Flow', () => {
    it('should authenticate seeded admin user with valid credentials', async () => {
      const result = await authService.login('admin@zrfactory.dz', 'admin123456');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('admin@zrfactory.dz');
      expect(result.user.role).toBe(UserRole.ADMIN);

      // Verify audit log entry
      const audit = db.prepare('SELECT * FROM audit_logs WHERE action = \'LOGIN\' AND entity_id = ?').get('usr-admin');
      expect(audit).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      await expect(
        authService.login('admin@zrfactory.dz', 'wrongpassword')
      ).rejects.toThrow('Identifiants incorrects.');
    });

    it('should reject login for non-existent user', async () => {
      await expect(
        authService.login('nonexistent@zrfactory.dz', 'anypassword')
      ).rejects.toThrow('Identifiants incorrects.');
    });

    it('should reject login for deactivated user', async () => {
      // Deactivate employee account
      db.prepare('UPDATE users SET is_active = 0 WHERE email = ?').run('employee@zrfactory.dz');

      await expect(
        authService.login('employee@zrfactory.dz', 'employee123456')
      ).rejects.toThrow('Ce compte utilisateur est désactivé.');
    });
  });

  describe('Role-Based Access Control (RBAC) via HTTP API', () => {
    it('POST /api/auth/login should return JWT token and user info', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'riad@zrfactory.dz',
          password: 'riad123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe(UserRole.PARTNER);
      expect(res.body.data.user.partnerId).toBe('partner-riad');
    });

    it('GET /api/auth/me should return current user profile when authenticated', async () => {
      const { token } = await authService.login('brother@zrfactory.dz', 'brother123456');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('brother@zrfactory.dz');
      expect(res.body.data.user.role).toBe(UserRole.PARTNER);
    });

    it('GET /api/users should allow ADMIN access', async () => {
      const { token } = await authService.login('admin@zrfactory.dz', 'admin123456');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /api/users should FORBID EMPLOYEE access (403 Forbidden)', async () => {
      const { token } = await authService.login('employee@zrfactory.dz', 'employee123456');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/users should FORBID VIEWER access (403 Forbidden)', async () => {
      const { token } = await authService.login('viewer@zrfactory.dz', 'viewer123456');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/users should allow ADMIN to create new employee', async () => {
      const { token } = await authService.login('admin@zrfactory.dz', 'admin123456');

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nouvel Agent DTF',
          email: 'dtf.agent@zrfactory.dz',
          password: 'agentpassword123',
          role: UserRole.EMPLOYEE,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('dtf.agent@zrfactory.dz');

      // Verify audit trail recorded user creation
      const audit = db.prepare('SELECT * FROM audit_logs WHERE action = \'CREATE_USER\' AND entity_id = ?').get(res.body.data.user.id);
      expect(audit).toBeDefined();
    });
  });
});
