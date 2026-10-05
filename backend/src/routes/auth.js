import { Router } from 'express';
import { adminDb, authClient, supabaseConfigured } from '../lib/supabase.js';
import { canBecomeCreator, createProfile, EMAIL_RE, fromProfile, getProfile, getUser, passwordWeakness, publicUser, rateLimited, rateLimitedKey } from '../lib/auth.js';
import { readJson } from '../lib/http.js';

const router = Router();
const INVALID = { error: 'Invalid request' };

router.get('/me', async (req, res) => {
  if (!supabaseConfigured()) return res.json({ user: null, configured: false });
  const user = await getUser(req, res);
  res.json({ user: publicUser(user), configured: true });
});

// Creates a Supabase Auth user (email pre-confirmed, so no confirmation email is needed),
// a profile row with the chosen role, then signs the user in (session cookies set by @supabase/ssr).
router.post('/signup', async (req, res) => {
  if (rateLimited(req, 'signup', 10, 3_600_000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const b = readJson(req, res, 10_000, INVALID);
  if (b === undefined) return;
  const email = String(b?.email || '').trim().toLowerCase().slice(0, 254);
  const password = String(b?.password || '');
  const name = String(b?.name || '').trim().slice(0, 60);
  const role = b?.role === 'creator' ? 'creator' : 'member';
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
  const weak = passwordWeakness(password);
  if (weak) return res.status(400).json({ error: weak });
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name' });
  if (role === 'creator' && !(await canBecomeCreator(String(b?.creatorCode || '')))) {
    return res.status(403).json({ error: 'This community already has a creator. Ask them for the creator access code.' });
  }

  const { data: created, error } = await adminDb().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return res.status(409).json({ error: 'An account with this email already exists — log in instead' });
    if (/password/i.test(error.message)) return res.status(400).json({ error: error.message });
    console.error('createUser', error.message);
    return res.status(500).json({ error: 'Could not create the account' });
  }
  let profile;
  try {
    profile = await createProfile({ id: created.user.id, email, name, role, provider: 'email' });
  } catch (e) {
    await adminDb().auth.admin.deleteUser(created.user.id); // keep auth + profiles consistent
    throw e;
  }
  const sb = authClient(req, res);
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (signIn.error) return res.status(201).json({ error: 'Account created — please log in' });
  res.status(201).json({ user: publicUser({ id: profile.id, email, name, role, memberId: null, provider: 'email' }) });
});

router.post('/login', async (req, res) => {
  if (rateLimited(req, 'login', 20, 900_000)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const b = readJson(req, res, 10_000, INVALID);
  if (b === undefined) return;
  const email = String(b?.email || '').trim().toLowerCase().slice(0, 254);
  const password = String(b?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password' });
  // Per-account throttle so one target can't be brute-forced from many IPs.
  if (rateLimitedKey(`login-email:${email}`, 10, 900_000)) return res.status(429).json({ error: 'Too many attempts for this account. Try again in 15 minutes.' });
  const sb = authClient(req, res);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return res.status(401).json({ error: 'Wrong email or password' });
  const p = await getProfile(data.user.id);
  if (!p) { await sb.auth.signOut(); return res.status(403).json({ error: 'This account has no FanOS profile' }); }
  res.json({ user: publicUser(fromProfile(p)) });
});

router.post('/logout', async (req, res) => {
  await authClient(req, res).auth.signOut();
  res.json({ ok: true });
});

export default router;
