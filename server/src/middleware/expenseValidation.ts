import { z } from 'zod';
import { PaymentMethod } from '@zr-erp/shared';

export const CreateSupplierSchema = z.object({
  name: z.string().min(2, 'Le nom du fournisseur doit comporter au moins 2 caractères'),
  phone: z.string().min(8, 'Le numéro de téléphone est trop court'),
  email: z.string().email('Format email invalide').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const CreateExpenseSchema = z.object({
  categoryId: z.string().min(1, 'La catégorie de dépense est obligatoire'),
  supplierId: z.string().optional().nullable(),
  cashAccountId: z.string().optional().nullable(),
  amount: z.number().positive('Le montant doit être supérieur à 0'),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Mode de paiement invalide' }),
  }),
  date: z.string().min(8, 'La date de la dépense est requise'),
  description: z.string().min(2, 'La description doit comporter au moins 2 caractères'),
  attachment: z.string().optional().nullable(),
});

export const UpdateExpenseSchema = z.object({
  categoryId: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  cashAccountId: z.string().optional(),
  amount: z.number().positive().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  date: z.string().optional(),
  description: z.string().min(2).optional(),
  attachment: z.string().optional().nullable(),
});
