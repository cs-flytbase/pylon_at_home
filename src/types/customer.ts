import { User } from "@supabase/supabase-js";

export type OrganizationType = 'partner' | 'end_customer' | 'ex';
export type CustomerStatus = 'active' | 'inactive';
export type OrganizationStatus = 'active' | 'inactive';

export interface Organization {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  status: OrganizationStatus;
  type: OrganizationType;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  notes?: string;
  organization_id?: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization?: Organization;
}

export interface CustomerInsert {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  notes?: string;
  organization_id?: string;
  status?: CustomerStatus;
  created_by?: string;
}

export interface OrganizationInsert {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  status?: OrganizationStatus;
  type: OrganizationType;
}

// Used when no customer is associated yet
export const UNKNOWN_CUSTOMER: Customer = {
  id: 'unknown',
  full_name: 'Unknown Customer',
  first_name: 'Unknown',
  last_name: 'Customer',
  email: 'unknown@example.com',
  status: 'inactive',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
