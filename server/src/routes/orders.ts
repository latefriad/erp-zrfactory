import { Router, Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/orderService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  UpdatePaymentStatusSchema,
  UpdateShippingSchema
} from '../middleware/orderValidation';
import { UserRole, OrderStatus, PaymentStatus } from '@zr-erp/shared';
import { z } from 'zod';

const router = Router();
const orderService = new OrderService();

const StoreOrderSchema = z.object({
  customerName: z.string().min(1, 'Le nom est obligatoire'),
  customerPhone: z.string().min(8, 'Le numéro de téléphone est obligatoire'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  shippingWilaya: z.string().min(1, 'La wilaya est obligatoire'),
  shippingCommune: z.string().optional(),
  shippingAddress: z.string().optional(),
  deliveryOption: z.enum(['HOME', 'STOP_DESK']).optional(),
  deliveryCompany: z.string().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  customizationTechnique: z.enum(['DTF', 'BRODERIE']).optional(),
  designFileName: z.string().optional(),
  designFileUrl: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().nullable().optional(),
    quantity: z.number().int().positive('La quantité doit être supérieure à 0'),
    notes: z.string().optional(),
  })).min(1, 'Au moins un produit requis'),
});

// Public: Store guest order checkout
router.post('/store-order', validateBody(StoreOrderSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = orderService.createStoreOrder(req.body);
    res.status(201).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Public: Order & parcel tracking for customers
router.get('/track/:query', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tracking = orderService.trackOrder(req.params.query);
    res.json({
      success: true,
      data: { tracking },
    });
  } catch (error) {
    next(error);
  }
});

// Require authentication for all internal order endpoints
router.use(authenticate);

// Get order pipeline statistics (KPIs)
router.get('/stats', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = orderService.getOrderStats();
    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

// List orders with filters
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as OrderStatus | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const customerId = req.query.customerId as string | undefined;
    const wilaya = req.query.wilaya as string | undefined;
    const search = req.query.search as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const orders = orderService.listOrders({
      status,
      paymentStatus,
      customerId,
      wilaya,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order detail
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = orderService.getOrderById(req.params.id);
    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Create order (ADMIN, PARTNER, EMPLOYEE)
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateOrderSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = orderService.createOrder(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update order status (ADMIN, PARTNER, EMPLOYEE)
router.patch(
  '/:id/status',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdateOrderStatusSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = orderService.updateOrderStatus(req.params.id, req.body.status, req.user?.id);
      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update payment status (ADMIN, PARTNER, EMPLOYEE)
router.patch(
  '/:id/payment',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdatePaymentStatusSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = orderService.updatePaymentStatus(req.params.id, req.body.paymentStatus, req.user?.id);
      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update shipping info (ADMIN, PARTNER, EMPLOYEE)
router.patch(
  '/:id/shipping',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdateShippingSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = orderService.updateShippingInfo(req.params.id, req.body, req.user?.id);
      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete order (ADMIN, PARTNER)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      orderService.deleteOrder(req.params.id, req.user?.id);
      res.json({
        success: true,
        message: 'Commande supprimée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
