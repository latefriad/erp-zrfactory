import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@zr-erp/shared';

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  phone: z.string().min(8, 'Le numéro de téléphone est trop court'),
  email: z.string().email('Adresse email invalide').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  wilaya: z.string().min(1, 'La wilaya est obligatoire'),
  commune: z.string().optional().default(''),
  notes: z.string().optional().nullable(),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  wilaya: z.string().optional(),
  commune: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const OrderItemInputSchema = z.object({
  productId: z.string().min(1, 'L\'identifiant du produit est obligatoire'),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'La quantité minimum est de 1'),
  sellingPrice: z.number().min(0, 'Le prix de vente doit être positif').optional(),
  notes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1, 'Le client est obligatoire'),
  items: z.array(OrderItemInputSchema).min(1, 'La commande doit comporter au moins un article'),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  deliveryCompany: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  deliveryFee: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  shippingWilaya: z.string().optional().nullable(),
  shippingCommune: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Statut de commande invalide' }),
  }),
});

export const UpdatePaymentStatusSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus, {
    errorMap: () => ({ message: 'Statut de paiement invalide' }),
  }),
});

export const UpdateShippingSchema = z.object({
  deliveryCompany: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  deliveryFee: z.number().min(0).optional(),
});
