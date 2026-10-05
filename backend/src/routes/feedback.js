// Real-creator test feedback, stored in Supabase table public.creator_feedback.
//   POST /api/feedback  → save one entry (validated, size-limited, rate-limited)
//   GET  /api/feedback  → public testimonials only (entries where the creator consented)
//   GET  /api/feedback with header `x-admin-token: $FEEDBACK_ADMIN_TOKEN` → all entries
import crypto from 'crypto';
import { Router } from 'express';
import { adminDb, checkDbError } from '../lib/supabase.js';
import { clientIp } from '../lib/auth.js';

const router = Router();
const MAX_BODY = 12_000;
const hits = new Map(); // ip -> timestamps (simple in-memory rate limit)

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null; };
const url = (v) => { const s = str(v, 300); try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) ? u.toString() : ''; } catch { return ''; } };

function sanitize(b) {
  const ratings = {};
  for (const k of ['communities', 'aiSignals', 'clustering', 'actionFlow', 'overall']) ratings[k] = num(b?.ratings?.[k], 1, 5);
  return {
    tester: {
      name: str(b?.tester?.name, 80),
      handle: str(b?.tester?.handle, 60),
      platform: str(b?.tester?.platform, 30),
      followers: num(b?.tester?.followers, 0, 1_000_000_000),
      niche: str(b?.tester?.niche, 80),
      contact: str(b?.tester?.contact, 120),
    },
    ratings,
    wouldUse: ['Yes', 'Maybe', 'No'].includes(b?.wouldUse) ? b.wouldUse : null,
    hoursOnDms: num(b?.hoursOnDms, 0, 168),
    hoursSaved: num(b?.hoursSaved, 0, 168),
    bestFeature: str(b?.bestFeature, 80),
    improve: str(b?.improve, 2000),
    quote: str(b?.quote, 1000),
    videoUrl: url(b?.videoUrl),
    consentPublish: b?.consentPublish === true,
    session: {
      tasksCompleted: num(b?.session?.tasksCompleted, 0, 20),
      tasksTotal: num(b?.session?.tasksTotal, 0, 20),
      minutes: num(b?.session?.minutes, 0, 600),
    },
    clientId: str(b?.id, 60),
  };
}

async function readAll(onlyPublic) {
  let q = adminDb().from('creator_feedback').select('id, created_at, data').order('created_at', { ascending: false }).limit(500);
  if (onlyPublic) q = q.eq('consent_publish', true);
  const { data, error } = await q;
  checkDbError(error);
  return (data || []).map((r) => ({ ...r.data, id: r.id, createdAt: r.created_at }));
}

function publicView(e) {
  return {
    id: e.id, clientId: e.clientId, createdAt: e.createdAt,
    tester: { name: e.tester.name, handle: e.tester.handle, platform: e.tester.platform, followers: e.tester.followers, niche: e.tester.niche },
    ratings: e.ratings, wouldUse: e.wouldUse, hoursOnDms: e.hoursOnDms, hoursSaved: e.hoursSaved,
    bestFeature: e.bestFeature, quote: e.quote, videoUrl: e.videoUrl, session: e.session,
  };
}

router.post('/', async (req, res) => {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 20) return res.status(429).json({ ok: false, error: 'Too many submissions, try later.' });
  hits.set(ip, [...recent, now]);

  const text = typeof req.body === 'string' ? req.body : '';
  if (text.length > MAX_BODY) return res.status(413).json({ ok: false, error: 'Payload too large' });
  let body;
  try { body = JSON.parse(text); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }
  const entry = sanitize(body);
  if (!entry.tester.name || !entry.ratings.overall) return res.status(400).json({ ok: false, error: 'Name and overall rating are required' });

  const { data, error } = await adminDb().from('creator_feedback').insert({ consent_publish: entry.consentPublish, data: entry }).select('id').single();
  checkDbError(error);
  res.json({ ok: true, id: data.id });
});

router.get('/', async (req, res) => {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  const given = req.get('x-admin-token');
  const isAdmin = token && given && given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
  if (isAdmin) return res.json({ ok: true, entries: await readAll(false) });
  res.json({ ok: true, entries: (await readAll(true)).map(publicView) });
});

export default router;
