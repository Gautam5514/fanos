// FanOS AI Community Intelligence Engine.
// Runs fully client-side and deterministically for the MVP:
// TF-IDF vectors with synonym normalisation stand in for embeddings,
// and transparent scoring rules produce the Signal Score.
// Every function is pure so it can later move behind an API / LLM.

import { CREATOR } from './seed.js';
import { ideaStage } from './reducer.js';

// ---------------------------------------------------------------- text
const STOP = new Set('a an the and or but of to in on for with at by from is are was were be been it this that these those i we you they he she me my our your us please can could would should will just about into over under via as so do does did have has had make makes made get got need needs want wants more most some any all every each one two how what which who when where why lets let also really very like using use used new way ways them their there here than then too only not no yes'.split(' '));

// Map surface words to a canonical concept so "teach AI automation" ≈ "AI agent course".
const SYN = {
  agents: 'agent', agent: 'agent', agentic: 'agent', bot: 'agent', bots: 'agent',
  automation: 'automate', automations: 'automate', automate: 'automate', automating: 'automate', automatically: 'automate', automatic: 'automate', workflow: 'automate', workflows: 'automate',
  course: 'course', courses: 'course', tutorial: 'course', tutorials: 'course', workshop: 'course', class: 'course', teach: 'course', lesson: 'course', lessons: 'course', series: 'course', learn: 'course', learning: 'course', guide: 'course', beginner: 'beginner', beginners: 'beginner',
  directory: 'directory', database: 'directory', list: 'directory', catalog: 'directory', showcase: 'directory', curated: 'directory', searchable: 'directory',
  tool: 'tool', tools: 'tool', app: 'tool', product: 'tool', products: 'tool',
  startups: 'startup', startup: 'startup', founders: 'founder', founder: 'founder',
  notes: 'notes', note: 'notes', summary: 'notes', summarise: 'notes', summarize: 'notes', mind: 'notes', map: 'notes', maps: 'notes', visual: 'notes',
  video: 'video', videos: 'video', youtube: 'video', podcast: 'podcast', podcasts: 'podcast',
  challenge: 'challenge', sprint: 'challenge', accountability: 'challenge', streak: 'challenge', streaks: 'challenge', '30-day': 'challenge', daily: 'challenge',
  live: 'live', stream: 'live', streams: 'live', livestream: 'live', session: 'live', sessions: 'live', pair: 'live', 'pair-programming': 'live',
  build: 'build', builder: 'build', builders: 'build', building: 'build', ship: 'build', shipping: 'build', built: 'build',
  monetization: 'monetize', monetize: 'monetize', monetise: 'monetize', brand: 'monetize', deal: 'monetize', deals: 'monetize', income: 'monetize', rate: 'monetize', sponsor: 'monetize',
  creators: 'creator', creator: 'creator',
  devs: 'developer', dev: 'developer', developers: 'developer', developer: 'developer', engineer: 'developer', engineers: 'developer', programmer: 'developer',
  designers: 'designer', designer: 'designer', design: 'design',
};

export function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9.+-]+/)
    .map((w) => w.replace(/^[.+-]+|[.+-]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => SYN[w] || (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

function termFreq(tokens) {
  const tf = new Map();
  tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
  return tf;
}

// Build "embeddings" (TF-IDF vectors) for a corpus of ideas.
export function buildVectors(ideas) {
  const docs = ideas.map((i) => {
    // Title carries more intent than the description, tags add topic context.
    const tokens = [...tokenize(i.title), ...tokenize(i.title), ...tokenize(i.description), ...i.tags.flatMap((t) => tokenize(t))];
    return { id: i.id, tf: termFreq(tokens) };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const N = docs.length;
  const idf = (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
  const vectors = new Map();
  docs.forEach((d) => {
    const v = new Map();
    let norm = 0;
    d.tf.forEach((c, t) => { const w = (1 + Math.log(c)) * idf(t); v.set(t, w); norm += w * w; });
    norm = Math.sqrt(norm) || 1;
    v.forEach((w, t) => v.set(t, w / norm));
    vectors.set(d.id, v);
  });
  return { vectors, idf };
}

export function vectorize(text, tags, idf) {
  const tokens = [...tokenize(text), ...(tags || []).flatMap((t) => tokenize(t))];
  const v = new Map();
  let norm = 0;
  termFreq(tokens).forEach((c, t) => { const w = (1 + Math.log(c)) * idf(t); v.set(t, w); norm += w * w; });
  norm = Math.sqrt(norm) || 1;
  v.forEach((w, t) => v.set(t, w / norm));
  return v;
}

export function cosine(a, b) {
  let s = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  small.forEach((w, t) => { const o = big.get(t); if (o) s += w * o; });
  return s;
}

const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};

// ---------------------------------------------------------------- moderation
const SPAM_PATTERNS = [
  [/https?:\/\/(bit\.ly|tinyurl|[a-z0-9-]+\.xyz)/i, 'Suspicious shortened / throwaway link', 35],
  [/\b(giveaway|guaranteed|double your|send \d|crypto|eth|btc)\b/i, 'Financial scam language', 40],
  [/\b(follow (for|4) follow|follow back|f4f)\b/i, 'Follow-for-follow request', 60],
  [/\b(grow your followers|\d+k followers in|100% real)\b/i, 'Follower-selling spam', 45],
  [/!!!|🔥🔥/, 'Excessive hype punctuation', 15],
];
const TOXIC = /\b(idiot|stupid|scam artist|hate you|trash)\b/i;

export function moderate(text = '') {
  const reasons = [];
  let spamScore = 0;
  SPAM_PATTERNS.forEach(([re, why, w]) => { if (re.test(text)) { reasons.push(why); spamScore += w; } });
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const caps = letters ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;
  if (letters.length > 12 && caps > 0.6) { reasons.push('Mostly capital letters'); spamScore += 20; }
  if (TOXIC.test(text)) { reasons.push('Abusive language'); spamScore += 60; }
  spamScore = Math.min(100, spamScore);
  return { isSpam: spamScore >= 50, spamScore, reasons };
}

// ---------------------------------------------------------------- intent
const OPP_RULES = {
  'Brand Partnership': [/\b(sponsor\w*|brand|campaign|paid integration|integration|budget|\$\s?\d[\d,]*|rates?)\b/gi, 3],
  'Speaking Invitation': [/\b(speak\w*|keynote|panel|summit|conference|fireside|e-summit|talk)\b/gi, 3],
  Collaboration: [/\b(collab\w*|joint|together|podcast|episode|co-create|feature)\b/gi, 2],
  'Business Opportunity': [/\b(acqui\w*|invest\w*|equity|advisory|licen[cs]e|fund|portfolio|m&a)\b/gi, 3],
  Hiring: [/\b(hiring|hire|role|position|job|recruit\w*|engineers? and)\b/gi, 3],
  'Community Proposal': [/\b(chapter|meetup\w*|volunteer\w*|community project|organi[sz]e|official community)\b/gi, 3],
  'Talent Offer': [/\b(edit (one|for)|for free|show what i can do|portfolio|can i (edit|design))\b/gi, 3],
};
const CATEGORY_VALUE = { 'Brand Partnership': 30, 'Business Opportunity': 28, 'Speaking Invitation': 22, Collaboration: 22, 'Community Proposal': 24, Hiring: 14, 'Talent Offer': 12 };

export function classifyOpportunity(o) {
  const text = `${o.subject} ${o.message}`;
  const mod = moderate(text);
  if (mod.isSpam) return { category: 'Spam', confidence: 0.97, priority: 2, isSpam: true, reasons: mod.reasons, signals: [] };
  const scores = Object.entries(OPP_RULES).map(([cat, [re, w]]) => [cat, (text.match(re) || []).length * w]);
  scores.sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = scores[0];
  const total = scores.reduce((s, [, v]) => s + v, 0) || 1;
  const category = bestScore > 0 ? best : 'Collaboration';
  const confidence = Math.min(0.99, 0.55 + (bestScore / total) * 0.44);

  const money = (text.match(/\$\s?([\d,]+)/) || [])[1];
  const amount = money ? Number(money.replace(/,/g, '')) : 0;
  const relevance = tokenize(text).filter((t) => ['agent', 'automate', 'build', 'startup', 'founder', 'creator', 'ai', 'challenge', 'directory', 'tool'].includes(t)).length;
  const signals = [];
  let priority = CATEGORY_VALUE[category] || 15;
  if (o.from.verified) { priority += 14; signals.push('Verified sender'); }
  if (o.from.org && o.from.org !== 'Community member') { priority += 6; signals.push(`From ${o.from.org}`); }
  if (o.from.followers >= 20000) { priority += 10; signals.push(`${fmt(o.from.followers)} audience`); }
  else if (o.from.followers >= 5000) { priority += 5; signals.push(`${fmt(o.from.followers)} audience`); }
  if (amount) { priority += Math.min(20, Math.round(amount / 700)); signals.push(`Budget mentioned: $${amount.toLocaleString('en-US')}`); }
  if (relevance) { priority += Math.min(15, relevance * 4); signals.push('Matches your content themes'); }
  if (o.from.memberId) { priority += 8; signals.push('Active community member'); }
  if (o.hoursAgo < 12) priority += 4;
  priority = Math.max(5, Math.min(99, priority));
  return { category, confidence, priority, isSpam: false, reasons: [], signals, amount };
}

export function draftReply(o, cls) {
  const first = o.from.name.split(' ')[0];
  const lines = {
    'Brand Partnership': `Hi ${first}, thanks for reaching out! The ${o.from.org || 'campaign'} idea fits what my audience is talking about right now. Could you share the brief, timelines and deliverables? Happy to set up a call this week.`,
    'Speaking Invitation': `Hi ${first}, thank you for the invitation — I’d love to learn more. Could you share the date, format and expected audience? I’ll confirm availability within 48 hours.`,
    Collaboration: `Hey ${first}! Love this. Let’s find a format that works for both audiences — want to jump on a 20-minute call next week?`,
    'Business Opportunity': `Hi ${first}, appreciate you thinking of me. I’m open to an exploratory conversation — could you send a short overview first?`,
    Hiring: `Hi ${first}, happy to help. Send me the role link and I’ll share it with the relevant communities inside FanOS (Developers and AI Builders).`,
    'Community Proposal': `Hi ${first}, this is exactly the kind of initiative I want to support. Let’s make it official — I’ll set it up as a community project so others can join.`,
    'Talent Offer': `Hi ${first}, thanks for offering! Please share your portfolio in the Content Creators community — I review featured work from there every week.`,
  };
  return lines[cls.category] || `Hi ${first}, thanks for reaching out — I’ll get back to you soon.`;
}

// ---------------------------------------------------------------- reputation
export function contributionScore(m) {
  const s = m.stats || {};
  const base = (s.ideas || 0) * 18 + (s.helpful || 0) * 6 + (s.projects || 0) * 55 + (s.featured || 0) * 70;
  if (!base) return 0; // no contributions yet → no score (no free points for just being active)
  const quality = 0.6 + ((m.positive || 80) / 100) * 0.6;
  return Math.round(base * quality + Math.min(60, (m.lastActiveDaysAgo ?? 30) < 7 ? 40 : 10));
}

export function hiddenGems(members) {
  return members
    .map((m) => ({ m, score: contributionScore(m) }))
    // New members who already contribute a lot, or members whose score is growing fast.
    .filter(({ m }) => (m.joinedDaysAgo <= 45 && (m.stats.ideas + m.stats.helpful) >= 3 && (m.positive == null || m.positive >= 88)) || m.growth >= 150)
    .filter(({ m }) => (m.socialFollowers || 0) < 5000) // value over popularity
    .sort((a, b) => (b.m.growth || 0) - (a.m.growth || 0) || b.score - a.score)
    .slice(0, 4)
    .map(({ m, score }) => ({
      member: m, score,
      reason: m.joinedDaysAgo <= 30
        ? `Joined ${m.joinedDaysAgo === 0 ? 'today' : `${m.joinedDaysAgo} day${m.joinedDaysAgo === 1 ? '' : 's'} ago`} • ${m.stats.ideas + m.stats.helpful} contributions${m.positive != null ? ` • ${m.positive}% positive feedback` : ''}`
        : `Helped ${m.stats.helpful} members${m.growth ? ` • contribution score up ${m.growth}% this month` : ''}`,
    }));
}

// ---------------------------------------------------------------- clustering
const DISPLAY = { ai: 'AI', agent: 'Agent', course: 'Course', automate: 'Automation', directory: 'Directory', tool: 'Tool', challenge: 'Challenge', build: 'Builder', live: 'Live', notes: 'Visual Notes', monetize: 'Monetization', creator: 'Creator', startup: 'Startup', video: 'Video', podcast: 'Podcast', developer: 'Developer', design: 'Design', designer: 'Designer', beginner: 'Beginner' };
const FORMAT_WORDS = ['course', 'challenge', 'directory', 'tool', 'live', 'notes', 'podcast'];

// Phrase rules over the cluster's strongest concepts give readable labels;
// fall back to the most-supported idea's title.
const LABEL_RULES = [
  [['agent', 'course'], 'AI Agent Course'],
  [['challenge', 'build'], 'AI Builder Challenge'],
  [['challenge'], 'Community Challenge'],
  [['directory', 'startup'], 'Community Tool & Startup Directory'],
  [['directory'], 'Community Directory'],
  [['notes'], 'AI Visual Notes Tool'],
  [['live'], 'Live Build Session Series'],
  [['monetize'], 'Creator Monetization Playbook'],
  [['podcast'], 'Community Podcast'],
];
function labelCluster(centroid, members) {
  const top = [...centroid.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  const rule = LABEL_RULES.find(([req]) => req.every((t) => top.includes(t)));
  return rule ? rule[1] : members[0].title;
}

const NEED_PHRASE = { Developer: 'developers', Designer: 'designers', Marketing: 'marketers', 'Video Editor': 'video editors', Writer: 'writers', Funding: 'funding', Feedback: 'feedback' };

function normalize(map) {
  let n = 0;
  map.forEach((w) => (n += w * w));
  n = Math.sqrt(n) || 1;
  const out = new Map();
  map.forEach((w, t) => out.set(t, w / n));
  return out;
}

export function clusterIdeas(ideas, threshold = 0.3) {
  const { vectors } = buildVectors(ideas);
  const sorted = [...ideas].sort((a, b) => b.supports - a.supports);
  const clusters = [];
  sorted.forEach((idea) => {
    const v = vectors.get(idea.id);
    let best = null, bestSim = 0;
    clusters.forEach((c) => {
      const sim = 0.8 * cosine(v, c.centroid) + 0.2 * jaccard(idea.tags, c.tags);
      if (sim > bestSim) { bestSim = sim; best = c; }
    });
    if (best && bestSim >= threshold) {
      best.items.push({ idea, similarity: bestSim });
      v.forEach((w, t) => best.sum.set(t, (best.sum.get(t) || 0) + w));
      best.centroid = normalize(best.sum);
      best.tags = [...new Set([...best.tags, ...idea.tags])];
    } else {
      clusters.push({ items: [{ idea, similarity: 1 }], centroid: new Map(v), sum: new Map(v), tags: [...idea.tags] });
    }
  });
  return clusters
    .filter((c) => c.items.length > 1)
    .map((c, i) => {
      const items = c.items.map((x) => x.idea);
      const requests = items.reduce((s, x) => s + 1 + (x.mentions || 0), 0);
      const supporters = items.reduce((s, x) => s + x.supports, 0);
      const needCounts = {};
      items.forEach((x) => x.needs.forEach((n) => (needCounts[n] = (needCounts[n] || 0) + 1)));
      const topNeeds = Object.entries(needCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => NEED_PHRASE[n]);
      const label = labelCluster(c.centroid, items);
      return {
        id: `cluster_${i}`,
        label,
        items: c.items.sort((a, b) => b.idea.supports - a.idea.supports),
        ideaIds: items.map((x) => x.id),
        requests, supporters,
        tags: c.tags.slice(0, 4),
        summary: summarizeCluster(label, items, topNeeds),
      };
    })
    .sort((a, b) => b.requests - a.requests);
}

function summarizeCluster(label, items, topNeeds) {
  const text = items.map((i) => `${i.title} ${i.description}`).join(' ').toLowerCase();
  const angles = [];
  if (/beginner|no phd|no coding|\bstart\b|from scratch/.test(text)) angles.push('beginner-friendly');
  if (/practical|real|deploy|production|actually/.test(text)) angles.push('practical');
  if (/live|together|stream/.test(text)) angles.push('live and interactive');
  if (/free|no affiliate|honest/.test(text)) angles.push('free and trustworthy');
  if (/hindi|language/.test(text)) angles.push('available in Hindi');
  const focus = /business|agency|client|small business/.test(text) ? ', particularly for business automation' : /creator|video|podcast/.test(text) ? ', especially for creators' : /startup|founder/.test(text) ? ', focused on community founders' : '';
  const adj = angles.slice(0, 3).join(', ') || 'well-scoped';
  const help = topNeeds.length ? ` Members are offering help as ${topNeeds.join(' and ')}.` : '';
  return `Members want a ${adj} ${label.toLowerCase().replace(/^ai/, 'AI')}${focus}. ${items.length} separate ideas were merged into one signal.${help}`;
}

export function findSimilar(text, tags, ideas, limit = 3) {
  if (!text || text.trim().length < 8) return [];
  const { vectors, idf } = buildVectors(ideas);
  const v = vectorize(`${text} ${text}`, tags, idf);
  return ideas
    .map((i) => ({ idea: i, similarity: 0.85 * cosine(v, vectors.get(i.id)) + 0.15 * jaccard(tags || [], i.tags) }))
    .filter((x) => x.similarity > 0.22)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// ---------------------------------------------------------------- idea summary
// One-sentence "AI Summary". Uses the LLM summary when the server produced one,
// otherwise an extractive summary: intent from the title + the key clause of the description.
const NEED_WORDS = { Developer: 'developers', Designer: 'designers', Marketing: 'marketers', 'Video Editor': 'video editors', Writer: 'writers', Funding: 'funding', Feedback: 'feedback' };
export function summarizeIdea(idea) {
  if (idea.aiSummary) return idea.aiSummary;
  let t = idea.title.trim().replace(/[.!?]+$/, '')
    .replace(/^(please|pls|kindly|we need|i want|can you|could you|let'?s|gautam should)\s+/i, '');
  const PROPER = /^(Notion|gautam|YouTube|LinkedIn|Instagram|Hindi|Figma|[A-Z0-9]{2,}\b)/;
  const lower = (x) => (PROPER.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1));
  // Article for a noun phrase: none for plurals ("streams", "meetups"), "an" before vowels/"AI".
  const withArticle = (x) => {
    const head = x.split(':')[0].split(/\s+(?:for|with|of|that|between|where|in|to|from|on|by|organised|built|made|featuring|comparing|curated|used)\s+/i)[0].split(/[\s:]+/).pop();
    if (/[^s]s$/i.test(head) && !/(ss|us|is)$/i.test(head)) return x;
    return `${/^(a|e|i|o|u|AI\b)/i.test(x) ? 'an' : 'a'} ${x}`;
  };
  let intent;
  if (/^teach\s+/i.test(t)) intent = `to learn ${t.replace(/^teach\s+/i, '')}`;
  else if (/^(build|make|create|start|launch|run|host|open|turn|auto-generate|record|do)\b/i.test(t)) intent = `to ${lower(t)}`;
  else if (/^(a|an|the)\s/i.test(t)) intent = lower(t);
  else intent = withArticle(lower(t));
  // Use the first sentence only when it describes the thing itself (not "I run…", "Most…").
  const first = (idea.description.split(/(?<=[.!?])\s+/)[0] || '').replace(/[.!?]+$/, '');
  let clause = /^(a|an|the|every|one)\s/i.test(first) ? first.split(' — ')[0] : '';
  if (clause.length > 110) clause = `${clause.slice(0, 107).replace(/[\s,;:]+\S*$/, '')}…`;
  const needs = idea.needs.filter((n) => n !== 'Feedback').map((n) => NEED_WORDS[n]);
  const main = `Community wants ${intent}${clause ? ` — ${lower(clause)}` : ''}`;
  return `${main}${main.endsWith('…') ? '' : '.'}${needs.length ? ` Looking for ${needs.join(', ')}.` : ''}`;
}

// ---------------------------------------------------------------- signal score
export function signalScore(idea, ctx) {
  const { maxSupports = 430, clusterOf, members } = ctx;
  const author = members.find((m) => m.id === idea.authorId);
  const cluster = clusterOf?.get(idea.id);
  const engagementRaw = idea.supports + idea.commentsCount * 3;
  const engagement = Math.min(100, Math.round((Math.log1p(engagementRaw) / Math.log1p(maxSupports + 70 * 3)) * 100));
  const skilled = idea.volunteers.filter((v) => idea.needs.some((n) => roleMatchesNeed(v.role, n))).length;
  const talent = Math.min(100, Math.round(Math.sqrt(skilled) * 22));
  const demandCount = cluster ? cluster.requests : 1 + (idea.mentions || 0);
  const demand = Math.min(100, Math.round(Math.log1p(demandCount) / Math.log1p(55) * 100));
  const authorScore = author ? contributionScore(author) : 100;
  const reputation = Math.min(100, Math.round((authorScore / 950) * 100));
  const quality = Math.min(100, 35 + Math.min(40, idea.description.length / 4) + idea.needs.length * 8);
  const novelty = cluster && cluster.items[0].idea.id !== idea.id ? 45 : 85;

  const breakdown = [
    { key: 'Engagement', value: engagement, weight: 0.3 },
    { key: 'Skilled volunteers', value: talent, weight: 0.2 },
    { key: 'Community demand', value: demand, weight: 0.2 },
    { key: 'Contributor reputation', value: reputation, weight: 0.15 },
    { key: 'Clarity & scope', value: Math.round(quality), weight: 0.1 },
    { key: 'Novelty', value: novelty, weight: 0.05 },
  ];
  const score = Math.round(breakdown.reduce((s, b) => s + b.value * b.weight, 0));
  const reasons = [];
  if (engagement >= 85) reasons.push('Unusually high community engagement');
  if (skilled >= 5) reasons.push(`${skilled} skilled members volunteered to help`);
  else if (skilled > 0) reasons.push(`${skilled} member${skilled > 1 ? 's' : ''} with matching skills volunteered`);
  if (demandCount >= 10) reasons.push(`Addresses a frequently requested topic (${demandCount} similar requests)`);
  if (reputation >= 60 && author) reasons.push(`${author.name.split(' ')[0]} has strong previous contributions (score ${authorScore})`);
  if (quality >= 80) reasons.push('Clear scope with defined needs');
  if (!reasons.length) reasons.push('Early idea — needs more community validation');
  const label = score >= 85 ? 'High potential' : score >= 72 ? 'Promising' : score >= 55 ? 'Emerging' : 'Early';
  return { score, label, breakdown, reasons, skilled };
}

export function roleMatchesNeed(role, need) {
  return ({ Developer: ['Developer'], Designer: ['Designer'], Marketing: ['Marketer'], 'Video Editor': ['Video Editor'], Writer: ['Writer'], Funding: ['Investor', 'Founder'], Feedback: ['Student', 'Founder', 'Developer', 'Designer', 'Marketer', 'Writer', 'Video Editor', 'Investor', 'Other'] }[need] || []).includes(role);
}

// Compute all intelligence for a state snapshot (memoize in the caller).
export function analyze(state) {
  const ideas = state.ideas;
  const clusters = clusterIdeas(ideas.filter((i) => i.status !== 'project' && i.status !== 'archived'));
  const clusterOf = new Map();
  clusters.forEach((c) => c.ideaIds.forEach((id) => clusterOf.set(id, c)));
  const maxSupports = Math.max(1, ...ideas.map((i) => i.supports));
  const scored = new Map();
  ideas.forEach((i) => scored.set(i.id, signalScore(i, { maxSupports, clusterOf, members: state.members })));
  const opps = state.opportunities.map((o) => ({ ...o, ai: classifyOpportunity(o) }));
  const ranked = [...ideas].filter((i) => i.status !== 'archived').sort((a, b) => scored.get(b.id).score - scored.get(a.id).score);
  return { clusters, clusterOf, scored, opps, ranked };
}

// ---------------------------------------------------------------- trends & brief
// Topic trends computed from real ideas: each tag's idea count this week vs last week,
// with a 6-week sparkline. Ideas need `daysAgo` (derived from createdAt on the client).
export function trends(ideas = []) {
  const byTopic = new Map();
  ideas.forEach((i) => {
    const age = i.daysAgo ?? 0;
    const week = Math.floor(age / 7);
    if (week > 5) return;
    (i.tags || []).forEach((tag) => {
      const t = byTopic.get(tag) || { topic: tag, weeks: [0, 0, 0, 0, 0, 0] };
      t.weeks[week] += 1;
      byTopic.set(tag, t);
    });
  });
  return [...byTopic.values()]
    .map((t) => {
      const thisWeek = t.weeks[0], lastWeek = t.weeks[1];
      return { topic: t.topic, thisWeek, lastWeek, change: Math.round(((thisWeek - lastWeek) / Math.max(1, lastWeek)) * 100), spark: [...t.weeks].reverse() };
    })
    .filter((t) => t.thisWeek > 0)
    .sort((a, b) => b.change - a.change || b.thisWeek - a.thisWeek);
}

// No message inbox is connected yet, so there are no real questions or complaints to rank.
export function risingQuestions() { return []; }
export function risingComplaints() { return []; }

export function buildBrief(state, intel) {
  const t = trends(state.ideas);
  const topIdeas = intel.ranked.filter((i) => i.status === 'open').slice(0, 3);
  const people = [...state.members].sort((a, b) => contributionScore(b) * (1 + b.growth / 200) - contributionScore(a) * (1 + a.growth / 200)).slice(0, 3);
  const realOpps = intel.opps.filter((o) => !o.ai.isSpam);
  const byCat = {};
  realOpps.forEach((o) => (byCat[o.ai.category] = (byCat[o.ai.category] || 0) + 1));
  const topCluster = intel.clusters[0];
  const complaint = risingComplaints()[0];
  const gem = hiddenGems(state.members)[0];
  const highOpp = [...realOpps].sort((a, b) => b.ai.priority - a.ai.priority)[0];
  const helpWanted = [...topIdeas].sort((a, b) => b.volunteers.length - a.volunteers.length)[0];
  const things = [
    t[0] && { icon: '🔥', title: `${t[0].topic}: ${t[0].thisWeek} new idea${t[0].thisWeek === 1 ? '' : 's'} this week`, detail: `${t[0].lastWeek} last week${t[0].lastWeek ? ` (${t[0].change >= 0 ? '+' : ''}${t[0].change}%)` : ''}.`, action: { label: 'See trend', to: 'brief' } },
    topCluster && { icon: '🧩', title: `${topCluster.requests} members are asking for "${topCluster.label}"`, detail: topCluster.summary, action: { label: 'View cluster', to: 'ideas' } },
    topIdeas[0] && { icon: '💡', title: `"${topIdeas[0].title}" scores ${intel.scored.get(topIdeas[0].id).score}/100`, detail: intel.scored.get(topIdeas[0].id).reasons.slice(0, 2).join(' • '), action: { label: 'Open idea', idea: topIdeas[0].id } },
    helpWanted && helpWanted.volunteers.length > 0 && helpWanted.id !== topIdeas[0]?.id && { icon: '🤝', title: `${helpWanted.volunteers.length} member${helpWanted.volunteers.length === 1 ? '' : 's'} offered to help on "${helpWanted.title}"`, detail: `${helpWanted.supports} supporter${helpWanted.supports === 1 ? '' : 's'} so far.`, action: { label: 'Open idea', idea: helpWanted.id } },
    highOpp && { icon: '💼', title: `${highOpp.ai.category}: ${highOpp.from.org || highOpp.from.name}`, detail: `${highOpp.subject} — priority ${highOpp.ai.priority}/100.`, action: { label: 'Open inbox', to: 'opportunities' } },
    gem && { icon: '🌟', title: `Hidden gem: ${gem.member.name} (${gem.member.role})`, detail: gem.reason, action: { label: 'View profile', member: gem.member.id } },
    complaint && { icon: '⚠️', title: `Rising feedback: "${complaint.text}"`, detail: `${complaint.count} similar messages, up ${complaint.change}% week over week.`, action: { label: 'Ask AI', ask: 'What complaints are increasing?' } },
  ].filter(Boolean).slice(0, 7);
  return {
    // Real activity: ideas, comments, supports and volunteer offers recorded in the community.
    analyzed: state.ideas.reduce((n, i) => n + 1 + (i.commentsCount || 0) + (i.supports || 0) + i.volunteers.length, 0),
    trends: t.slice(0, 3),
    topIdeas, people,
    oppCounts: byCat,
    oppTotal: realOpps.length,
    things,
  };
}

// ---------------------------------------------------------------- people search
const SKILL_ALIASES = {
  react: 'React', 'react.js': 'React', reactjs: 'React', next: 'Next.js', 'next.js': 'Next.js', nextjs: 'Next.js', node: 'Node.js', 'node.js': 'Node.js', nodejs: 'Node.js',
  python: 'Python', typescript: 'TypeScript', ts: 'TypeScript', llm: 'LLMs', llms: 'LLMs', postgres: 'PostgreSQL', postgresql: 'PostgreSQL', flutter: 'Flutter',
  figma: 'Figma', ui: 'UI Design', ux: 'UX Research', branding: 'Branding', brand: 'Branding', illustration: 'Illustration', motion: 'Motion Design', '3d': '3D',
  premiere: 'Premiere Pro', 'after': 'After Effects', davinci: 'DaVinci Resolve', shorts: 'Shorts', storytelling: 'Storytelling',
  copywriting: 'Copywriting', copywriter: 'Copywriting', scriptwriting: 'Scriptwriting', newsletter: 'Newsletters', newsletters: 'Newsletters', seo: 'SEO',
  growth: 'Growth', ads: 'Paid Ads', analytics: 'Analytics', fundraising: 'Fundraising', sales: 'Sales', product: 'Product', angel: 'Angel Investing',
};
const ROLE_ALIASES = {
  developer: 'Developer', developers: 'Developer', dev: 'Developer', devs: 'Developer', engineer: 'Developer', engineers: 'Developer', programmer: 'Developer', programmers: 'Developer', coder: 'Developer', coders: 'Developer',
  designer: 'Designer', designers: 'Designer', founder: 'Founder', founders: 'Founder', 'video editor': 'Video Editor', editor: 'Video Editor', editors: 'Video Editor',
  writer: 'Writer', writers: 'Writer', investor: 'Investor', investors: 'Investor', angels: 'Investor', student: 'Student', students: 'Student', marketer: 'Marketer', marketers: 'Marketer',
};
const INTEREST_ALIASES = { ai: 'AI', automation: 'Automation', startups: 'Startups', startup: 'Startups', marketing: 'Marketing', design: 'Design', fitness: 'Fitness', finance: 'Finance', content: 'Content Creation', productivity: 'Productivity' };

export function parsePeopleQuery(q) {
  const lower = q.toLowerCase();
  const words = lower.split(/[^a-z0-9.+]+/).filter(Boolean);
  const roles = new Set(), skills = new Set(), interests = new Set();
  if (lower.includes('video editor')) roles.add('Video Editor');
  words.forEach((w) => {
    if (ROLE_ALIASES[w]) roles.add(ROLE_ALIASES[w]);
    if (SKILL_ALIASES[w]) skills.add(SKILL_ALIASES[w]);
  });
  // "interested in X" / "into X" / trailing interest words
  const intMatch = lower.match(/interested in ([a-z ,&]+)|into ([a-z ,&]+)|passionate about ([a-z ,&]+)/);
  const intText = intMatch ? (intMatch[1] || intMatch[2] || intMatch[3]) : '';
  (intText || lower).split(/[^a-z]+/).forEach((w) => { if (INTEREST_ALIASES[w] && !(w === 'design' && roles.has('Designer') && !intText)) interests.add(INTEREST_ALIASES[w]); });
  if (skills.has('Branding') && !roles.size) roles.add('Designer');
  const days = (lower.match(/last (\d+) days/) || [])[1] ? Number(lower.match(/last (\d+) days/)[1]) : /this week|past week|last week/.test(lower) ? 7 : /this month|last month|past month/.test(lower) ? 30 : null;
  const contributed = /contribut|useful|helpful|active|ideas/.test(lower);
  const fresh = /new member|joined recently|newcomer|hidden|rising|underrated/.test(lower);
  const city = ['bengaluru', 'bangalore', 'mumbai', 'delhi', 'pune', 'hyderabad', 'chennai', 'kolkata', 'jaipur', 'london', 'dubai', 'singapore', 'toronto'].find((c) => lower.includes(c));
  return { roles: [...roles], skills: [...skills], interests: [...interests], days, contributed, fresh, city: city === 'bangalore' ? 'bengaluru' : city };
}

export function searchPeople(q, members) {
  const p = parsePeopleQuery(q);
  const hasCriteria = p.roles.length || p.skills.length || p.interests.length || p.city || p.fresh;
  if (!hasCriteria) {
    // Free-text fallback: name / bio / skill substring match.
    const t = q.toLowerCase().trim();
    const hits = members.filter((m) => t && `${m.name} ${m.bio} ${m.skills.join(' ')} ${m.role}`.toLowerCase().includes(t));
    return { parsed: p, results: hits.map((m) => ({ member: m, score: contributionScore(m), why: ['Text match'] })).sort((a, b) => b.score - a.score) };
  }
  const results = [];
  members.forEach((m) => {
    const why = [];
    if (p.roles.length) { if (!p.roles.includes(m.role)) return; why.push(m.role); }
    if (p.skills.length) {
      const hit = p.skills.filter((s) => m.skills.includes(s));
      if (!hit.length) return;
      why.push(...hit);
    }
    if (p.interests.length) {
      const hit = p.interests.filter((i) => m.interests.includes(i));
      if (!hit.length) return;
      why.push(...hit.map((h) => `Interested in ${h}`));
    }
    if (p.city) { if (m.city.toLowerCase() !== p.city) return; why.push(m.city); }
    if (p.contributed) {
      const active = (m.stats.ideas + m.stats.helpful) > 0 && (p.days ? (m.lastActiveDaysAgo ?? 99) <= p.days : true);
      if (!active) return;
      why.push(`${m.stats.ideas} ideas • ${m.stats.helpful} helpful answers${p.days ? ` (active in last ${p.days}d)` : ''}`);
    } else if (p.days && (m.lastActiveDaysAgo ?? 99) > p.days) return;
    if (p.fresh) { if (!(m.joinedDaysAgo <= 60 || m.growth >= 100)) return; why.push(m.joinedDaysAgo <= 60 ? `Joined ${m.joinedDaysAgo}d ago` : `+${m.growth}% this month`); }
    results.push({ member: m, score: contributionScore(m), why });
  });
  results.sort((a, b) => b.score - a.score);
  return { parsed: p, results };
}

export function recommendTeam(idea, members) {
  const picks = [];
  const used = new Set();
  idea.needs.filter((n) => n !== 'Feedback').forEach((need) => {
    const fromVolunteers = idea.volunteers
      .map((v) => members.find((m) => m.id === v.memberId))
      .filter((m) => m && roleMatchesNeed(m.role, need) && !used.has(m.id))
      .sort((a, b) => contributionScore(b) - contributionScore(a));
    const pool = fromVolunteers.length ? fromVolunteers : members.filter((m) => roleMatchesNeed(m.role, need) && !used.has(m.id)).sort((a, b) => contributionScore(b) - contributionScore(a));
    const count = need === 'Developer' ? 3 : need === 'Designer' ? 2 : 1;
    pool.slice(0, count).forEach((m) => {
      used.add(m.id);
      picks.push({ member: m, role: m.role, volunteered: fromVolunteers.includes(m), score: contributionScore(m) });
    });
  });
  return picks;
}

// ---------------------------------------------------------------- promote
export function generatePromo(idea, ctx, variant = 0, tone = 'Excited') {
  const author = ctx.members.find((m) => m.id === idea.authorId);
  const authorFirst = author ? author.name.split(' ')[0] : 'Someone';
  const supporters = idea.supports.toLocaleString('en-US');
  const helpers = idea.volunteers.length;
  const hook = {
    Excited: ['We’re doing it. 🚀', 'You asked. We’re building it. 🔥', 'This one came from YOU. 💡'],
    Professional: ['Announcing a new community initiative.', 'A community idea, now an official project.', 'From community proposal to project.'],
    Casual: ['ok so… we’re actually doing this 😄', 'you all voted, so here we go 👀', 'community idea → real thing. let’s go'],
  }[tone][variant % 3];
  const tag = idea.tags[0].replace(/\s+/g, '');
  return {
    Instagram: `${hook}\n\nSomeone in our community — ${authorFirst} — suggested “${idea.title}”. ${supporters} of you supported it and ${helpers} offered to help build it, so it’s officially happening.\n\n${idea.description}\n\n👉 Join the community (link in bio) to take part.\n\n#${tag} #BuildInPublic #Community #${CREATOR.firstName}Builds`,
    X: trimTo(`${hook} ${authorFirst} from our community proposed “${idea.title}”. ${supporters} supported it, ${helpers} volunteered. We’re building it together — join in 👇 #${tag}`, 280),
    LinkedIn: `${tone === 'Casual' ? hook : 'The best ideas are already inside your audience.'}\n\nThis week a member of my community, ${author?.name || 'a member'}, proposed “${idea.title}”.\n\nThe response: ${supporters} supporters and ${helpers} people with relevant skills offering to help — developers, designers and marketers.\n\nSo we’re turning it into an official community project. ${idea.description}\n\nIf you want to contribute, the community is open. Building with your audience beats building for them.`,
    Announcement: `📣 Featured by ${CREATOR.firstName}\n\n“${idea.title}” — proposed by ${author?.name || 'a member'} — is now an official community project.\n\n✅ ${supporters} supporters\n🤝 ${helpers} members offered to help\n\nWhat’s next: we’re forming the core team this week. Tap “I can help” on the idea to join, and share it with someone who should be part of it.`,
  };
}
function trimTo(s, n) { return s.length <= n ? s : s.slice(0, n - 1) + '…'; }

// ---------------------------------------------------------------- copilot
export const COPILOT_SUGGESTIONS = [
  'What does my audience want me to make next?',
  'What topics are trending?',
  'Find React developers interested in AI',
  'Which ideas have the highest potential?',
  'Summarize this week',
  'Find collaboration opportunities',
  'Who are my top contributors?',
  'What are people asking repeatedly?',
  'Find designers who contributed in the last 30 days',
];

export function askCopilot(question, state, intel) {
  const q = question.toLowerCase();
  const brief = () => buildBrief(state, intel);
  if (/complain|negative|unhappy|frustrat|issue|problem/.test(q)) {
    return { text: 'No messages inbox is connected yet, so there is no complaint data to analyze. Comments on ideas are the best signal for now.', blocks: [] };
  }
  if (/asking|repeated|frequent|faq|questions/.test(q)) {
    const c = intel.clusters.filter((x) => x.requests > 1).slice(0, 3);
    if (!c.length) return { text: 'Nothing has been requested more than once yet. Repeated requests show up here as members share ideas.', blocks: [] };
    return { text: `“${c[0].label}” was requested ${c[0].requests} times — the most repeated request in your community.`, blocks: [{ type: 'clusters', items: c }] };
  }
  if (/top contributor|leaderboard|most active|best members|top members/.test(q)) {
    const top = [...state.members].sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 6);
    if (!top.length) return { text: 'No members have joined yet. Share your invite link so followers can sign up.', blocks: [] };
    return { text: `Your top contributors, ranked by contribution score (ideas, help and projects — not follower count).`, blocks: [{ type: 'people', items: top.map((m) => ({ member: m, score: contributionScore(m), why: [m.role] })) }], cta: { label: 'Open People', to: 'people' } };
  }
  if (/find|search|who|show me/.test(q) && /(developer|designer|founder|editor|writer|investor|student|marketer|engineer|dev|react|python|figma|people|member)/.test(q)) {
    const { results, parsed } = searchPeople(question, state.members);
    const crit = [...parsed.roles, ...parsed.skills, ...parsed.interests.map((i) => `interested in ${i}`)].join(', ');
    return { text: `Found ${results.length} matching members${crit ? ` (${crit})` : ''}, ranked by contribution score — not follower count.`, blocks: [{ type: 'people', items: results.slice(0, 6) }], cta: { label: `Open all ${results.length} in People`, to: 'people', query: question } };
  }
  if (/opportunit|collab|partner|sponsor|brand|deal|inbox/.test(q)) {
    const items = intel.opps.filter((o) => !o.ai.isSpam).sort((a, b) => b.ai.priority - a.ai.priority);
    if (!items.length) return { text: 'There are no opportunities in your inbox yet.', blocks: [], cta: { label: 'Open Opportunities inbox', to: 'opportunities' } };
    return { text: `${items.length} real opportunities after filtering ${intel.opps.length - items.length} spam messages. Top priority: ${items[0].from.org || items[0].from.name} — ${items[0].ai.category.toLowerCase()} (${items[0].ai.priority}/100).`, blocks: [{ type: 'opps', items: items.slice(0, 4) }], cta: { label: 'Open Opportunities inbox', to: 'opportunities' } };
  }
  if (/trend|rising|growing|hot|momentum/.test(q)) {
    const t = trends(state.ideas);
    if (!t.length) return { text: 'No topics are trending yet — trends appear once members share ideas this week.', blocks: [] };
    return { text: `“${t[0].topic}” is the most active topic this week (${t[0].thisWeek} new idea${t[0].thisWeek === 1 ? '' : 's'}).`, blocks: [{ type: 'trends', items: t.slice(0, 5) }] };
  }
  if (/potential|best idea|top idea|highest|rank|priorit/.test(q)) {
    const top = intel.ranked.filter((i) => i.status !== 'project').slice(0, 4);
    if (!top.length) return { text: 'There are no ideas to rank yet.', blocks: [] };
    return { text: `Highest-potential ideas by Signal Score. “${top[0].title}” leads with ${intel.scored.get(top[0].id).score}/100 — ${intel.scored.get(top[0].id).reasons[0].toLowerCase()}.`, blocks: [{ type: 'ideas', items: top }] };
  }
  if (/summar|brief|this week|recap|overview|happen/.test(q)) {
    const b = brief();
    return { text: `I analyzed ${b.analyzed.toLocaleString('en-US')} activities. Here are the ${b.things.length} things you actually need to know:`, blocks: [{ type: 'things', items: b.things }] };
  }
  if (/want|make next|create next|content|video|what should|build next|demand/.test(q)) {
    const c = intel.clusters.slice(0, 3);
    if (!c.length) return { text: 'Your audience has not shared any ideas yet. Share your invite link to start collecting them.', blocks: [] };
    return { text: `Your audience is clearly asking for “${c[0].label}” — ${c[0].requests} separate requests merged into one signal. ${c[0].summary}`, blocks: [{ type: 'clusters', items: c }] };
  }
  const { results } = searchPeople(question, state.members);
  if (results.length) return { text: `I found ${results.length} members matching “${question}”.`, blocks: [{ type: 'people', items: results.slice(0, 6) }] };
  const similar = findSimilar(question, [], state.ideas, 4);
  if (similar.length) return { text: `Here are the community ideas most related to “${question}”.`, blocks: [{ type: 'ideas', items: similar.map((s) => s.idea) }] };
  return { text: 'I can answer questions about trends, ideas, people, opportunities and feedback in your community. Try one of the suggestions below.', blocks: [] };
}

// ---------------------------------------------------------------- action brief
// One decision-ready summary per idea, assembled from real community data:
// the problem, the evidence, who can help, what is still missing and the next practical step.
const firstSentence = (t = '') => (t.match(/^.*?[.!?](\s|$)/)?.[0] || t).trim();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function actionBrief(idea, state, intel) {
  const stage = ideaStage(idea, state.projects);
  const sig = intel.scored.get(idea.id);
  const cluster = intel.clusterOf.get(idea.id);
  const project = state.projects.find((p) => p.id === idea.projectId || p.ideaId === idea.id);
  const helpers = idea.volunteers
    .map((v) => ({ member: state.members.find((m) => m.id === v.memberId), note: v.note }))
    .filter((h) => h.member)
    .sort((a, b) => contributionScore(b.member) - contributionScore(a.member));
  const needs = idea.needs.filter((n) => n !== 'Feedback');
  const author = state.members.find((m) => m.id === idea.authorId);
  // A need is covered if a volunteer or the author themselves has the matching role.
  const missingNeeds = needs.filter((n) => !(author && roleMatchesNeed(author.role, n)) && !helpers.some((h) => roleMatchesNeed(h.member.role, n)));
  const taken = new Set([idea.authorId, ...helpers.map((h) => h.member.id)]);
  // People matching: members whose declared role fits a missing need, best contributors first.
  const candidates = missingNeeds.flatMap((need) => state.members
    .filter((m) => !taken.has(m.id) && roleMatchesNeed(m.role, need))
    .sort((a, b) => contributionScore(b) - contributionScore(a))
    .slice(0, 2)
    .map((m) => { taken.add(m.id); return { member: m, need }; }));

  const evidence = [
    plural(idea.supports, 'supporter'),
    plural(idea.commentsCount || 0, 'comment'),
    helpers.length ? `${plural(helpers.length, 'member')} offered to help` : null,
    cluster && cluster.requests > 1 ? `${cluster.requests} similar requests across ${plural(cluster.items.length, 'idea')}` : null,
    sig ? `Signal Score ${sig.score}/100 (${sig.label})` : null,
  ].filter(Boolean);

  const quotes = (idea.comments || []).filter((c) => c.memberId !== 'creator').slice(-2)
    .map((c) => ({ text: c.text, by: state.members.find((m) => m.id === c.memberId)?.name || 'A member' }));

  const missing = [
    ...missingNeeds.map((n) => `No ${n.toLowerCase()} has offered to help yet`),
    !(idea.commentsCount > 0) ? 'No discussion yet — feedback will sharpen the idea' : null,
    stage === 'in_progress' && project && !project.ownerId ? 'No owner assigned to the project' : null,
  ].filter(Boolean);

  const openTasks = project ? project.tasks.filter((t) => !t.done).length : 0;
  let next;
  if (stage === 'archived') next = { text: 'Archived. Restore it if it becomes relevant again.', action: 'restore' };
  else if (stage === 'submitted') next = { text: 'Collect feedback: share it with the community and ask people to comment.', action: 'promote' };
  else if (stage === 'discussing' && missingNeeds.length) next = { text: `Find a ${missingNeeds[0].toLowerCase()}${candidates[0] ? ` — ${candidates[0].member.name} matches` : ''}, then decide.`, action: candidates[0] ? 'invite' : 'select', member: candidates[0]?.member.id };
  else if (stage === 'discussing') next = { text: 'The team is in place. Select it for a pilot.', action: 'select' };
  else if (stage === 'selected') next = { text: 'Create the workspace: pick an owner, contributors and first tasks.', action: 'workspace' };
  else if (stage === 'in_progress') next = openTasks ? { text: `${plural(openTasks, 'task')} open. Check in with the team and post an update.`, action: 'open-project' } : { text: 'All tasks are done. Mark the project complete.', action: 'open-project' };
  else next = { text: 'Completed. Feature it and share the result with your audience.', action: 'promote' };

  return {
    stage,
    problem: firstSentence(idea.description),
    evidence, quotes,
    helpers: helpers.slice(0, 4),
    missing, candidates,
    next,
  };
}

// ---------------------------------------------------------------- utils
export function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(n);
}
export function ago(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
export function hoursAgo(h) { return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; }
