import { SecurityEventType, SecurityEventSeverity } from '@prisma/client';

export interface CreateSecurityEventInput {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional dynamic record for generic context
  metadata?: Record<string, any>;
  userId?: string;
}

export interface SecurityEventFilterParams {
  limit?: number;
  cursor?: string;
  severity?: SecurityEventSeverity;
  eventType?: SecurityEventType;
  startDate?: Date;
  endDate?: Date;
}
