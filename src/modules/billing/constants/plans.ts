export type PlanId = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  limits: {
    users: number;
    storageBytes: number;
    cameras: number;
  };
  features: PlanFeature[];
}

export const BILLING_PLANS: Record<PlanId, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free Tier',
    description: 'Basic CRM features for small teams.',
    price: 0,
    interval: 'MONTHLY',
    limits: {
      users: 3,
      storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
      cameras: 0,
    },
    features: [
      { id: 'core_crm', name: 'Core CRM (Leads, Deals)', included: true },
      { id: 'analytics', name: 'Basic Analytics', included: true },
      { id: 'cctv', name: 'CCTV Integration', included: false },
      { id: 'custom_roles', name: 'Custom Roles', included: false },
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'Advanced features for growing security teams.',
    price: 99,
    interval: 'MONTHLY',
    limits: {
      users: 10,
      storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
      cameras: 10,
    },
    features: [
      { id: 'core_crm', name: 'Core CRM (Leads, Deals)', included: true },
      { id: 'analytics', name: 'Advanced Analytics', included: true },
      { id: 'cctv', name: 'CCTV Integration', included: true },
      { id: 'custom_roles', name: 'Custom Roles', included: true },
    ],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Unlimited capacity for enterprise security operations.',
    price: 499,
    interval: 'MONTHLY',
    limits: {
      users: 999999, // practically unlimited
      storageBytes: 1000 * 1024 * 1024 * 1024, // 1 TB
      cameras: 999999, // practically unlimited
    },
    features: [
      { id: 'core_crm', name: 'Core CRM (Leads, Deals)', included: true },
      { id: 'analytics', name: 'Advanced Analytics', included: true },
      { id: 'cctv', name: 'CCTV Integration', included: true },
      { id: 'custom_roles', name: 'Custom Roles', included: true },
      { id: 'dedicated_support', name: 'Dedicated Support', included: true },
    ],
  }
};
