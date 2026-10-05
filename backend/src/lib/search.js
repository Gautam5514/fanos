// Robust server-side global search over the live community state.
// Pure, deterministic, no LLM required. Role-scoped by the caller.
//
// Design goals:
//   • Safe: never leaks private data (opportunities are creator-only; a member sees
//     only their own invites — mirrors snapshotFor()).
//   • Deterministic ranking: exact > prefix > word-boundary > substring, with a small
//     field-weight (title/name > tags/skills > body) and recency tiebreak.
//   • Bounded: query length capped, results capped, every string truncated.

const MAX_Q = 80;
const MAX_PER_TYPE = 8;
const MAX_TOTAL = 25;

const norm = (s) => String(s || '').toLowerCase().trim();
const clip = (s, n) => String(s || '').slice(0, n);

// Score a single haystack string against the normalized query.
// Returns 0 when there is no match.
function scoreField(hay, q) {
  const h = norm(hay);
  if (!h) return 0;
  if (h === q) return 100;                       // exact
  if (h.startsWith(q)) return 70;                // prefix
  const boundary = new RegExp(`(^|[^a-z0-9])${escapeRe(q)}`); // word-start
  if (boundary.test(h)) return 55;
  if (h.includes(q)) return 35;                  // substring
  return 0;
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Best score across weighted fields: [text, weight].
function best(fields, q) {
  let top = 0;
  for (const [text, weight] of fields) {
    const base = scoreField(text, q);
    if (base) top = Math.max(top, base * weight);
  }
  return top;
}

// A short, safe member label (first name + last initial) for non-creator views.
function safeName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Member';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function searchState(user, st, rawQuery) {
  const q = norm(clip(rawQuery, MAX_Q));
  if (q.length < 2) return { query: q, total: 0, groups: [] };

  const isCreator = user.role === 'creator';
  const groups = [];
  const push = (type, items) => { if (items.length) groups.push({ type, items: items.slice(0, MAX_PER_TYPE) }); };

  // ── Ideas ──
  const ideas = (st.ideas || [])
    .map((i) => ({ i, s: best([[i.title, 1], [(i.tags || []).join(' '), 0.7], [i.category, 0.6], [i.description, 0.4]], q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.i.daysAgo || 0) - (b.i.daysAgo || 0))
    .map(({ i }) => ({ id: i.id, label: clip(i.title, 140), meta: `${(i.supports || 0)} supporters · ${i.status || 'open'}`, type: 'idea' }));
  push('ideas', ideas);

  // ── Members / people ──
  const members = (st.members || [])
    .map((m) => ({ m, s: best([[m.name, 1], [(m.skills || []).join(' '), 0.8], [m.role, 0.7], [(m.interests || []).join(' '), 0.5], [m.city, 0.5]], q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ m }) => ({
      id: m.id,
      label: isCreator ? clip(m.name, 60) : safeName(m.name),
      meta: `${clip(m.role, 30)}${m.city ? ` · ${clip(m.city, 30)}` : ''}`,
      type: 'member',
    }));
  push('people', members);

  // ── Communities ──
  const communities = (st.communities || [])
    .map((c) => ({ c, s: best([[c.name, 1], [c.description, 0.5], [c.interest, 0.6]], q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ c }) => ({ id: c.id, label: `${c.emoji || '✨'} ${clip(c.name, 40)}`, meta: `${(c.members || 0)} members`, type: 'community' }));
  push('communities', communities);

  // ── Projects ──
  const projects = (st.projects || [])
    .map((p) => ({ p, s: best([[p.name, 1], [p.description, 0.4]], q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ p }) => ({ id: p.id, label: clip(p.name, 80), meta: `${(p.contributors || []).length} contributors · ${p.status || 'in progress'}`, type: 'project' }));
  push('projects', projects);

  // ── Opportunities (creator only) ──
  if (isCreator) {
    const opps = (st.opportunities || [])
      .map((o) => ({ o, s: best([[o.subject, 1], [o.from?.name, 0.7], [o.from?.org, 0.7], [o.message, 0.3]], q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ o }) => ({ id: o.id, label: clip(o.subject, 120), meta: clip([o.from?.name, o.from?.org].filter(Boolean).join(' · '), 60), type: 'opportunity' }));
    push('opportunities', opps);
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  // Enforce a global cap across all groups while preserving per-type grouping.
  let budget = MAX_TOTAL;
  const capped = groups.map((g) => {
    const items = g.items.slice(0, Math.max(0, budget));
    budget -= items.length;
    return { ...g, items };
  }).filter((g) => g.items.length);

  return { query: q, total: Math.min(total, MAX_TOTAL), groups: capped };
}
