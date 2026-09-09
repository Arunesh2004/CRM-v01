'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { TerritoryService } from '@/modules/sales-intel/territory.service';
import { z } from 'zod';

const createTerritorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

const updateTerritorySchema = createTerritorySchema.partial();

const assignTerritorySchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  territoryId: z.string().min(1, 'Territory ID is required'),
  role: z.string().optional(),
});

async function _getTerritoriesAction() {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const territories = await TerritoryService.getTerritories(tenantId, user.id);
    return { success: true, data: territories };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createTerritoryAction(data: z.infer<typeof createTerritorySchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    const validData = createTerritorySchema.parse(data);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const territory = await TerritoryService.createTerritory(user.id, tenantId, validData as any);
    return { success: true, data: territory };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateTerritoryAction(territoryId: string, data: z.infer<typeof updateTerritorySchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    const validData = updateTerritorySchema.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const territory = await TerritoryService.updateTerritory(user.id, tenantId, territoryId, validData as any);
    return { success: true, data: territory };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _assignTerritoryUserAction(data: z.infer<typeof assignTerritorySchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    const validData = assignTerritorySchema.parse(data);
    
    const assignment = await TerritoryService.assignUser(user.id, tenantId, validData);
    return { success: true, data: assignment };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _removeTerritoryAssignmentAction(assignmentId: string) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    await TerritoryService.removeAssignment(user.id, tenantId, assignmentId);
    return { success: true, data: null };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getTerritoriesAction = withServerActionContext(_getTerritoriesAction);
export const createTerritoryAction = withServerActionContext(_createTerritoryAction);
export const updateTerritoryAction = withServerActionContext(_updateTerritoryAction);
export const assignTerritoryUserAction = withServerActionContext(_assignTerritoryUserAction);
export const removeTerritoryAssignmentAction = withServerActionContext(_removeTerritoryAssignmentAction);
