// Optional LLM endpoints. Returns 501 when no LLM key is configured so the client
// keeps the built-in engine's answer.
import { getUser, handle, json, rateLimited } from '../../lib/server/auth';
import { chat, llmEnabled } from '../../lib/server/llm';

const SYSTEM = 'You are FanOS AI, helping an influencer understand their community. Answer in 2-4 short sentences, concrete and actionable. Use ONLY the JSON data provided. Never invent numbers or names.';

export async function GET() {
  return json({ enabled: llmEnabled() });
}

export const POST = handle(async (request) => {
  if (!llmEnabled()) return json({ error: 'LLM not configured' }, 501);
  const user = await getUser();
  if (!user || user.role !== 'creator') return json({ error: 'Creator sign-in required' }, 401);
  if (rateLimited(request, `ai:${user.id}`, 30, 60_000)) return json({ error: 'Too many AI requests' }, 429);
  const text = await request.text();
  if (text.length > 30_000) return json({ error: 'Too large' }, 413);
  let b;
  try { b = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (b.task === 'copilot') {
    const answer = await chat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Community data (computed by FanOS):\n${JSON.stringify(b.context).slice(0, 20000)}\n\nQuestion: ${String(b.question || '').slice(0, 300)}` },
    ], { maxTokens: 250 });
    return answer ? json({ text: answer }) : json({ error: 'LLM unavailable' }, 502);
  }
  if (b.task === 'promo') {
    const i = b.idea || {};
    const answer = await chat([
      { role: 'system', content: 'You write social media posts for an influencer. Keep facts exactly as given. No hashtags spam (max 4).' },
      { role: 'user', content: `Write a ${String(b.tone || 'Excited').slice(0, 20)} ${String(b.platform || 'Instagram').slice(0, 20)} post${b.platform === 'X' ? ' under 270 characters' : ''} by ${String(b.creator || 'the creator').slice(0, 60)} announcing that a community idea is becoming a project.\nIdea: ${String(i.title || '').slice(0, 140)}\nDescription: ${String(i.description || '').slice(0, 600)}\nProposed by: ${String(i.author || 'a member').slice(0, 60)}\nSupporters: ${Number(i.supports) || 0}\nVolunteers: ${Number(i.volunteers) || 0}` },
    ], { maxTokens: 350, temperature: 0.7 });
    return answer ? json({ text: answer }) : json({ error: 'LLM unavailable' }, 502);
  }
  return json({ error: 'Unknown task' }, 400);
});
