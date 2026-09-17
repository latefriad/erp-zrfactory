import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError } from '../utils/errors';
import { UserRole } from '@zr-erp/shared';
import { AuthService } from './authService';

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  partnerName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listUsers(): UserDetail[] {
    const rows = this.db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.is_active as isActive, 
        u.partner_id as partnerId,
        p.name as partnerName,
        COALESCE(r.name, 'VIEWER') as role,
        u.created_at as createdAt,
        u.updated_at as updatedAt
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN partners p ON p.id = u.partner_id
      ORDER BY u.created_at DESC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      isActive: r.isActive === 1,
    }));
  }

  public toggleUserStatus(id: string, isActive: boolean, actor?: { id?: string; name?: string }): void {
    const user = this.db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(id) as {
      id: string;
      name: string;
      is_active: number;
    } | undefined;

    if (!user) {
      throw new NotFoundError('Utilisateur introuvable.');
    }

    if (actor?.id === id && !isActive) {
      throw new ValidationError('Vous ne pouvez pas désactiver votre propre compte administrateur.');
    }

    const newStatus = isActive ? 1 : 0;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE users 
        SET is_active = ?, updated_at = DATETIME('now')
        WHERE id = ?
      `).run(newStatus, id);

      const audId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp)
        VALUES (?, ?, ?, 'STATUS_CHANGE', 'USER', ?, ?, ?, DATETIME('now'))
      `).run(
        audId,
        actor?.id || null,
        actor?.name || 'System',
        id,
        JSON.stringify({ isActive: user.is_active === 1 }),
        JSON.stringify({ isActive })
      );
    });

    tx();
  }
}
