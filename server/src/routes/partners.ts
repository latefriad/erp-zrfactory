import { Router, Request, Response, NextFunction } from 'express';
import { PartnerService } from '../services/partnerService';
import { authenticate, requireFinanceAccess, requireOwnPartnerOrAdmin, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { RecordContributionSchema, RecordWithdrawalSchema } from '../middleware/partnerValidation';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const partnerService = new PartnerService();

// All partner endpoints require authentication and finance access (ADMIN, PARTNER)
router.use(authenticate);
router.use(requireFinanceAccess(false));

// List all partners with live computed balance
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const partners = partnerService.listPartners(req.user);
    res.json({
      success: true,
      data: { partners },
    });
  } catch (error) {
    next(error);
  }
});

// List all partner transactions
router.get('/transactions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.query.partnerId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const transactions = partnerService.listAllTransactions({ partnerId, limit });
    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
});

// Get single partner by ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = partnerService.getPartnerById(req.params.id, req.user);
    res.json({
      success: true,
      data: { partner },
    });
  } catch (error) {
    next(error);
  }
});

// Get partner transactions
router.get('/:id/transactions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const transactions = partnerService.listAllTransactions({ partnerId: req.params.id, limit });
    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
});

// Record capital contribution (increases partner balance, credits cash account)
router.post(
  '/:id/contribution',
  requireFinanceAccess(true),
  validateBody(RecordContributionSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = partnerService.recordContribution(
        {
          ...req.body,
          partnerId: req.params.id,
        },
        req.user?.id,
        req.user?.name
      );

      res.status(201).json({
        success: true,
        message: 'Apport de capital enregistré avec succès',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Record partner withdrawal (decreases partner balance, debits cash account)
router.post(
  '/:id/withdrawal',
  requireFinanceAccess(true),
  requireOwnPartnerOrAdmin('id'),
  validateBody(RecordWithdrawalSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = partnerService.recordWithdrawal(
        {
          ...req.body,
          partnerId: req.params.id,
        },
        req.user?.id,
        req.user?.name
      );

      res.status(201).json({
        success: true,
        message: 'Retrait associé enregistré avec succès',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update partner information & ownership percentage (ADMIN only)
router.put('/:id', requireRole(UserRole.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = partnerService.updatePartner(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.name
    );
    res.json({
      success: true,
      message: 'Informations de l\'associé mises à jour avec succès',
      data: { partner },
    });
  } catch (error) {
    next(error);
  }
});

// Create new partner (ADMIN only)
router.post('/', requireRole(UserRole.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = partnerService.createPartner(
      req.body,
      req.user?.id,
      req.user?.name
    );
    res.status(201).json({
      success: true,
      message: 'Nouvel associé créé avec succès',
      data: { partner },
    });
  } catch (error) {
    next(error);
  }
});

// Delete partner (ADMIN only)
router.delete('/:id', requireRole(UserRole.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  try {
    partnerService.deletePartner(
      req.params.id,
      req.user?.id,
      req.user?.name
    );
    res.json({
      success: true,
      message: 'Associé supprimé avec succès',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
