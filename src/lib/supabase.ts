import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a single supabase client for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Ensure environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ERROR: Supabase URL or Anonymous Key not found in environment variables. ' +
    'Please make sure your .env.local file is set up correctly.'
  );
}

// Create the Supabase client - always connect to the real database
export const supabase = createClient<Database>(
  supabaseUrl || 'https://your-project-url.supabase.co',  // Fallback URL that will fail if env vars not set
  supabaseAnonKey || 'missing-anon-key'                 // Fallback key that will fail if env vars not set
);

// Server-side client (for server components and API routes)
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
      }
    }
  );
}
