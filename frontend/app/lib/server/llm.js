// Optional LLM layer (OpenAI-compatible Chat Completions API).
// Enabled only when OPENAI_API_KEY is set. Works with OpenAI, or any compatible
// provider via OPENAI_BASE_URL (e.g. Gemini: https://generativelanguage.googleapis.com/v1beta/openai).
// When disabled, the app uses the built-in deterministic engine in lib/ai.js.

export const llmEnabled = () => !!process.env.OPENAI_API_KEY;

export async function chat(messages, { maxTokens = 400, temperature = 0.4 } = {}) {
  if (!llmEnabled()) return null;
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = 'You are FanOS AI, an assistant that helps an influencer understand their community. Be concise, specific and use only the data given. Never invent numbers.';

export async function summarizeIdea(idea) {
  return chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Summarize this community idea in ONE sentence (max 30 words) starting with "Community wants".\nTitle: ${idea.title}\nDescription: ${idea.description}\nNeeds: ${idea.needs.join(', ')}` },
  ], { maxTokens: 80 });
}
