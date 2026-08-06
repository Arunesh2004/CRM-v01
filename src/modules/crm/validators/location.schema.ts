import { z } from 'zod';

export const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  customerId: z.string().min(1, 'Customer is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  coordinates: z.string().optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial().extend({
  id: z.string().min(1, 'Location ID is required'),
});
