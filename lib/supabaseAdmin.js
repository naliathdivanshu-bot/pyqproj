import { createClient } from '@supabase/supabase-js';

// Server-side client for Supabase storage. Never import this file into a client component.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) return null;

  // Prefer the server-only service key, but allow the public API key as a
  // fallback for tables whose Row Level Security policies permit the action.
  const key = serviceKey || publicKey;
  if (!key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
