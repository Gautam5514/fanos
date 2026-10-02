import { adminDb, authClient } from '../../../lib/server/supabase';
import { canBecomeCreator, createProfile, EMAIL_RE, handle, json, publicUser, rateLimited } from '../../../lib/server/auth';

// Creates a Supabase Auth user (email pre-confirmed, so no confirmation email is needed),
// a profile row with the chosen role, then signs the user in (session cookies set by @supabase/ssr).
export const POST = handle(async (request) => {
  if (rateLimited(request, 'signup', 10, 3_600_000)) return json({ error: 'Too many attempts. Try again later.' }, 429);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const email = String(b?.email || '').trim().toLowerCase().slice(0, 254);
  const password = String(b?.password || '');
  const name = String(b?.name || '').trim().slice(0, 60);
  const role = b?.role === 'creator' ? 'creator' : 'member';
  if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email' }, 400);
  if (password.length < 8 || password.length > 72) return json({ error: 'Password must be 8–72 characters' }, 400);
  if (name.length < 2) return json({ error: 'Enter your name' }, 400);
  if (role === 'creator' && !(await canBecomeCreator(String(b?.creatorCode || '')))) {
    return json({ error: 'This community already has a creator. Ask them for the creator access code.' }, 403);
  }

  const { data: created, error } = await adminDb().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return json({ error: 'An account with this email already exists — log in instead' }, 409);
    if (/password/i.test(error.message)) return json({ error: error.message }, 400);
    console.error('createUser', error.message);
    return json({ error: 'Could not create the account' }, 500);
  }
  let profile;
  try {
    profile = await createProfile({ id: created.user.id, email, name, role, provider: 'email' });
  } catch (e) {
    await adminDb().auth.admin.deleteUser(created.user.id); // keep auth + profiles consistent
    throw e;
  }
  const sb = await authClient();
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (signIn.error) return json({ error: 'Account created — please log in' }, 201);
  return json({ user: publicUser({ id: profile.id, email, name, role, memberId: null, provider: 'email' }) }, 201);
});
