import { Router, Request, Response, NextFunction } from 'express';
import { MaterialService } from '../services/materialService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, CreateMaterialSchema } from '../middleware/validation';
import { UserRole } from '@zr-erp/shared';
import { z } from 'zod';

const router = Router();
const materialService = new MaterialService();

router.use(authenticate);

// List raw materials
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const lowStockOnly = req.query.lowStock === 'true';

    const materials = materialService.listMaterials({ search, lowStockOnly });
    res.json({
      success: true,
      data: { materials },
    });
  } catch (error) {
    next(error);
  }
});

// Create raw material
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateMaterialSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const material = materialService.createMaterial(req.body);
      res.status(201).json({
        success: true,
        data: { material },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Adjust raw material stock
router.patch(
  '/:id/stock',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(z.object({ delta: z.number() })),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const material = materialService.adjustStock(req.params.id, req.body.delta);
      res.json({
        success: true,
        data: { material },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
