import { Router, Request, Response, NextFunction } from 'express';
import { AccountingPeriodService } from '../services/accountingPeriodService';
import { authenticate, requireFinanceAccess, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CreatePeriodSchema } from '../middleware/accountingPeriodValidation';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const periodService = new AccountingPeriodService();

// All accounting period endpoints require authentication and financial visibility
router.use(authenticate);
router.use(requireFinanceAccess(false));

// List all accounting periods
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const periods = periodService.listPeriods();
    res.json({
      success: true,
      data: { periods },
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed period by ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = periodService.getPeriodById(req.params.id);
    res.json({
      success: true,
      data: { period },
    });
  } catch (error) {
    next(error);
  }
});

// Create new period (ADMIN only)
router.post(
  '/',
  requireRole(UserRole.ADMIN),
  validateBody(CreatePeriodSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodService.createPeriod(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        message: 'Période comptable créée avec succès',
        data: { period },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Close period (ADMIN only)
router.post(
  '/:id/close',
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodService.closePeriod(req.params.id, req.user?.id, req.user?.name);
      res.status(200).json({
        success: true,
        message: 'Période comptable clôturée avec succès',
        data: { period },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reopen period (ADMIN only)
router.post(
  '/:id/reopen',
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodService.reopenPeriod(req.params.id, req.user?.id, req.user?.name);
      res.status(200).json({
        success: true,
        message: 'Période comptable réouverte avec succès',
        data: { period },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Distribute profits (30% Riad / 70% Brother) (ADMIN only)
router.post(
  '/:id/distribute',
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = periodService.distributeProfits(req.params.id, req.user?.id, req.user?.name);
      res.status(200).json({
        success: true,
        message: 'Bénéfices de la période distribués avec succès aux associés',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
