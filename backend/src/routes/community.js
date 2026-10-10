// Shared community data (GET /api/state) and every write (POST /api/actions).
import { Router } from 'express';
import { ActionError, applyAction, applyInternal, snapshotFor } from '../lib/actions.js';
import { getUser, rateLimited } from '../lib/auth.js';
import { loadState, loadVersion } from '../lib/db.js';
import { readJson } from '../lib/http.js';
import { llmEnabled, summarizeIdea } from '../lib/llm.js';
import { searchState } from '../lib/search.js';

const router = Router();

// Global community search (members, ideas, communities, projects, + opportunities for creators).
// Deterministic, no LLM required, role-scoped and rate-limited.
router.get('/search', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (rateLimited(req, `search:${user.id}`, 120, 60_000)) return res.status(429).json({ error: 'Slow down a little' });
  if (!user.communityId) return res.json({ query: String(req.query.q || '').trim(), total: 0, groups: [] });
  const q = String(req.query.q || '');
  if (q.trim().length < 2) return res.json({ query: q.trim(), total: 0, groups: [] });
  const st = await loadState(user.communityId);
  res.json(searchState(user, st, q));
});

// Shared community data for the signed-in user. `?v=<version>` → {unchanged:true} when nothing changed.
router.get('/state', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  // A member who has not joined any community yet has no community document to load.
  if (!user.communityId) return res.json({ shared: null, version: 0, supported: {}, needsCommunity: true });
  const v = Number(req.query.v);
  if (v) {
    const current = await loadVersion(user.communityId);
    if (current === v) return res.json({ unchanged: true, version: v });
  }
  res.json(snapshotFor(user, await loadState(user.communityId)));
});

router.post('/actions', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (rateLimited(req, `act:${user.id}`, 240, 60_000)) return res.status(429).json({ error: 'Slow down a little' });
  const action = readJson(req, res, 20_000);
  if (action === undefined) return;
  try {
    const { action: applied, snapshot } = await applyAction(user, action);
    if (applied.type === 'ADD_IDEA' && llmEnabled()) {
      const idea = snapshot.shared.ideas[0];
      summarizeIdea(idea).then((summary) => summary && applyInternal(user.communityId, { type: 'SET_SUMMARY', ideaId: idea.id, summary: summary.slice(0, 300) })).catch(() => {});
    }
    res.json({ ok: true, ...snapshot, memberId: user.memberId || null });
  } catch (e) {
    if (e instanceof ActionError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

export default router;
