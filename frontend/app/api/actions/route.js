import { ActionError, applyAction, applyInternal } from '../../lib/server/actions';
import { getUser, handle, json, rateLimited } from '../../lib/server/auth';
import { llmEnabled, summarizeIdea } from '../../lib/server/llm';

export const POST = handle(async (request) => {
  const user = await getUser();
  if (!user) return json({ error: 'Sign in required' }, 401);
  if (rateLimited(request, `act:${user.id}`, 240, 60_000)) return json({ error: 'Slow down a little' }, 429);
  const text = await request.text();
  if (text.length > 20_000) return json({ error: 'Too large' }, 413);
  let action;
  try { action = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
  try {
    const { action: applied, snapshot } = await applyAction(user, action);
    if (applied.type === 'ADD_IDEA' && llmEnabled()) {
      const idea = snapshot.shared.ideas[0];
      summarizeIdea(idea).then((summary) => summary && applyInternal({ type: 'SET_SUMMARY', ideaId: idea.id, summary: summary.slice(0, 300) })).catch(() => {});
    }
    return json({ ok: true, ...snapshot, memberId: user.memberId || null });
  } catch (e) {
    if (e instanceof ActionError) return json({ error: e.message }, e.status);
    throw e;
  }
});
