import { sanitizeClientError } from '@/lib/errors/client-safe-error';
'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../validators/customer.schema';
import * as customerService from '../customer/customer.service';
import { z } from 'zod';

export async function createCustomerAction(payload: z.infer<typeof CreateCustomerSchema>) {
  try {
    const validatedData = CreateCustomerSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'CREATE');
    
    const result = await customerService.createCustomer(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function updateCustomerAction(payload: z.infer<typeof UpdateCustomerSchema>) {
  try {
    const validatedData = UpdateCustomerSchema.parse(payload);
    
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    
    const result = await customerService.updateCustomer(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { QueryParams } from '../../core/types';

export async function getCustomersAction(params?: QueryParams) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'READ');
    
    const result = await customerService.getCustomers(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getCustomerByIdAction(id: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'READ');
    
    const result = await customerService.getCustomerById(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function deleteCustomerAction(customerId: string) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'DELETE');
    
    const result = await customerService.deleteCustomer(customerId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { revalidatePath } from 'next/cache';

export async function createContactAction(payload: any) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    const result = await customerService.createContact(payload);
    revalidatePath(`/customers/${payload.customerId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function createLocationAction(payload: any) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('CUSTOMER', 'UPDATE');
    const result = await customerService.createLocation(payload);
    revalidatePath(`/customers/${payload.customerId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

import { getCustomerTimeline } from '../customer/customer.timeline.service';

export async function getCustomerTimelineAction(params: {
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