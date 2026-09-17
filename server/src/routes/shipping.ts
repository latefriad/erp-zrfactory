import { Router, Request, Response, NextFunction } from 'express';
import { ShippingService } from '../services/shippingService';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole, ManifestStatus } from '@zr-erp/shared';
import { ValidationError } from '../utils/errors';

const router = Router();
const shippingService = new ShippingService();

// All shipping and logistics endpoints require authentication
router.use(authenticate);

// 1. Get live shipping metrics
router.get('/metrics', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = shippingService.getShippingMetrics();
    res.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get ready-to-ship orders queue
router.get('/queue', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const wilaya = req.query.wilaya as string | undefined;
    const carrier = req.query.carrier as string | undefined;

    const orders = shippingService.listShippingQueue({ search, wilaya, carrier });
    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

// 3. List shipping manifests
router.get('/manifests', (req: Request, res: Response, next: NextFunction) => {
  try {
    const carrier = req.query.carrier as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const manifests = shippingService.listManifests({ carrier, status, search });
    res.json({
      success: true,
      data: { manifests },
    });
  } catch (error) {
    next(error);
  }
});

// 4. Get single manifest by ID
router.get('/manifests/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const manifest = shippingService.getManifestById(req.params.id);
    res.json({
      success: true,
      data: { manifest },
    });
  } catch (error) {
    next(error);
  }
});

// 5. Create new batch shipping manifest (EMPLOYEE, PARTNER, ADMIN)
router.post(
  '/manifests',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { carrier, driverName, driverPhone, vehiclePlate, notes, orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new ValidationError('Au moins un colis (commande) doit être sélectionné pour le bordereau.');
      }
      if (!carrier) {
        throw new ValidationError('Le nom du transporteur est obligatoire.');
      }

      const manifest = shippingService.createManifest(
        { carrier, driverName, driverPhone, vehiclePlate, notes, orderIds },
        req.user?.id,
        req.user?.name
      );

      res.status(201).json({
        success: true,
        data: { manifest },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 6. Update manifest status (EMPLOYEE, PARTNER, ADMIN)
router.patch(
  '/manifests/:id/status',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (!status) {
        throw new ValidationError('Le statut du bordereau est obligatoire.');
      }

      const manifest = shippingService.updateManifestStatus(
        req.params.id,
        status as ManifestStatus,
        req.user?.id,
        req.user?.name
      );

      res.json({
        success: true,
        data: { manifest },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 7. Settle & Remit Cash-on-Delivery (COD) into cash account (PARTNER, ADMIN)
router.post(
  '/manifests/:id/remit-cod',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cashAccountId } = req.body;
      if (!cashAccountId) {
        throw new ValidationError('Le compte de trésorerie de destination est obligatoire.');
      }

      const result = shippingService.remitManifestCOD(
        req.params.id,
        cashAccountId,
        req.user?.id,
        req.user?.name
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 8. Mark order as DELIVERED by carrier (EMPLOYEE, PARTNER, ADMIN)
router.post(
  '/orders/:id/deliver',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notes } = req.body;
      const order = shippingService.markOrderDelivered(
        req.params.id,
        req.user?.id,
        req.user?.name,
        notes
      );

      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 9. Mark order as RETURNED by carrier with restock option (EMPLOYEE, PARTNER, ADMIN)
router.post(
  '/orders/:id/return',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { returnReason, restoreInventory } = req.body;
      if (!returnReason || !returnReason.trim()) {
        throw new ValidationError('Le motif du retour est obligatoire.');
      }

      const order = shippingService.markOrderReturned(
        req.params.id,
        returnReason,
        restoreInventory !== undefined ? Boolean(restoreInventory) : true,
        req.user?.id,
        req.user?.name
      );

      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 10. Get 58 Wilayas shipping delivery rates
router.get('/rates', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = shippingService.getShippingRates();
    res.json({
      success: true,
      data: { rates },
    });
  } catch (error) {
    next(error);
  }
});

// 11. Update specific Wilaya shipping rates (ADMIN, PARTNER)
router.put(
  '/rates/:wilayaCode',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const wilayaCode = parseInt(req.params.wilayaCode, 10);
      if (isNaN(wilayaCode)) {
        throw new ValidationError('Code wilaya invalide.');
      }

      const rate = shippingService.updateShippingRate(
        wilayaCode,
        req.body,
        req.user?.id,
        req.user?.name
      );

      res.json({
        success: true,
        data: { rate },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
