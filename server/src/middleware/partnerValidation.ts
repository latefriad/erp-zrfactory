import { z } from 'zod';

export const RecordContributionSchema = z.object({
  partnerId: z.string().optional(),
  cashAccountId: z.string().optional().nullable(),
  amount: z.number().positive('Le montant de l\'apport doit être supérieur à 0'),
  date: z.string().min(8, 'La date de l\'apport est requise'),
  description: z.string().min(2, 'La description doit comporter au moins 2 caractères'),
  reference: z.string().optional().nullable(),
});

export const RecordWithdrawalSchema = z.object({
  partnerId: z.string().optional(),
  cashAccountId: z.string().optional().nullable(),
  amount: z.number().positive('Le montant du retrait doit être supérieur à 0'),
  date: z.string().min(8, 'La date du retrait est requise'),
  description: z.string().min(2, 'La description doit comporter au moins 2 caractères'),
  reference: z.string().optional().nullable(),
});

export const TransferFundsSchema = z.object({
  fromAccountId: z.string().min(1, 'Le compte source est obligatoire'),
  toAccountId: z.string().min(1, 'Le compte destination est obligatoire'),
  amount: z.number().positive('Le montant du transfert doit être supérieur à 0'),
  date: z.string().min(8, 'La date du transfert est requise'),
  description: z.string().min(2, 'Le motif du transfert doit comporter au moins 2 caractères'),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: 'Le compte source et le compte destination doivent être différents',
  path: ['toAccountId'],
});

export const CreateCashAccountSchema = z.object({
  name: z.string().min(2, 'Le nom du compte doit comporter au moins 2 caractères'),
  type: z.enum(['CASH', 'BANK', 'CCP', 'BARIDIMOB'], {
    errorMap: () => ({ message: 'Type de compte invalide (CASH, BANK, CCP, BARIDIMOB)' }),
  }),
  balance: z.number().min(0, 'Le solde initial ne peut pas être négatif').optional(),
  currency: z.string().default('DZD').optional(),
  isDefault: z.boolean().optional(),
});
