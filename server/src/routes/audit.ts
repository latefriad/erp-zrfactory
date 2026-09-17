import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const auditService = new AuditService();

// All audit trail endpoints require authentication and strict ADMIN role
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// List audit logs with pagination and filters
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = auditService.listLogs({
      userId,
      action,
      entityType,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get audit activity stats
router.get('/stats', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = auditService.getAuditStats();
    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

// Get single audit log
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = auditService.getLogById(req.params.id);
    res.json({
      success: true,
      data: { log },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
