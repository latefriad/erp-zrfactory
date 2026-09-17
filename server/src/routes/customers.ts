import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../middleware/orderValidation';
import { UserRole } from '@zr-erp/shared';

const router = Router();
const customerService = new CustomerService();

// Require authentication
router.use(authenticate);

// List customers
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const wilaya = req.query.wilaya as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const customers = customerService.listCustomers({ search, wilaya, limit, offset });
    res.json({
      success: true,
      data: { customers },
    });
  } catch (error) {
    next(error);
  }
});

// Get customer profile and lifetime value
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = customerService.getCustomerProfile(req.params.id);
    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

// Create new customer (ADMIN, PARTNER, EMPLOYEE)
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateCustomerSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = customerService.createCustomer(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: { customer },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update customer
router.put(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdateCustomerSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = customerService.updateCustomer(req.params.id, req.body, req.user?.id);
      res.json({
        success: true,
        data: { customer },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete customer (ADMIN, PARTNER)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      customerService.deleteCustomer(req.params.id, req.user?.id);
      res.json({
        success: true,
        message: 'Client supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
