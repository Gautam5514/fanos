// Optional LLM endpoints. Returns 501 when no LLM key is configured so the client
// keeps the built-in engine's answer.
import { Router } from 'express';
import { getUser, rateLimited } from '../lib/auth.js';
import { readJson } from '../lib/http.js';
import { chat, llmEnabled } from '../lib/llm.js';

const router = Router();
const SYSTEM = 'You are FanOS AI, helping an influencer understand their community. Answer in 2-4 short sentences, concrete and actionable. Use ONLY the JSON data provided. Never invent numbers or names.';

router.get('/', (req, res) => {
  res.json({ enabled: llmEnabled() });
});

router.post('/', async (req, res) => {
  if (!llmEnabled()) return res.status(501).json({ error: 'LLM not configured' });
  const user = await getUser(req, res);
  if (!user || user.role !== 'creator') return res.status(401).json({ error: 'Creator sign-in required' });
  if (rateLimited(req, `ai:${user.id}`, 30, 60_000)) return res.status(429).json({ error: 'Too many AI requests' });
  const b = readJson(req, res, 30_000);
  if (b === undefined) return;

  if (b.task === 'copilot') {
    const answer = await chat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Community data (computed by FanOS):\n${JSON.stringify(b.context).slice(0, 20000)}\n\nQuestion: ${String(b.question || '').slice(0, 300)}` },
    ], { maxTokens: 250 });
    return answer ? res.json({ text: answer }) : res.status(502).json({ error: 'LLM unavailable' });
  }
  if (b.task === 'promo') {
    const i = b.idea || {};
    const answer = await chat([
      { role: 'system', content: 'You write social media posts for an influencer. Keep facts exactly as given. No hashtags spam (max 4).' },
      { role: 'user', content: `Write a ${String(b.tone || 'Excited').slice(0, 20)} ${String(b.platform || 'Instagram').slice(0, 20)} post${b.platform === 'X' ? ' under 270 characters' : ''} by ${String(b.creator || 'the creator').slice(0, 60)} announcing that a community idea is becoming a project.\nIdea: ${String(i.title || '').slice(0, 140)}\nDescription: ${String(i.description || '').slice(0, 600)}\nProposed by: ${String(i.author || 'a member').slice(0, 60)}\nSupporters: ${Number(i.supports) || 0}\nVolunteers: ${Number(i.volunteers) || 0}` },
    ], { maxTokens: 350, temperature: 0.7 });
    return answer ? res.json({ text: answer }) : res.status(502).json({ error: 'LLM unavailable' });
  }
  res.status(400).json({ error: 'Unknown task' });
});

export default router;
