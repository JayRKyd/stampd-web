import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isDemo } from '@/lib/demo/mode';
import { demoClient } from '@/lib/demo/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// The public demo (/demo) never touches the database: it gets a stand-in
// client holding a made-up shop. See lib/demo.
export function createClient(): typeof supabase {
  return isDemo() ? (demoClient as typeof supabase) : supabase;
}
