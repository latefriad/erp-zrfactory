import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { config } from '../config';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../utils/errors';
import { logger } from '../utils/logger';
import { UserRole } from '@zr-erp/shared';

export interface UserSessionPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  isActive: boolean;
}

export class AuthService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateToken(user: UserSessionPayload): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        partnerId: user.partnerId || null,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  public verifyToken(token: string): UserSessionPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as UserSessionPayload;
    } catch (err) {
      throw new UnauthorizedError('Session invalide ou expirée. Veuillez vous reconnecter.');
    }
  }

  public async login(
    email: string,
    pass: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserSessionPayload; token: string }> {
    if (!email || !pass) {
      throw new ValidationError('Email et mot de passe requis.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user with their primary role
    const userRow = this.db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.password_hash, 
        u.is_active, 
        u.partner_id,
        COALESCE(r.name, 'VIEWER') as role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE LOWER(u.email) = ?
    `).get(cleanEmail) as {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      is_active: number;
      partner_id?: string | null;
      role: UserRole;
    } | undefined;

    if (!userRow) {
      logger.warn(`Login failed: user not found (${cleanEmail})`, meta);
      throw new UnauthorizedError('Identifiants incorrects.');
    }

    if (userRow.is_active === 0) {
      logger.warn(`Login failed: user is deactivated (${cleanEmail})`, meta);
      throw new UnauthorizedError('Ce compte utilisateur est désactivé. Contactez l\'administrateur.');
    }

    const isMatch = await this.verifyPassword(pass, userRow.password_hash);
    if (!isMatch) {
      logger.warn(`Login failed: invalid password (${cleanEmail})`, meta);
      throw new UnauthorizedError('Identifiants incorrects.');
    }

    const sessionUser: UserSessionPayload = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      partnerId: userRow.partner_id,
      isActive: true,
    };

    const token = this.generateToken(sessionUser);

    // Audit log
    this.logAudit({
      userId: userRow.id,
      userName: userRow.name,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userRow.id,
      newValue: JSON.stringify({ role: userRow.role }),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    logger.info(`User logged in successfully: ${userRow.email} [${userRow.role}]`);

    return { user: sessionUser, token };
  }

  public getUserById(userId: string): UserSessionPayload {
    const userRow = this.db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.is_active, 
        u.partner_id,
        COALESCE(r.name, 'VIEWER') as role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
    `).get(userId) as {
      id: string;
      name: string;
      email: string;
      is_active: number;
      partner_id?: string | null;
      role: UserRole;
    } | undefined;

    if (!userRow) {
      throw new NotFoundError('Utilisateur introuvable.');
    }

    return {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      partnerId: userRow.partner_id,
      isActive: userRow.is_active === 1,
    };
  }

  public async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    partnerId?: string | null;
  }, actor?: { id?: string; name?: string }): Promise<UserSessionPayload> {
    const cleanEmail = data.email.trim().toLowerCase();

    const existing = this.db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      throw new ConflictError(`Un utilisateur avec l'adresse email "${cleanEmail}" existe déjà.`);
    }

    // Role check
    const roleRow = this.db.prepare('SELECT id FROM roles WHERE name = ?').get(data.role) as { id: string } | undefined;
    if (!roleRow) {
      throw new ValidationError(`Rôle invalide: ${data.role}`);
    }

    // Partner check if role is PARTNER
    if (data.role === UserRole.PARTNER && !data.partnerId) {
      throw new ValidationError('Un compte avec le rôle PARTNER doit être lié à un associé existant.');
    }

    const passwordHash = await this.hashPassword(data.password);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const createTx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO users (id, name, email, password_hash, is_active, partner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, DATETIME('now'), DATETIME('now'))
      `).run(userId, data.name.trim(), cleanEmail, passwordHash, data.partnerId || null);

      this.db.prepare(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (?, ?)
      `).run(userId, roleRow.id);

      this.logAudit({
        userId: actor?.id,
        userName: actor?.name || 'System',
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: userId,
        newValue: JSON.stringify({ name: data.name, email: cleanEmail, role: data.role }),
      });
    });

    createTx();

    return {
      id: userId,
      name: data.name,
      email: cleanEmail,
      role: data.role,
      partnerId: data.partnerId || null,
      isActive: true,
    };
  }

  private logAudit(entry: {
    userId?: string | null;
    userName?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string | null;
    newValue?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), ?, ?)
      `).run(
        id,
        entry.userId || null,
        entry.userName || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.oldValue || null,
        entry.newValue || null,
        entry.ip || null,
        entry.userAgent || null
      );
    } catch (err) {
      logger.error('Failed to write audit log:', err);
    }
  }
}
