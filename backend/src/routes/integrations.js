// Optional integrations. Currently: YouTube public-stats lookup via the official Data API.
//   GET /api/integrations/youtube            → { enabled }
//   GET /api/integrations/youtube?handle=…    → { channel: { title, handle, subscribers, … } }
// Creator-only, rate-limited. The API key stays server-side; returns 501 when not configured
// so the client silently keeps manual entry.
import { Router } from 'express';
import { getUser, rateLimited } from '../lib/auth.js';
import { lookupYouTube, youtubeEnabled } from '../lib/youtube.js';

const router = Router();

const MESSAGES = {
  disabled: 'YouTube lookup is not configured on this server.',
  empty: 'Enter your YouTube handle.',
  'not-found': 'No YouTube channel found for that handle.',
  quota: 'YouTube lookup is busy right now — enter the number manually.',
  network: 'Could not reach YouTube — enter the number manually.',
  'request-failed': 'Could not reach YouTube — enter the number manually.',
};

router.get('/youtube', async (req, res) => {
  if (!('handle' in req.query)) return res.json({ enabled: youtubeEnabled() });
  if (!youtubeEnabled()) return res.status(501).json({ error: MESSAGES.disabled });

  const user = await getUser(req, res);
  if (!user || user.role !== 'creator') return res.status(401).json({ error: 'Creator sign-in required' });
  if (rateLimited(req, `yt:${user.id}`, 20, 60_000)) return res.status(429).json({ error: 'Slow down a little' });

  const handle = String(req.query.handle || '').slice(0, 120);
  const result = await lookupYouTube(handle);
  if (result.error) {
    const status = result.error === 'not-found' ? 404 : result.error === 'quota' ? 429 : 400;
    return res.status(status).json({ error: MESSAGES[result.error] || 'YouTube lookup failed.' });
  }
  res.json({ channel: result.channel });
});

export default router;
