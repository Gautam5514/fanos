// Browser helpers for the Groq-powered AI endpoints (see backend/src/routes/ai.js).
// Every helper resolves — never throws — so a failed AI call can always fall back to the
// built-in engine. The API key never reaches the browser.
import { trends } from './ai';

async function readError(r) {
  let d = null;
  try { d = await r.json(); } catch { /* empty */ }
  return { ok: false, status: r.status, error: d?.error || 'AI is temporarily unavailable', code: d?.code };
}

// One-shot task → { ok, text | data, meta } or { ok:false, error }
export async function aiTask(task, payload = {}) {
  try {
    const r = await fetch('/api/ai', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, ...payload }) });
    if (!r.ok) return await readError(r);
    return { ok: true, ...(await r.json()) };
  } catch { return { ok: false, error: 'Could not reach the AI service' }; }
}

// Streams the assistant's answer. onToken(text) per piece, onStatus(text) while it looks things up,
// onReset() if text shown so far should be discarded. Resolves { ok, meta, tools, sources }.
export async function aiStream(payload, { onToken, onStatus, onReset } = {}, signal) {
  try {
    const r = await fetch('/api/ai/stream', { method: 'POST', credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok || !r.body) return await readError(r);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = ''; let done = null; let got = false;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
        if (!line.startsWith('data:')) continue;
        let j; try { j = JSON.parse(line.slice(5)); } catch { continue; }
        if (j.t) { got = true; onToken?.(j.t); }
        else if (j.status) onStatus?.(j.status);
        else if (j.reset) { got = false; onReset?.(); }
        else if (j.done) done = j;
        else if (j.error) return { ok: false, error: j.error, code: j.code, partial: got };
      }
    }
    if (!got) return { ok: false, error: 'AI returned nothing' };
    return { ok: true, meta: done ? { model: done.model, ms: done.ms, tps: done.tps } : null, tools: done?.tools || [], sources: done?.sources || [] };
  } catch (e) {
    return e?.name === 'AbortError' ? { ok: false, aborted: true } : { ok: false, error: 'Could not reach the AI service' };
  }
}

// Human-style starter questions (mix of English and Hinglish — the AI understands both).
export const AI_SUGGESTIONS = {
  creator: ['Who in my community can edit videos?', 'Which idea should I build first, and why?', 'Mere community me abhi kya chal raha hai?', 'Any brand deals worth replying to?', 'Which members from Mumbai are active?', 'What is my audience asking for the most?'],
  member: ['Which ideas need a developer?', 'Kaun si idea pe main help kar sakta hoon?', 'Who here is working on design?', 'What projects can I join?', 'Which idea is the most popular right now?', 'Suggest an idea I could share'],
};

// A compact, privacy-sensible snapshot of the community for the model (counts, not raw dumps).
export function aiContext(state, intel) {
  const week = (d) => (d ?? 99) < 7;
  const realOpps = intel.opps.filter((o) => !o.ai.isSpam && o.status !== 'archived');
  return {
    counts: {
      members: state.members.length, newMembersThisWeek: state.members.filter((m) => week(m.joinedDaysAgo)).length,
      ideas: state.ideas.length, newIdeasThisWeek: state.ideas.filter((i) => week(i.daysAgo)).length,
      communities: state.communities.length, projects: state.projects.length,
      opportunities: realOpps.length, highPriorityOpportunities: realOpps.filter((o) => o.ai.priority >= 50).length,
    },
    communities: state.communities.map((c) => ({ name: c.name, members: state.members.filter((m) => (m.communities || []).includes(c.id)).length })),
    topIdeas: intel.ranked.slice(0, 8).map((i) => ({ title: i.title, signalScore: intel.scored.get(i.id).score, supporters: i.supports, volunteers: i.volunteers.length, stage: i.status })),
    clusters: intel.clusters.slice(0, 5).map((c) => ({ label: c.label, requests: c.requests, supporters: c.supporters, summary: c.summary })),
    trendingTopics: trends(state.ideas).slice(0, 4).map((t) => ({ topic: t.topic, thisWeek: t.thisWeek, lastWeek: t.lastWeek })),
    topOpportunities: realOpps.sort((a, b) => b.ai.priority - a.ai.priority).slice(0, 4).map((o) => ({ category: o.ai.category, from: o.from.org || o.from.name, priority: o.ai.priority, status: o.status })),
    recentActivity: state.activity.slice(0, 5).map((a) => a.text),
  };
}

export const prettyModel = (m = '') => m.replace(/^openai\//, '').replace(/-versatile$|-instant$/, '');
