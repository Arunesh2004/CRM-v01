import { z } from 'zod';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

export const DateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "startDate must be before or equal to endDate"
});

export function parseDateRange(startStr?: string | null, endStr?: string | null): { startDate?: Date, endDate?: Date, error?: string } {
  try {
    const raw: any = {};
    if (startStr) raw.startDate = startStr;
    if (endStr) raw.endDate = endStr;

    // ensure Invalid Date returns error instead of bypassing
    if (raw.startDate) {
        const d = new Date(raw.startDate);
        if (isNaN(d.getTime())) throw new Error("Invalid start date");
        raw.startDate = d;
    }
    if (raw.endDate) {
        const d = new Date(raw.endDate);
        if (isNaN(d.getTime())) throw new Error("Invalid end date");
        raw.endDate = d;
    }

    const parsed = DateRangeSchema.parse(raw);
    return { startDate: parsed.startDate, endDate: parsed.endDate };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error: sanitizeClientError(error) };
  }
}
