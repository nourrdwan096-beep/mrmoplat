import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btwwkfrkdgmonzufyuyd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0d3drZnJrZGdtb256dWZ5dXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTM2NTksImV4cCI6MjEwMzE2OTY1OX0.lABbvgGCJXFqdOe1ulxjbBl5gymaQaU5BltsdHHm1a0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
