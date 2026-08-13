import { logger } from '@/lib/observability/logger';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * Parses unknown errors caught in Server Actions and API Routes,
 * logging the full diagnostic internally and returning only client-safe messages.
 */
export function sanitizeClientError(error: unknown, context?: Record<string, any>): string {
  // 1. Log the full diagnostic internally
  const diagnosticContext = { ...context, category: 'INTERNAL_ERROR' };
  
  if (error instanceof Error) {
    logger.error(`Unhandled Action Error: ${error.message}`, error, diagnosticContext);
  } else {
    logger.error('Unhandled Action Error: Unknown object', new Error(String(error)), diagnosticContext);
  }

  // 2. Identify Expected Domain / Business Errors
  if (error instanceof ZodError) {
    return 'Validation failed. Please check your input.';
  }

  if (error instanceof Error) {
    // Check if it's a Prisma Error
    if (
      error.name.startsWith('Prisma') ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientValidationError
    ) {
      return 'A database error occurred. Please try again.';
    }

    // Check for provider/network system errors
    const systemKeywords = ['ECONNREFUSED', 'Redis', 'Gemini', 'timeout', 'socket', 'database', 'postgres', 'API key'];
    if (systemKeywords.some(kw => error.message.toLowerCase().includes(kw.toLowerCase()))) {
      return 'An unexpected system error occurred. Please try again.';
    }

    // Heuristic for expected business errors (thrown as generic Error)
    // If it doesn't look like a raw stack trace or system error, we allow it.
    if (!error.message.includes('\n') && error.message.length < 200) {
      // It's likely a business error like "Customer not found"
      return error.message;
    }
  }

  // 3. Fallback for unexpected or unknown errors
  return 'An unexpected error occurred. Please try again.';
}
