import { authClient } from '../../../lib/server/supabase';
import { getProfile, handle, json, publicUser, rateLimited } from '../../../lib/server/auth';

export const POST = handle(async (request) => {
  if (rateLimited(request, 'login', 20, 900_000)) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const sb = await authClient();
  const { data, error } = await sb.auth.signInWithPassword({ email: String(b?.email || '').trim().toLowerCase(), password: String(b?.password || '') });
  if (error || !data?.user) return json({ error: 'Wrong email or password' }, 401);
  const p = await getProfile(data.user.id);
  if (!p) { await sb.auth.signOut(); return json({ error: 'This account has no FanOS profile' }, 403); }
  return json({ user: publicUser({ id: p.id, email: p.email, name: p.name, role: p.role, memberId: p.member_id, provider: p.provider }) });
});
