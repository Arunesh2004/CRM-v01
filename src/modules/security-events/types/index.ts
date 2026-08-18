import { SecurityEventType, SecurityEventSeverity } from '@prisma/client';

export interface CreateSecurityEventInput {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  source: string;
  ipAddress?: string;
  userAgent?: string;
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
