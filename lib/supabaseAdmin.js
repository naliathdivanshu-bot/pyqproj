import { createClient } from '@supabase/supabase-js';

// Server-side only client. Uses the service role key so it can write
// to pyq_sessions even though Row Level Security blocks public access.
// NEVER import this file into a client component.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
