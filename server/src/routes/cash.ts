import { Router, Request, Response, NextFunction } from 'express';
import { CashService } from '../services/cashService';
import { authenticate, requireFinanceAccess, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CreateCashAccountSchema, TransferFundsSchema } from '../middleware/partnerValidation';
import { CashTransactionType, UserRole } from '@zr-erp/shared';

const router = Router();
const cashService = new CashService();

// All cash endpoints require authentication and finance access (ADMIN, PARTNER)
router.use(authenticate);
router.use(requireFinanceAccess(false));

// List all cash accounts
router.get('/accounts', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = cashService.listAccounts();
    res.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    next(error);
  }
});

// Get cash account by ID with recent transactions
router.get('/accounts/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = cashService.getAccountById(req.params.id);
    res.json({
      success: true,
      data: { account },
    });
  } catch (error) {
    next(error);
  }
});

// Create new cash account (ADMIN only)
router.post(
  '/accounts',
  requireRole(UserRole.ADMIN),
  validateBody(CreateCashAccountSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = cashService.createAccount(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        message: 'Compte de trésorerie créé avec succès',
        data: { account },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Inter-account fund transfer
router.post(
  '/transfer',
  requireFinanceAccess(true),
  validateBody(TransferFundsSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = cashService.transferFunds(req.body, req.user?.id, req.user?.name);
      res.status(200).json({
        success: true,
        message: 'Transfert inter-comptes exécuté avec succès',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List cash ledger transactions with filters
router.get('/transactions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const type = req.query.type as CashTransactionType | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const transactions = cashService.listTransactions({
      accountId,
      type,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
