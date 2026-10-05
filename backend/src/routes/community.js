// Shared community data (GET /api/state) and every write (POST /api/actions).
import { Router } from 'express';
import { ActionError, applyAction, applyInternal, snapshotFor } from '../lib/actions.js';
import { getUser, rateLimited } from '../lib/auth.js';
import { loadState, loadVersion } from '../lib/db.js';
import { readJson } from '../lib/http.js';
import { llmEnabled, summarizeIdea } from '../lib/llm.js';

const router = Router();

// Shared community data for the signed-in user. `?v=<version>` → {unchanged:true} when nothing changed.
router.get('/state', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  const v = Number(req.query.v);
  if (v) {
    const current = await loadVersion();
    if (current === v) return res.json({ unchanged: true, version: v });
  }
  res.json(snapshotFor(user, await loadState()));
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
      summarizeIdea(idea).then((summary) => summary && applyInternal({ type: 'SET_SUMMARY', ideaId: idea.id, summary: summary.slice(0, 300) })).catch(() => {});
    }
    res.json({ ok: true, ...snapshot, memberId: user.memberId || null });
  } catch (e) {
    if (e instanceof ActionError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

export default router;
