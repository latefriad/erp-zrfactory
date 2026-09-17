import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/connection';
import { config } from '../config';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

export interface BackupFileInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export class SystemService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  private get backupDir(): string {
    const dbPath = config.dbFilePath || path.resolve(process.cwd(), 'data/zr_factory.sqlite');
    const dir = path.resolve(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public getSettings(): { settings: SystemSetting[]; map: Record<string, string> } {
    const rows = this.db.prepare(`
      SELECT key, value, description, updated_at
      FROM settings
      ORDER BY key ASC
    `).all() as any[];

    const settings: SystemSetting[] = rows.map(r => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedAt: r.updated_at,
    }));

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return { settings, map };
  }

  public updateSetting(
    key: string,
    value: string,
    actorId?: string,
    actorName?: string
  ): SystemSetting {
    const existing = this.db.prepare(`SELECT * FROM settings WHERE key = ?`).get(key) as any;
    if (!existing) {
      throw new NotFoundError(`Paramètre système introuvable: ${key}`);
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE settings
      SET value = ?, updated_at = ?
      WHERE key = ?
    `).run(value, now, key);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'UPDATE_SETTING',
      entityType: 'SETTING',
      entityId: key,
      oldValue: existing.value,
      newValue: value,
    });

    return {
      key,
      value,
      description: existing.description,
      updatedAt: now,
    };
  }

  public async createBackup(actorId?: string, actorName?: string): Promise<BackupFileInfo> {
    const dir = this.backupDir;
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `zr_factory_backup_${timestamp}.sqlite`;
    const filepath = path.join(dir, filename);

    // If database is an in-memory database (e.g. during Vitest), backup natively
    await this.db.backup(filepath);

    const stats = fs.statSync(filepath);
    const sizeBytes = stats.size;
    const sizeFormatted = this.formatBytes(sizeBytes);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'CREATE_BACKUP',
      entityType: 'DATABASE',
      entityId: filename,
      newValue: JSON.stringify({ filename, sizeBytes }),
    });

    return {
      filename,
      filepath,
      sizeBytes,
      sizeFormatted,
      createdAt: stats.birthtime.toISOString(),
    };
  }

  public listBackups(): BackupFileInfo[] {
    const dir = this.backupDir;
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sqlite'));
    const backups: BackupFileInfo[] = [];

    for (const f of files) {
      const p = path.join(dir, f);
      try {
        const stats = fs.statSync(p);
        backups.push({
          filename: f,
          filepath: p,
          sizeBytes: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
        });
      } catch {
        // ignore individual file read errors
      }
    }

    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public checkDatabaseIntegrity(): { status: 'ok' | 'error'; result: string } {
    try {
      const row = this.db.pragma('integrity_check') as any[];
      const checkResult = Array.isArray(row) && row.length > 0 ? (row[0].integrity_check || 'ok') : 'ok';
      return {
        status: checkResult === 'ok' ? 'ok' : 'error',
        result: String(checkResult),
      };
    } catch (error: any) {
      return {
        status: 'error',
        result: error.message || 'Échec du contrôle d\'intégrité',
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private logAudit(entry: {
    userId?: string | null;
    userName?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string | null;
    newValue?: string | null;
  }) {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
      `).run(
        id,
        entry.userId || null,
        entry.userName || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.oldValue || null,
        entry.newValue || null
      );
    } catch {
      // Ignore audit failure
    }
  }
}
