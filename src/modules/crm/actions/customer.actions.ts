'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../validators/customer.schema';
import * as customerService from '../customer/customer.service';
import { z } from 'zod';

async function _createCustomerAction(payload: z.infer<typeof CreateCustomerSchema>) {
  try {
    const validatedData = CreateCustomerSchema.parse(payload);
    
    // FAST PATH: Authentication, Tenant Resolution, and RBAC are mechanically 
    // enforced inside customerService.createCustomer using optimized queries.
    
    const result = await customerService.createCustomer(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateCustomerAction(payload: z.infer<typeof UpdateCustomerSchema>) {
  try {
    const validatedData = UpdateCustomerSchema.parse(payload);
    
    // FAST PATH: Authentication, Tenant Resolution, and RBAC are mechanically
    // enforced inside customerService.updateCustomer
    
    const result = await customerService.updateCustomer(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { QueryParams } from '../../core/types';

async function _getCustomersAction(params?: QueryParams) {
  try {
    const result = await customerService.getCustomers(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getCustomerByIdAction(id: string) {
  try {
    const result = await customerService.getCustomerById(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteCustomerAction(customerId: string) {
  try {
    const result = await customerService.deleteCustomer(customerId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { revalidatePath } from 'next/cache';

const CreateContactSchema = z.object({
  customerId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional()
}).strip();

const CreateLocationSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional()
}).strip();

async function _createContactAction(payload: any) {
  try {
    const validated = CreateContactSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    const result = await customerService.createContact(validated);
    revalidatePath(`/customers/${validated.customerId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createLocationAction(payload: any) {
  try {
    const validated = CreateLocationSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    const result = await customerService.createLocation(validated);
    revalidatePath(`/customers/${validated.customerId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { getCustomerTimeline } from '../customer/customer.timeline.service';

async function _getCustomerTimelineAction(params: {
  customerId: string;
  cursor?: string;
  limit?: number;
}) {
  try {
    const result = await getCustomerTimeline(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
export const createCustomerAction = withServerActionContext(_createCustomerAction);

export const updateCustomerAction = withServerActionContext(_updateCustomerAction);

export const getCustomersAction = withServerActionContext(_getCustomersAction);

export const getCustomerByIdAction = withServerActionContext(_getCustomerByIdAction);

export const deleteCustomerAction = withServerActionContext(_deleteCustomerAction);

export const createContactAction = withServerActionContext(_createContactAction);

export const createLocationAction = withServerActionContext(_createLocationAction);

export const getCustomerTimelineAction = withServerActionContext(_getCustomerTimelineAction);
