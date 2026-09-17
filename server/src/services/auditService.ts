import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError } from '../utils/errors';

export interface AuditLogFilterOptions {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any | null;
  newValue?: any | null;
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listLogs(filters?: AuditLogFilterOptions): { logs: AuditLogEntry[]; total: number } {
    let sql = `
      SELECT id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp, ip_address, user_agent
      FROM audit_logs
      WHERE 1=1
    `;
    let countSql = `SELECT COUNT(*) as c FROM audit_logs WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];

    if (filters?.userId) {
      sql += ` AND user_id = ?`;
      countSql += ` AND user_id = ?`;
      params.push(filters.userId);
      countParams.push(filters.userId);
    }

    if (filters?.action) {
      sql += ` AND action = ?`;
      countSql += ` AND action = ?`;
      params.push(filters.action);
      countParams.push(filters.action);
    }

    if (filters?.entityType) {
      sql += ` AND entity_type = ?`;
      countSql += ` AND entity_type = ?`;
      params.push(filters.entityType);
      countParams.push(filters.entityType);
    }

    if (filters?.startDate) {
      sql += ` AND DATE(timestamp) >= DATE(?)`;
      countSql += ` AND DATE(timestamp) >= DATE(?)`;
      params.push(filters.startDate);
      countParams.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND DATE(timestamp) <= DATE(?)`;
      countSql += ` AND DATE(timestamp) <= DATE(?)`;
      params.push(filters.endDate);
      countParams.push(filters.endDate);
    }

    if (filters?.search) {
      const q = `%${filters.search}%`;
      sql += ` AND (action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR entity_id LIKE ? OR newValue LIKE ?)`;
      countSql += ` AND (action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR entity_id LIKE ? OR newValue LIKE ?)`;
      params.push(q, q, q, q, q);
      countParams.push(q, q, q, q, q);
    }

    sql += ` ORDER BY timestamp DESC`;

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as any[];
    const totalRow = this.db.prepare(countSql).get(...countParams) as any;
    const total = Number(totalRow?.c || 0);

    const logs: AuditLogEntry[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      oldValue: this.safeParseJson(r.old_value),
      newValue: this.safeParseJson(r.newValue),
      timestamp: r.timestamp,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
    }));

    return { logs, total };
  }

  public getLogById(id: string): AuditLogEntry {
    const row = this.db.prepare(`
      SELECT id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp, ip_address, user_agent
      FROM audit_logs
      WHERE id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Entrée d'audit introuvable: ${id}`);
    }

    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldValue: this.safeParseJson(row.old_value),
      newValue: this.safeParseJson(row.newValue),
      timestamp: row.timestamp,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }

  public getAuditStats(): {
    totalLogs: number;
    byAction: Record<string, number>;
    byEntity: Record<string, number>;
    recentActors: { userName: string; count: number }[];
  } {
    const totalRow = this.db.prepare(`SELECT COUNT(*) as c FROM audit_logs`).get() as any;
    const totalLogs = Number(totalRow?.c || 0);

    const actionRows = this.db.prepare(`
      SELECT action, COUNT(*) as c FROM audit_logs GROUP BY action ORDER BY c DESC
    `).all() as any[];

    const byAction: Record<string, number> = {};
    for (const r of actionRows) {
      byAction[r.action] = Number(r.c);
    }

    const entityRows = this.db.prepare(`
      SELECT entity_type, COUNT(*) as c FROM audit_logs GROUP BY entity_type ORDER BY c DESC
    `).all() as any[];

    const byEntity: Record<string, number> = {};
    for (const r of entityRows) {
      byEntity[r.entity_type] = Number(r.c);
    }

    const actorRows = this.db.prepare(`
      SELECT COALESCE(user_name, 'Système') as actor, COUNT(*) as c
      FROM audit_logs
      GROUP BY user_name
      ORDER BY c DESC
      LIMIT 5
    `).all() as any[];

    const recentActors = actorRows.map(r => ({
      userName: r.actor,
      count: Number(r.c),
    }));

    return {
      totalLogs,
      byAction,
      byEntity,
      recentActors,
    };
  }

  private safeParseJson(value?: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
