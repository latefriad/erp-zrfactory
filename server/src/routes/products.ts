import { Router, Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/productService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, CreateProductSchema, UpdateProductSchema, CostComponentSchema, CreateVariantSchema } from '../middleware/validation';
import { UserRole } from '@zr-erp/shared';
import { z } from 'zod';

const router = Router();
const productService = new ProductService();

// Public: List products (for Store catalog & ERP)
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const products = productService.listProducts({ search, isActive });
    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
});

// Public: Get single product detail
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
});

// Require authentication for all modifying product endpoints
router.use(authenticate);

// Create product (ADMIN, PARTNER, EMPLOYEE)
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateProductSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update product
router.put(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(UpdateProductSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = productService.updateProduct(req.params.id, req.body);
      res.json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add cost component to product
router.post(
  '/:id/components',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CostComponentSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const component = productService.addCostComponent(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: { component },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete cost component
router.delete(
  '/:id/components/:componentId',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      productService.deleteCostComponent(req.params.componentId);
      res.json({
        success: true,
        data: { message: 'Composant de coût supprimé.' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add variant
router.post(
  '/:id/variants',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(CreateVariantSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const variant = productService.addVariant(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: { variant },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Adjust variant stock
router.patch(
  '/:id/variants/:variantId/stock',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  validateBody(z.object({ quantityChange: z.number().int() })),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = productService.updateVariantStock(req.params.variantId, req.body.quantityChange);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete product (ADMIN, PARTNER)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PARTNER),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      productService.deleteProduct(req.params.id);
      res.json({
        success: true,
        message: 'Produit et ses variantes supprimés avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete variant (ADMIN, PARTNER, EMPLOYEE)
router.delete(
  '/:id/variants/:variantId',
  requireRole(UserRole.ADMIN, UserRole.PARTNER, UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      productService.deleteVariant(req.params.variantId);
      res.json({
        success: true,
        message: 'Déclinaison supprimée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
