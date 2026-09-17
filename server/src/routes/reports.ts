import { Router, Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';
import { authenticate, requireFinanceAccess } from '../middleware/auth';

const router = Router();
const reportService = new ReportService();

// All reporting endpoints require authentication and financial access (ADMIN, PARTNER)
router.use(authenticate);
router.use(requireFinanceAccess(false));

// Income Statement (Compte de Résultat / P&L)
router.get('/income-statement', (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const incomeStatement = reportService.getIncomeStatement(startDate, endDate);
    res.json({
      success: true,
      data: { incomeStatement },
    });
  } catch (error) {
    next(error);
  }
});

// Simplified Balance Sheet (Bilan Simplifié)
router.get('/balance-sheet', (req: Request, res: Response, next: NextFunction) => {
  try {
    const asOfDate = req.query.asOfDate as string | undefined;
    const balanceSheet = reportService.getBalanceSheet(asOfDate);
    res.json({
      success: true,
      data: { balanceSheet },
    });
  } catch (error) {
    next(error);
  }
});

// Product Margin Analysis
router.get('/product-margins', (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const productMargins = reportService.getProductMarginAnalysis(startDate, endDate);
    res.json({
      success: true,
      data: { productMargins },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
