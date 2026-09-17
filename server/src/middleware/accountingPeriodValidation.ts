import { z } from 'zod';

export const CreatePeriodSchema = z.object({
  name: z.string().min(2, 'Le nom de la période doit comporter au moins 2 caractères'),
  startDate: z.string().min(8, 'La date de début est requise (format YYYY-MM-DD)'),
  endDate: z.string().min(8, 'La date de fin est requise (format YYYY-MM-DD)'),
}).refine(data => data.startDate <= data.endDate, {
  message: 'La date de début ne peut pas être postérieure à la date de fin',
  path: ['endDate'],
});
