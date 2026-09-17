import { Router, Request, Response, NextFunction } from 'express';
import { ProductionService } from '../services/productionService';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole, ProductionStatus } from '@zr-erp/shared';
import { ValidationError } from '../utils/errors';

const router = Router();
const productionService = new ProductionService();

// All production floor endpoints require authentication
router.use(authenticate);

// 1. Get live atelier metrics
router.get('/metrics', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = productionService.getMetrics();
    res.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    next(error);
  }
});

// 2. List production queue
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const operatorId = req.query.operatorId as string | undefined;
    const wilaya = req.query.wilaya as string | undefined;

    const items = productionService.listQueue({
      status,
      search,
      operatorId,
      wilaya,
    });

    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
});

// 3. Get single production item details
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = productionService.getItemById(req.params.id);
    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// 4. Advance or update production status (EMPLOYEE, PARTNER, ADMIN)
router.patch(
  '/:id/status',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        throw new ValidationError('Le statut de production est obligatoire.');
      }

      const item = productionService.updateStatus(
        req.params.id,
        status as ProductionStatus,
        req.user?.id,
        req.user?.name,
        notes
      );

      res.json({
        success: true,
        data: { item },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 5. Report quality defect and optionally request reprint (EMPLOYEE, PARTNER, ADMIN)
router.post(
  '/:id/defect',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { defectReason, requiresReprint } = req.body;

      const item = productionService.logDefect(
        req.params.id,
        defectReason,
        !!requiresReprint,
        req.user?.id,
        req.user?.name
      );

      res.json({
        success: true,
        data: { item },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
