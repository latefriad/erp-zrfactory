import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number };
    if (row && row.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({
    success: true,
    data: {
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      service: 'ZR Factory ERP API'
    }
  });
});

export default router;
