import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/connection';
import { DatabaseMigrator } from '../db/migrator';
import { SystemService } from '../services/systemService';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@zr-erp/shared';

const router = Router();

router.get('/system/info', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const migrator = new DatabaseMigrator(db);
    const appliedMigrations = migrator.getAppliedMigrations();

    const partners = db.prepare('SELECT id, name, ownership_percentage, initial_capital FROM partners').all();
    const cashAccounts = db.prepare('SELECT id, name, type, balance, currency FROM cash_accounts').all();
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

    res.json({
      success: true,
      data: {
        app: 'ZR Factory ERP',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        migrations: appliedMigrations,
        partners,
        cashAccounts,
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// System Settings Endpoints

const systemService = new SystemService();

// Get settings (authenticated users)
router.get('/system/settings', authenticate, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = systemService.getSettings();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Update setting (ADMIN only)
router.put('/system/settings/:key', authenticate, requireRole(UserRole.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'La valeur du paramètre est requise' });
    }
    const updated = systemService.updateSetting(req.params.key, String(value), req.user?.id, req.user?.name);
    res.json({
      success: true,
      message: 'Paramètre mis à jour avec succès',
      data: { setting: updated },
    });
  } catch (error) {
    next(error);
  }
});

// Create SQLite database backup (ADMIN only)
router.post('/system/backup', authenticate, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backup = await systemService.createBackup(req.user?.id, req.user?.name);
    res.status(201).json({
      success: true,
      message: 'Sauvegarde de la base de données créée avec succès',
      data: { backup },
    });
  } catch (error) {
    next(error);
  }
});

// List backups (ADMIN only)
router.get('/system/backups', authenticate, requireRole(UserRole.ADMIN), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const backups = systemService.listBackups();
    res.json({
      success: true,
      data: { backups },
    });
  } catch (error) {
    next(error);
  }
});

// SQLite database integrity check (ADMIN only)
router.get('/system/integrity', authenticate, requireRole(UserRole.ADMIN), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const check = systemService.checkDatabaseIntegrity();
    res.json({
      success: true,
      data: check,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
