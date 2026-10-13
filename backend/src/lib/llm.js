// LLM layer — Groq first (OpenAI-compatible Chat Completions API at api.groq.com/openai/v1).
//
//   GROQ_API_KEY            enables AI features (get one at console.groq.com/keys)
//   GROQ_MODEL              smart model for chat/analysis   (default openai/gpt-oss-120b)
//   GROQ_FAST_MODEL         tiny, instant tasks (summaries)  (default openai/gpt-oss-20b)
//   GROQ_STRUCTURED_MODEL   strict JSON-schema output        (default openai/gpt-oss-20b)
// Models come and go on Groq, so the backend asks Groq which ones THIS key can use and falls back
// down a preference list when the configured one is missing (see pickModel below).
//   GROQ_BASE_URL           override the endpoint (tests / proxies)
//
// Falls back to any other OpenAI-compatible provider through OPENAI_API_KEY / OPENAI_BASE_URL /
// OPENAI_MODEL. With no key at all, every AI feature switches off and the app keeps using its
// built-in deterministic engine (lib/ai.js) — nothing breaks.
//
// The key never leaves the server. Prompts are never logged.

export class LlmError extends Error {
  constructor(code, message, { retryAfter } = {}) {
    super(message || code);
    this.code = code; // disabled | auth | rate_limited | timeout | unavailable | bad_output | bad_request
    this.retryAfter = retryAfter;
  }
}

function config() {
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    return {
      provider: 'groq', key: groq,
      base: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
      models: { smart: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', fast: process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b', json: process.env.GROQ_STRUCTURED_MODEL || 'openai/gpt-oss-20b' },
    };
  }
  const oa = process.env.OPENAI_API_KEY?.trim();
  if (oa) {
    const m = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return { provider: 'openai', key: oa, base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''), models: { smart: m, fast: m, json: m } };
  }
  return null;
}

export const llmEnabled = () => !!config();
export const llmInfo = () => { const c = config(); return c ? { provider: c.provider, models: c.models } : null; };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toError(status, headers) {
  if (status === 401 || status === 403) return new LlmError('auth', 'The AI key was rejected');
  if (status === 429) return new LlmError('rate_limited', 'AI is busy right now', { retryAfter: Number(headers.get('retry-after')) || 5 });
  if (status === 400 || status === 404 || status === 422) return new LlmError('bad_request', 'The AI request was invalid');
  return new LlmError('unavailable', 'AI is temporarily unavailable');
}

// One request with a timeout and a single polite retry on 429 / 5xx (honouring Retry-After).
async function send(body, { signal, timeoutMs = 20000, retry429 = true } = {}) {
  const c = config();
  if (!c) throw new LlmError('disabled', 'AI is not configured');
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new LlmError('timeout', 'AI took too long')), timeoutMs);
    const onAbort = () => ctrl.abort(signal.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const r = await fetch(`${c.base}/chat/completions`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
        body: JSON.stringify(body),
      });
      if (r.ok) return { res: r, cfg: c, clear: () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); } };
      clearTimeout(timer); signal?.removeEventListener('abort', onAbort);
      const err = toError(r.status, r.headers);
      const retryable = (r.status === 429 && retry429 && err.retryAfter <= 3) || r.status >= 500;
      if (retryable && attempt === 0) { await sleep(r.status === 429 ? err.retryAfter * 1000 : 400); continue; }
      await r.body?.cancel().catch(() => {});
      throw err;
    } catch (e) {
      clearTimeout(timer); signal?.removeEventListener('abort', onAbort);
      if (e instanceof LlmError) throw e;
      if (ctrl.signal.aborted) throw (ctrl.signal.reason instanceof LlmError ? ctrl.signal.reason : new LlmError('timeout', 'AI request cancelled'));
      if (attempt === 0) { await sleep(300); continue; }
      throw new LlmError('unavailable', 'Could not reach the AI service');
    }
  }
}

const isReasoningModel = (m) => /gpt-oss/i.test(m);

// ---- model discovery ------------------------------------------------------------------------
// Preference order per job; the configured model always goes first. Strict JSON needs a model that
// supports json_schema (gpt-oss / qwen3).
const PREFER = {
  smart: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
  fast: ['openai/gpt-oss-20b', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
  json: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
};
let seen = { at: 0, ids: null }; // models this key can use (Groq only), cached for 10 minutes
async function availableModels(c) {
  if (c.provider !== 'groq') return null;
  if (seen.ids && Date.now() - seen.at < 600_000) return seen.ids;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${c.base}/models`, { headers: { Authorization: `Bearer ${c.key}` }, signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) { const d = await r.json(); seen = { at: Date.now(), ids: new Set((d.data || []).map((m) => m.id)) }; return seen.ids; }
  } catch { /* fall through: use the configured models as-is */ }
  seen = { at: Date.now() - 540_000, ids: null }; // retry the lookup in about a minute
  return null;
}
// Models that just hit their rate limit sit out until their Retry-After passes, so requests flow to
// another model (each model has its own token-per-minute allowance on Groq).
const cooling = new Map(); // model -> timestamp until which to avoid it
const cool = (model, seconds) => cooling.set(model, Date.now() + Math.max(1, seconds || 5) * 1000);
const isCool = (m) => (cooling.get(m) || 0) > Date.now();
async function pickModel(c, tier) {
  const want = c.models[tier] || c.models.smart;
  const ids = await availableModels(c);
  const order = [want, ...(PREFER[tier] || PREFER.smart)].filter((m, i, a2) => a2.indexOf(m) === i && (!ids || ids.has(m)));
  return order.find((m) => !isCool(m)) || order[0] || want;
}
export async function resolvedModels() {
  const c = config();
  if (!c) return null;
  return { smart: await pickModel(c, 'smart'), fast: await pickModel(c, 'fast'), json: await pickModel(c, 'json') };
}

// Opens a request on the best model; if that model is rate-limited, moves to the next one (or waits
// a few seconds when there is no alternative). `build(model)` returns the request body.
async function start(c, tier, build, { signal, timeoutMs }) {
  for (let tried = 0; ; tried++) {
    const model = await pickModel(c, tier);
    try {
      return { ...(await send(build(model), { signal, timeoutMs, retry429: false })), model };
    } catch (e) {
      if (e.code !== 'rate_limited' || tried >= 3) throw e;
      cool(model, e.retryAfter);
      if (await pickModel(c, tier) !== model) continue;
      if (e.retryAfter > 8) throw e;
      await sleep(e.retryAfter * 1000);
    }
  }
}

const bodyFor = (model, messages, { temperature, maxTokens, stream: st, schema, schemaName, tools, toolChoice }) => {
  const body = { model, messages, temperature: Math.max(0.01, temperature) }; // Groq maps 0 → 1e-8; keep it explicit
  if (st) body.stream = true;
  if (isReasoningModel(model)) { body.reasoning_effort = 'low'; body.include_reasoning = false; body.max_completion_tokens = Math.max(maxTokens, 1500); }
  else body.max_tokens = maxTokens;
  if (schema) body.response_format = { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } };
  if (tools?.length) { body.tools = tools.map((t) => ({ type: 'function', function: t })); body.tool_choice = toolChoice; }
  return body;
};

// Non-streaming completion. `tier`: 'smart' | 'fast'. Pass `schema` for strict structured JSON.
// Resolves { text | data, model, ms, tokens, tps }.
export async function complete(messages, { tier = 'smart', maxTokens = 400, temperature = 0.4, schema, schemaName = 'result', signal } = {}) {
  const c = config();
  if (!c) throw new LlmError('disabled', 'AI is not configured');
  const t0 = Date.now();
  const { res, clear, model } = await start(c, schema ? 'json' : tier, (m) => bodyFor(m, messages, { temperature, maxTokens, schema, schemaName }), { signal, timeoutMs: schema ? 30000 : 20000 });
  try {
    const d = await res.json();
    const text = d?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new LlmError('bad_output', 'The AI returned nothing');
    const ms = Date.now() - t0;
    const tokens = d?.usage?.completion_tokens || 0;
    const secs = d?.usage?.completion_time || ms / 1000;
    const out = { model, ms, tokens, tps: tokens && secs ? Math.round(tokens / secs) : 0 };
    if (!schema) return { text, ...out };
    try { return { data: JSON.parse(text), ...out }; } catch { throw new LlmError('bad_output', 'The AI returned invalid JSON'); }
  } finally { clear(); }
}

// Streaming completion: async generator of text deltas; returns the summary when finished.
export async function* stream(messages, { tier = 'smart', maxTokens = 500, temperature = 0.4, signal } = {}) {
  const c = config();
  if (!c) throw new LlmError('disabled', 'AI is not configured');
  const t0 = Date.now();
  const { res, clear, model } = await start(c, tier, (m) => bodyFor(m, messages, { temperature, maxTokens, stream: true }), { signal, timeoutMs: 60000 });
  let chunks = 0; let usage = null; let buf = '';
  const decoder = new TextDecoder();
  try {
    for await (const part of res.body) {
      buf += decoder.decode(part, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        let j; try { j = JSON.parse(payload); } catch { continue; }
        usage = j?.x_groq?.usage || j?.usage || usage;
        const delta = j?.choices?.[0]?.delta?.content;
        if (delta) { chunks++; yield delta; }
      }
    }
  } finally { clear(); }
  const ms = Date.now() - t0;
  const tokens = usage?.completion_tokens || chunks; // ≈ one token per streamed chunk when usage is absent
  const secs = usage?.completion_time || ms / 1000;
  return { model, ms, tokens, tps: tokens && secs ? Math.round(tokens / secs) : 0 };
}

// One streaming turn of an agent conversation, with optional tool (function) calling.
// Yields text deltas as they arrive; returns { content, toolCalls, meta } when the turn ends.
// toolCalls: [{ id, name, args (parsed object or null if the model sent bad JSON) }]
export async function* turn(messages, { tools, toolChoice = 'auto', tier = 'smart', maxTokens = 700, temperature = 0.3, signal } = {}) {
  const c = config();
  if (!c) throw new LlmError('disabled', 'AI is not configured');
  const t0 = Date.now();
  const { res, clear, model } = await start(c, tier, (m) => bodyFor(m, messages, { temperature, maxTokens, stream: true, tools, toolChoice }), { signal, timeoutMs: 60000 });
  let content = ''; let chunks = 0; let usage = null; let buf = '';
  const acc = []; // tool calls arrive in fragments, keyed by index
  const decoder = new TextDecoder();
  try {
    for await (const part of res.body) {
      buf += decoder.decode(part, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        let j; try { j = JSON.parse(payload); } catch { continue; }
        usage = j?.x_groq?.usage || j?.usage || usage;
        const d = j?.choices?.[0]?.delta;
        if (d?.content) { content += d.content; chunks++; yield d.content; }
        for (const tc of d?.tool_calls || []) {
          const a = (acc[tc.index ?? 0] ||= { id: '', name: '', args: '' });
          if (tc.id) a.id = tc.id;
          if (tc.function?.name) a.name += tc.function.name;
          if (tc.function?.arguments) a.args += tc.function.arguments;
        }
      }
    }
  } finally { clear(); }
  const ms = Date.now() - t0;
  const tokens = usage?.completion_tokens || chunks;
  const secs = usage?.completion_time || ms / 1000;
  const toolCalls = acc.filter((a) => a?.name).map((a, i) => {
    let args = null; try { args = a.args ? JSON.parse(a.args) : {}; } catch { /* model sent bad JSON */ }
    return { id: a.id || `call_${i}`, name: a.name, args };
  });
  return { content, toolCalls, meta: { model, ms, tokens, tps: tokens && secs ? Math.round(tokens / secs) : 0 } };
}

// ---- convenience used elsewhere ------------------------------------------------------------

const SYSTEM = 'You are FanOS AI, an assistant that helps an influencer understand their community. Be concise, specific and use only the data given. Never invent numbers.';

// Backwards-compatible plain chat helper: resolves text or null (never throws).
export async function chat(messages, opts = {}) {
  try { return (await complete(messages, opts)).text; } catch { return null; }
}

export async function summarizeIdea(idea) {
  return chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Summarize this community idea in ONE sentence (max 30 words) starting with "Community wants".\nTitle: ${idea.title}\nDescription: ${idea.description}\nNeeds: ${idea.needs.join(', ')}` },
  ], { tier: 'fast', maxTokens: 80 });
}
