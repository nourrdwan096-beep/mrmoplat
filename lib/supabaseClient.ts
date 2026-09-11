import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://btwwkfrkdgmonzufyuyd.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0d3drZnJrZGdtb256dWZ5dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTM2NTksImV4cCI6MjEwMzE2OTY1OX0.lABbvgGCJXFqdOe1ulxjbBl5gymaQaU5BltsdHHm1a0';

let _anonClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_anonClient) return _anonClient;

  const url = 
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim()) || 
    FALLBACK_SUPABASE_URL;

  const key = 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()) || 
    FALLBACK_ANON_KEY;

  _anonClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _anonClient;
}

// Lazy Proxy: prevents `createClient` from executing at module load / Next.js build time
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

