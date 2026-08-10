import { z } from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal('')),
  company: z.string().max(100, "Company name too long").optional().or(z.literal('')),
});

export const LeadSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title too long"),
  description: z.string().max(1000, "Description too long").optional().or(z.literal('')),
  value: z.number().nonnegative("Value must be non-negative").optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
});

export const TaskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title too long"),
  description: z.string().max(1000, "Description too long").optional().or(z.literal('')),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.date().optional(),
});

export const IncidentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional().or(z.literal('')),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).default('OPEN'),
});

export const AdminInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  roleId: z.string().uuid("Invalid Role ID"),
});

export const validatePayload = <T>(schema: z.ZodSchema<T>, payload: unknown): { success: true; data: T } | { success: false; error: string } => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const errorMsg = result.error.issues.map(i => i.message).join(', ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }
  return { success: true, data: result.data };
};
