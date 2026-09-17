import { Router, Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplierService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CreateSupplierSchema, UpdateSupplierSchema } from '../middleware/expenseValidation';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const supplierService = new SupplierService();

// All supplier endpoints require authentication
router.use(authenticate);

// List suppliers (all roles)
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const suppliers = supplierService.listSuppliers({ search });
    res.json({
      success: true,
      data: { suppliers },
    });
  } catch (error) {
    next(error);
  }
});

// Get supplier profile and purchase history
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = supplierService.getSupplierProfile(req.params.id);
    res.json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    next(error);
  }
});

// Create supplier (ADMIN, PARTNER, EMPLOYEE)
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateSupplierSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const supplier = supplierService.createSupplier(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update supplier (ADMIN, PARTNER, EMPLOYEE)
router.put(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdateSupplierSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const supplier = supplierService.updateSupplier(req.params.id, req.body, req.user?.id);
      res.json({
        success: true,
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete supplier (ADMIN, PARTNER)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      supplierService.deleteSupplier(req.params.id, req.user?.id);
      res.json({
        success: true,
        message: 'Fournisseur supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
