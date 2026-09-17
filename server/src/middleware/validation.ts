import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import { CostComponentType } from '@zr-erp/shared';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Données invalides', details));
      } else {
        next(error);
      }
    }
  };
}

export const CostComponentSchema = z.object({
  name: z.string().min(1, 'Le nom du composant est requis'),
  type: z.nativeEnum(CostComponentType),
  cost: z.number().min(0, 'Le coût doit être positif ou nul'),
  isConfigurable: z.boolean().optional().default(true),
});

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Le nom du produit est requis (min 2 caractères)'),
  sku: z.string().min(2, 'Le code SKU est requis'),
  description: z.string().optional().nullable(),
  sellingPrice: z.number().min(0, 'Le prix de vente doit être positif'),
  costComponents: z.array(CostComponentSchema).optional().default([]),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  sellingPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const CreateVariantSchema = z.object({
  name: z.string().min(1, 'Le nom de la déclinaison (taille/couleur) est requis'),
  sku: z.string().min(2, 'Le code SKU de la variante est requis'),
  additionalCost: z.number().optional().default(0),
  additionalPrice: z.number().optional().default(0),
  stockQuantity: z.number().int().min(0).optional().default(0),
});

export const CreateMaterialSchema = z.object({
  name: z.string().min(2, 'Le nom de la matière première est requis'),
  unit: z.string().min(1, 'L\'unité de mesure est requise (ex: pcs, rouleau, mètre, kg)'),
  unitCost: z.number().min(0, 'Le coût unitaire doit être positif'),
  stockQuantity: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(10),
  supplierId: z.string().optional().nullable(),
});
