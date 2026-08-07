'use server';

import * as reportingService from '../reporting.service';

export async function getDashboardMetricsAction(startDate?: Date, endDate?: Date) {
  try {
    const [security, camera, crm, communication, billing] = await Promise.all([
      reportingService.getSecurityMetrics(startDate, endDate),
      reportingService.getCameraMetrics(), // cameras are point in time
      reportingService.getCrmMetrics(startDate, endDate),
      reportingService.getCommunicationMetrics(startDate, endDate),
      reportingService.getBillingMetrics(startDate, endDate)
    ]);

    return { 
      success: true, 
      data: { security, camera, crm, communication, billing } 
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}
