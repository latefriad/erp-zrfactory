import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { AuthService } from '../services/authService';

const router = Router();
const dashboardService = new DashboardService();
const authService = new AuthService();

// GET /api/dashboard/summary - Live cross-module operational & financial summary
router.get('/summary', (req: Request, res: Response) => {
  let userRole: string | undefined = undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = authService.verifyToken(token);
      userRole = decoded.role;
    } catch {
      // Non-blocking for open dashboard metric inspection
    }
  }

  const summary = dashboardService.getSummary(userRole);
  res.json({
    success: true,
    data: summary,
  });
});

export default router;
