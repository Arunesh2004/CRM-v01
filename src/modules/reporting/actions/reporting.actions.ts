'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';


import * as reportingService from '../reporting.service';

async function _getDashboardMetricsAction(startDate?: Date, endDate?: Date) {
  try {
    const [security, camera, crm, communication] = await Promise.all([
      reportingService.getSecurityMetrics(startDate, endDate),
      reportingService.getCameraMetrics(), // cameras are point in time
      reportingService.getCrmMetrics(startDate, endDate),
      reportingService.getCommunicationMetrics(startDate, endDate)
    ]);

    return { 
      success: true, 
      data: { security, camera, crm, communication } 
    };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getDashboardMetricsAction = withServerActionContext(_getDashboardMetricsAction);
