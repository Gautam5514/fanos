import { Router } from 'express';
import { adminDb, authClient, supabaseConfigured } from '../lib/supabase.js';
import { createProfile, EMAIL_RE, makeCreator, fromProfile, getCommunityCreator, getProfile, getUser, passwordWeakness, publicUser, rateLimited, rateLimitedKey, setCommunityId } from '../lib/auth.js';
import { readJson } from '../lib/http.js';
import { firebaseEnabled, verifyGoogleIdToken } from '../lib/firebase.js';
import { safeAvatar, saveGoogleAvatar } from '../lib/avatar.js';

const router = Router();
const INVALID = { error: 'Invalid request' };

router.get('/me', async (req, res) => {
  if (!supabaseConfigured()) return res.json({ user: null, configured: false });
  const user = await getUser(req, res);
  res.json({ user: publicUser(user), configured: true });
});

// Creates a Supabase Auth user (email pre-confirmed, so no confirmation email is needed),
// a profile row with the chosen role, then signs the user in (session cookies set by @supabase/ssr).
// Members may pass `community` (a creator id from the invite link) to join that community.
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

  // Members join a specific creator's community (from the invite link). Validate it exists.
  let communityId = null;
  if (role === 'member') {
    const requested = String(b?.community || '').trim();
    if (requested) {
      const creator = await getCommunityCreator(requested);
      if (!creator) return res.status(404).json({ error: 'That community link is invalid or no longer exists.' });
      communityId = creator.id;
    }
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
    profile = await createProfile({ id: created.user.id, email, name, role, provider: 'email', communityId });
  } catch (e) {
    await adminDb().auth.admin.deleteUser(created.user.id); // keep auth + profiles consistent
    throw e;
  }
  const sb = authClient(req, res);
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (signIn.error) return res.status(201).json({ error: 'Account created — please log in' });
  res.status(201).json({ user: publicUser(fromProfile(profile)) });
});

// Which sign-in methods this server offers (the UI hides "Continue with Google" when off).
router.get('/providers', (req, res) => res.json({ google: firebaseEnabled() }));

// Google sign-in. The browser sends a Firebase ID token; we verify it, find or create the account
// for that verified email, then open a regular Supabase session (same cookies as email login).
//   mode "login"  → only existing accounts (404 otherwise, so the UI can offer sign-up)
//   mode "signup" → creates the account with `role` (and `community` for invite links);
//                   if the email already has an account, it simply signs them in.
router.post('/google', async (req, res) => {
  if (rateLimited(req, 'google', 30, 900_000)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  if (!supabaseConfigured()) return res.status(503).json({ error: 'Accounts are not configured on this server yet.' });
  if (!firebaseEnabled()) return res.status(501).json({ error: 'Google sign-in is not configured on this server.' });
  const b = readJson(req, res, 12_000, INVALID);
  if (b === undefined) return;
  const idToken = String(b?.idToken || '');
  if (idToken.length < 20 || idToken.length > 8000) return res.status(400).json(INVALID);

  let g;
  try { g = await verifyGoogleIdToken(idToken); }
  catch (e) { return res.status(401).json({ error: e.message }); }

  let profile = null;
  const found = await adminDb().from('profiles').select('*').eq('email', g.email).maybeSingle();
  if (found.error) throw new Error(`Database error: ${found.error.message}`);
  profile = found.data;

  if (!profile) {
    if (b?.mode !== 'signup') return res.status(404).json({ error: 'No account found for this Google email yet — create one first.', code: 'no-account' });
    const role = b?.role === 'creator' ? 'creator' : 'member';
    let communityId = null;
    if (role === 'member') {
      const requested = String(b?.community || '').trim();
      if (requested) {
        const creator = await getCommunityCreator(requested);
        if (!creator) return res.status(404).json({ error: 'That community link is invalid or no longer exists.' });
        communityId = creator.id;
      }
    }
    const name = (g.name || g.email.split('@')[0]).slice(0, 60);
    const { data: created, error } = await adminDb().auth.admin.createUser({ email: g.email, email_confirm: true, user_metadata: { name, avatar_url: safeAvatar(g.picture) } });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return res.status(409).json({ error: 'This email is already registered. Log in with your password instead.' });
      console.error('createUser(google)', error.message);
      return res.status(500).json({ error: 'Could not create the account' });
    }
    try {
      profile = await createProfile({ id: created.user.id, email: g.email, name, role, provider: 'google', communityId });
    } catch (e) {
      await adminDb().auth.admin.deleteUser(created.user.id); // keep auth + profiles consistent
      throw e;
    }
  }

  await saveGoogleAvatar(profile.id, g.picture); // keep the photo fresh (also fills it in for older accounts)

  // Open a Supabase session without a password: mint a one-time link token and redeem it server-side.
  const link = await adminDb().auth.admin.generateLink({ type: 'magiclink', email: g.email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) { console.error('generateLink', link.error?.message); return res.status(500).json({ error: 'Could not sign you in' }); }
  const sb = authClient(req, res);
  const session = await sb.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (session.error || !session.data?.user) { console.error('verifyOtp', session.error?.message); return res.status(500).json({ error: 'Could not sign you in' }); }
  res.json({ user: publicUser({ ...fromProfile(profile), avatar: safeAvatar(g.picture) }) });
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

// Wrong role at sign-up? A fan with no community and no member profile yet can become a creator.
router.post('/become-creator', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (user.role === 'creator') return res.json({ user: publicUser(user) });
  if (user.communityId || user.memberId) return res.status(409).json({ error: 'You already belong to a community, so your account type can’t be changed.' });
  await makeCreator(user.id);
  res.json({ user: publicUser({ ...user, role: 'creator', communityId: user.id }) });
});

// Attach a signed-in member (who has no community yet) to a creator's community.
// Used when a member signed up without an invite link, then pastes one later.
router.post('/join', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (user.role !== 'member') return res.status(403).json({ error: 'Members only' });
  if (user.communityId) return res.status(409).json({ error: 'You already belong to a community' });
  const b = readJson(req, res, 2_000, INVALID);
  if (b === undefined) return;
  const requested = String(b?.community || '').trim();
  const creator = await getCommunityCreator(requested);
  if (!creator) return res.status(404).json({ error: 'That community link is invalid or no longer exists.' });
  await setCommunityId(user.id, creator.id);
  res.json({ user: publicUser({ ...user, communityId: creator.id }) });
});

export default router;
