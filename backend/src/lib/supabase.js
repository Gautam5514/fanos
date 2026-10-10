// Supabase clients for the API server.
//   adminDb()            → secret key: database access (bypasses RLS) + auth admin.
//   authClient(req, res) → publishable key + request cookies: sign in / sign out / current user.
import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

const URL = process.env.SUPABASE_URL;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;

export const supabaseConfigured = () => !!(URL && PUBLISHABLE && SECRET);

export class SetupError extends Error {
  constructor(message) { super(message); this.status = 503; }
}
export function assertConfigured() {
  if (!supabaseConfigured()) throw new SetupError('Supabase is not configured (set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY).');
}
// PostgREST "table not found" → the SQL migration has not been run yet.
export function checkDbError(error) {
  if (!error) return;
  if (error.code === 'PGRST205' || error.code === '42P01') throw new SetupError('Database tables are missing — run backend/supabase/migrations/001_fanos.sql then 002_multitenant.sql in the Supabase SQL Editor.');
  throw new Error(`Database error: ${error.message}`);
}

let admin = null;
export function adminDb() {
  assertConfigured();
  if (!admin) admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return admin;
}

// Sessions live in httpOnly cookies managed by @supabase/ssr.
export function authClient(req, res) {
  assertConfigured();
  return createServerClient(URL, PUBLISHABLE, {
    cookies: {
      getAll: () => parseCookieHeader(req.headers.cookie ?? '').map(({ name, value }) => ({ name, value: value ?? '' })),
      setAll: (list) => {
        if (res.headersSent) return;
        list.forEach(({ name, value, options }) => res.append('Set-Cookie', serializeCookieHeader(name, value, options)));
      },
    },
  });
}
