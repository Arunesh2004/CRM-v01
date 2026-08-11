import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth,
  addDays, subDays,
  addWeeks, subWeeks,
  addMonths, subMonths,
  addYears, subYears,
  isValid
} from 'date-fns';
import { toZonedTime, toDate as fromZonedTime } from 'date-fns-tz';

export type SemanticTimeframe = 
  | 'today' 
  | 'yesterday' 
  | 'tomorrow' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month'
  | 'this_year'
  | 'last_year';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Resolves a semantic timeframe into absolute UTC bounds based on a user's local timezone.
 * Returns undefined if no specific constraints apply.
 */
export function resolveDateRange(timeframe?: string | null, userTimezone?: string): DateRange | undefined {
  if (!timeframe) return undefined;

  // Fallback to UTC if timezone is omitted or invalid.
  const tz = userTimezone || process.env.DEFAULT_TIMEZONE || 'UTC';
  
  // 1. Get current server time and shift to the target timezone's equivalent wall-clock time
  const now = new Date();
  let localNow: Date;
  try {
    localNow = toZonedTime(now, tz);
  } catch (e) {
    // If timezone is malformed, fallback to UTC
    localNow = toZonedTime(now, 'UTC');
  }

  let localStart: Date | undefined;
  let localEnd: Date | undefined;

  // 2. Perform boundary math using date-fns on the local wall-clock time
  switch (timeframe.toLowerCase() as SemanticTimeframe) {
    case 'today':
      localStart = startOfDay(localNow);
      localEnd = endOfDay(localNow);
      break;
    case 'yesterday':
      const yesterday = subDays(localNow, 1);
      localStart = startOfDay(yesterday);
      localEnd = endOfDay(yesterday);
      break;
    case 'tomorrow':
      const tomorrow = addDays(localNow, 1);
      localStart = startOfDay(tomorrow);
      localEnd = endOfDay(tomorrow);
      break;
    case 'this_week':
      // Using weekStartsOn: 1 (Monday) as a common business default.
      localStart = startOfWeek(localNow, { weekStartsOn: 1 });
      localEnd = endOfWeek(localNow, { weekStartsOn: 1 });
      break;
    case 'last_week':
      const lastWeek = subWeeks(localNow, 1);
      localStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
      localEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
      break;
    case 'this_month':
      localStart = startOfMonth(localNow);
      localEnd = endOfMonth(localNow);
      break;
    case 'last_month':
      const lastMonth = subMonths(localNow, 1);
      localStart = startOfMonth(lastMonth);
      localEnd = endOfMonth(lastMonth);
      break;
    case 'this_year':
      localStart = new Date(localNow.getFullYear(), 0, 1);
      localEnd = endOfDay(new Date(localNow.getFullYear(), 11, 31));
      break;
    case 'last_year':
      localStart = new Date(localNow.getFullYear() - 1, 0, 1);
      localEnd = endOfDay(new Date(localNow.getFullYear() - 1, 11, 31));
      break;
    default:
      // Unsupported or invalid timeframe -> do not constrain
      return undefined;
  }

  if (!localStart || !localEnd) return undefined;

  // 3. Convert the computed local boundaries back to absolute UTC for the database
  let utcStart: Date;
  let utcEnd: Date;
  
  try {
    utcStart = fromZonedTime(localStart, { timeZone: tz });
    utcEnd = fromZonedTime(localEnd, { timeZone: tz });
  } catch (e) {
    utcStart = fromZonedTime(localStart, { timeZone: 'UTC' });
    utcEnd = fromZonedTime(localEnd, { timeZone: 'UTC' });
  }

  // 4. Validate output bounds (sanity check)
  if (!isValid(utcStart) || !isValid(utcEnd) || utcStart > utcEnd) {
    return undefined;
  }

  // Enforce a hard maximum range (e.g., +/- 10 years from now)
  const minSafe = subYears(now, 10);
  const maxSafe = addYears(now, 10);
  
  if (utcStart < minSafe) utcStart = minSafe;
  if (utcEnd > maxSafe) utcEnd = maxSafe;

  return { startDate: utcStart, endDate: utcEnd };
}
