import { cookies } from 'next/headers';
import { createRouteHandlerClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase client for Server Components using Next.js cookies
 * @returns A Supabase client configured for server components
 */
export function createServerComponentSupabase() {
  return createServerComponentClient<Database>({
    cookies
  });
}

/**
 * Creates a Supabase client for Route Handlers (API routes) using Next.js cookies
 * @returns A Supabase client configured for API routes
 */
export function createRouteHandlerSupabase() {
  return createRouteHandlerClient<Database>({
    cookies
  });
}

/**
 * Creates a Supabase client with admin privileges using the service role key
 * This bypasses Row Level Security (RLS) - use with caution and only in server contexts
 * @returns A Supabase client with admin privileges
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key not found in environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  });
}
