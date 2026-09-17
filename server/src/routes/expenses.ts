import { Router, Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expenseService';
import { authenticate, requireFinanceAccess } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CreateExpenseSchema } from '../middleware/expenseValidation';
import { PaymentMethod } from '@zr-erp/shared';

const router = Router();
const expenseService = new ExpenseService();

// All expense endpoints require authentication and strict finance access (ADMIN, PARTNER)
router.use(authenticate);
router.use(requireFinanceAccess(false));

// Get expense statistics & category breakdown
router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const stats = expenseService.getExpenseStats({ startDate, endDate });
    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

// List all expense categories
router.get('/categories', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = expenseService.listCategories();
    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

// List expenses with filters
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const cashAccountId = req.query.cashAccountId as string | undefined;
    const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const expenses = expenseService.listExpenses({
      categoryId,
      supplierId,
      cashAccountId,
      paymentMethod,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: { expenses },
    });
  } catch (error) {
    next(error);
  }
});

// Get single expense
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = expenseService.getExpenseById(req.params.id);
    res.json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

// Create new expense (ADMIN, PARTNER with mutation permission)
router.post(
  '/',
  requireFinanceAccess(true),
  validateBody(CreateExpenseSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = expenseService.createExpense(req.body, req.user?.id, req.user?.name);
      res.status(201).json({
        success: true,
        data: { expense },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete expense (ADMIN, PARTNER)
router.delete(
  '/:id',
  requireFinanceAccess(true),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      expenseService.deleteExpense(req.params.id, req.user?.id);
      res.json({
        success: true,
        message: 'Dépense supprimée et trésorerie réajustée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
