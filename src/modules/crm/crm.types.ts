import { LeadStatus, CustomerStatus, TaskStatus, TimelineType, EntityType } from '@prisma/client';

export type CreateLeadInput = {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  assignedUserId?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  id: string;
  status?: LeadStatus;
};

export type CreateCustomerInput = {
  name: string;
  industry?: string;
  assignedUserId?: string;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  id: string;
  status?: CustomerStatus;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate?: Date;
  assignedUserId?: string;
  leadId?: string;
  customerId?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  id: string;
  status?: TaskStatus;
};

export type CreateTimelineEntryInput = {
  type: TimelineType;
  content: string;
  entityType: EntityType;
  entityId: string;
};

export type CreateLocationInput = {
  name: string;
  customerId: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  coordinates?: string;
};

export type UpdateLocationInput = Partial<CreateLocationInput> & {
  id: string;
};
