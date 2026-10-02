// Supabase clients for the server (route handlers only — never import from client components).
//   adminDb()    → secret key: database access (bypasses RLS) + auth admin. Server only.
//   authClient() → publishable key + request cookies: sign in / sign out / current user.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;

export const supabaseConfigured = () => !!(URL && PUBLISHABLE && SECRET);

export class SetupError extends Error {
  constructor(message) { super(message); this.status = 503; }
}
export function assertConfigured() {
  if (!supabaseConfigured()) throw new SetupError('Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY).');
}
// PostgREST "table not found" → the SQL migration has not been run yet.
export function checkDbError(error) {
  if (!error) return;
  if (error.code === 'PGRST205' || error.code === '42P01') throw new SetupError('Database tables are missing — run supabase/migrations/001_fanos.sql in the Supabase SQL Editor.');
  throw new Error(`Database error: ${error.message}`);
}

let admin = null;
export function adminDb() {
  assertConfigured();
  if (!admin) admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return admin;
}

export async function authClient() {
  assertConfigured();
  const store = await cookies();
  return createServerClient(URL, PUBLISHABLE, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only context */ }
      },
    },
  });
}
