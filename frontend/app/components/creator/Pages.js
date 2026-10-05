'use client';

import { useMemo, useState } from 'react';
import {
  Newspaper, Flame, Lightbulb, Users, Briefcase, Search, Sparkles, Layers, Star, Rocket, ShieldAlert, Check, Archive, Send, ChevronDown, Plus, ArrowLeft,
  Gem, Trophy, Megaphone, MessageCircleQuestion, AlertTriangle, BadgeCheck, Mail, FolderKanban, ArrowRight,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { buildBrief, contributionScore, draftReply, hiddenGems, searchPeople, fmt, hoursAgo, ago } from '../../lib/ai';
import { CREATOR, ROLES } from '../../lib/seed';
import { Avatar, AvatarStack, Bar, Button, Chip, Empty, SectionTitle, Sparkline, cx } from '../ui';
import { ClusterCard, IdeaCard, PersonCard, PersonRow, StageTrack, memberName, useOpen } from '../shared';
import { ideaStage, STAGE_LABEL, STAGES } from '../../lib/reducer';
import CommunityPage from '../CommunityPage';
import { Grad, PageHeader as SharedPageHeader } from '../chrome';

// Highlights the closing words of a string title with the animated gradient
// ("Ideas from your audience" → "your audience"), matching the landing page.
function accentTitle(title) {
  if (typeof title !== 'string') return title;
  const words = title.split(' ');
  const n = words.length >= 3 ? 2 : 1;
  const head = words.slice(0, -n).join(' ');
  return <>{head && `${head} `}<Grad>{words.slice(-n).join(' ')}</Grad></>;
}

function PageHeader({ eyebrow, title, sub, action, icon }) {
  return <SharedPageHeader eyebrow={eyebrow} icon={icon} title={accentTitle(title)} description={sub} actions={action} />;
}

// ================================================================== Brief
export function BriefPage({ go, ask }) {
  const { state, intel } = useStore();
  const open = useOpen();
  const brief = useMemo(() => buildBrief(state, intel), [state, intel]);
  // Real signals only: repeated requests come from idea clusters, activity from the event log.
  const requested = intel.clusters.filter((c) => c.requests > 1).slice(0, 4);
  const recent = state.activity.slice(0, 5);
  const none = (text) => <p className="py-6 text-center text-sm text-muted">{text}</p>;
  const runAction = (a) => {
    if (!a) return;
    if (a.idea) open.idea(a.idea);
    else if (a.member) open.member(a.member);
    else if (a.ask) ask(a.ask);
    else if (a.to) go(a.to);
  };
  return (
    <div>
      <PageHeader icon={Newspaper} eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} title="Your Community Brief"
        sub={`${brief.analyzed.toLocaleString('en-US')} activities analyzed across ${state.communities.length} communities. Here’s what actually matters.`} />

      <section className="card ai-glow mb-6 p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-1.5 font-display text-lg font-semibold text-ink"><Sparkles className="h-4 w-4 text-accent" aria-hidden="true" /> {brief.things.length} things you actually need to know</p>
        <ol className="grid gap-3 md:grid-cols-2">
          {!brief.things.length && <li className="md:col-span-2">{none('Nothing needs your attention yet. Insights appear as members share ideas.')}</li>}
          {brief.things.map((t, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-white/80 p-4">
              <span className="font-display text-sm font-semibold text-muted">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink"><span aria-hidden="true">{t.icon} </span>{t.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{t.detail}</p>
                {t.action && <button onClick={() => runAction(t.action)} className="mt-2 text-xs font-semibold text-accent hover:underline">{t.action.label} →</button>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <section className="card p-5">
          <SectionTitle eyebrow="Trending" icon={Flame} title="Topics" />
          {!brief.trends.length && none('No topics this week yet.')}
          {brief.trends.map((t) => (
            <div key={t.topic} className="flex items-center justify-between border-b border-line-2 py-3 last:border-0">
              <div><p className="text-sm font-medium text-ink">{t.topic}</p><Sparkline data={t.spark} width={90} height={22} /></div>
              <p className="text-right"><span className="block font-display text-lg font-semibold text-ink">{t.thisWeek}</span><span className="text-[11px] text-muted">this week</span></p>
            </div>
          ))}
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="Top ideas" icon={Lightbulb} title="By Signal Score" />
          <ol className="space-y-2">
            {!brief.topIdeas.length && none('No open ideas yet.')}
            {brief.topIdeas.map((i, k) => (
              <li key={i.id}><button onClick={() => open.idea(i.id)} className="flex w-full gap-3 rounded-xl p-2 text-left hover:bg-paper">
                <span className="font-display font-semibold text-muted">{k + 1}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{i.title}</span><span className="text-xs text-muted">Score {intel.scored.get(i.id).score} • ❤️ {i.supports}</span></span>
              </button></li>
            ))}
          </ol>
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="People to notice" icon={Users} title="Contributors" />
          {!brief.people.length && none('No members have joined yet.')}
          <div className="-mx-2">{brief.people.map((m) => <PersonRow key={m.id} member={m} why={`${m.role}${m.growth > 30 ? ` • +${m.growth}% this month` : ''}`} />)}</div>
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="Potential opportunities" icon={Briefcase} title={`${brief.oppTotal} real, spam removed`} />
          {!brief.oppTotal && none('No opportunities yet.')}
          <ul className="space-y-2">
            {Object.entries(brief.oppCounts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
              <li key={cat}><button onClick={() => go('opportunities', { oppCategory: cat })} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-paper"><span className="text-ink-2">{cat}</span><span className="font-display font-semibold text-ink">{n}</span></button></li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle eyebrow="Asked repeatedly" icon={MessageCircleQuestion} title="Most requested" />
          {!requested.length && none('Nothing has been requested more than once yet.')}
          {requested.map((c) => (
            <button key={c.id} onClick={() => go('ideas', { ideasTab: 'clusters' })} className="flex w-full items-center gap-4 border-b border-line-2 py-3 text-left last:border-0 hover:bg-paper/60">
              <p className="flex-1 text-sm text-ink">{c.label}</p>
              <p className="text-right"><span className="block font-display font-semibold text-ink">{c.requests}×</span><span className="text-[11px] text-muted">requests</span></p>
            </button>
          ))}
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="Latest" icon={AlertTriangle} title="Recent activity" />
          {!recent.length && none('No activity yet.')}
          {recent.map((e) => (
            <div key={e.id} className="flex items-center gap-4 border-b border-line-2 py-3 last:border-0">
              <p className="flex-1 text-sm text-ink">{e.text}</p>
              <span className="shrink-0 text-[11px] text-muted">{e.at ? new Date(e.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ================================================================== Ideas
export function IdeasPage() {
  const { state, dispatch, intel } = useStore();
  const tab = state.ideasTab || 'ranked';
  const community = state.ideasCommunity || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('signal');
  const [stage, setStage] = useState('active'); // 'active' = every stage except archived
  const setTab = (t) => dispatch({ type: 'NAV', patch: { ideasTab: t } });
  const list = useMemo(() => {
    let l = state.ideas.filter((i) => { const st = ideaStage(i, state.projects); return stage === 'active' ? st !== 'archived' : st === stage; });
    if (tab === 'featured') l = l.filter((i) => i.featured);
    if (community !== 'all') l = l.filter((i) => i.communityId === community);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((i) => `${i.title} ${i.description} ${i.tags.join(' ')}`.toLowerCase().includes(t)); }
    const by = { signal: (a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score, support: (a, b) => b.supports - a.supports, new: (a, b) => a.daysAgo - b.daysAgo, help: (a, b) => b.volunteers.length - a.volunteers.length };
    return [...l].sort(by[sort]);
  }, [state.ideas, state.projects, stage, tab, community, q, sort, intel]);
  const clusters = community === 'all' ? intel.clusters : intel.clusters.filter((c) => c.items.some((x) => x.idea.communityId === community));
  const mergedCount = intel.clusters.reduce((s, c) => s + c.items.length, 0);

  return (
    <div>
      <PageHeader icon={Lightbulb} eyebrow="Idea marketplace" title="Ideas from your audience"
        sub={`${state.ideas.filter((i) => (i.daysAgo ?? 0) < 7).length} new ideas this week. AI merged ${mergedCount} overlapping ideas into ${intel.clusters.length} clusters and ranked everything by Signal Score.`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Idea views" className="flex gap-1 rounded-full bg-line-2 p-1">
          {[['ranked', 'Ranked', Sparkles], ['clusters', 'AI Clusters', Layers], ['featured', 'Featured', Star]].map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition', tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <label htmlFor="comm-filter" className="sr-only">Community</label>
        <select id="comm-filter" value={community} onChange={(e) => dispatch({ type: 'NAV', patch: { ideasCommunity: e.target.value } })} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
          <option value="all">All communities</option>
          {state.communities.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        {tab !== 'clusters' && (
          <>
            <label htmlFor="stage-filter" className="sr-only">Stage</label>
            <select id="stage-filter" value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
              <option value="active">All active stages</option>
              {[...STAGES, 'archived'].map((st) => <option key={st} value={st}>{STAGE_LABEL[st]}</option>)}
            </select>
          </>
        )}
        {tab !== 'clusters' && (
          <>
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <label htmlFor="idea-search" className="sr-only">Search ideas</label>
              <input id="idea-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ideas…" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-accent" />
            </div>
            <label htmlFor="idea-sort" className="sr-only">Sort</label>
            <select id="idea-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
              <option value="signal">Sort: Signal Score</option><option value="support">Sort: Most supported</option><option value="help">Sort: Most volunteers</option><option value="new">Sort: Newest</option>
            </select>
          </>
        )}
      </div>
      {tab === 'clusters' ? (
        <div className="grid gap-4 lg:grid-cols-2">{clusters.map((c, i) => <ClusterCard key={c.id} cluster={c} defaultOpen={i === 0} />)}</div>
      ) : list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">{list.map((i) => <IdeaCard key={i.id} idea={i} />)}</div>
      ) : (
        <Empty icon={Star} title={tab === 'featured' ? 'No featured ideas yet' : 'No ideas match'} text={tab === 'featured' ? 'Open any idea and click “Feature idea” to spotlight it to your members.' : 'Try a different search or community.'} />
      )}
    </div>
  );
}

// ================================================================== Opportunities
const CAT_TONE = { 'Brand Partnership': 'accent', 'Business Opportunity': 'sky', 'Speaking Invitation': 'amber', Collaboration: 'mint', 'Community Proposal': 'coral', Hiring: 'default', 'Talent Offer': 'outline' };

export function OpportunitiesPage() {
  const { state, dispatch, intel } = useStore();
  const cat = state.oppCategory || 'All';
  const [showSpam, setShowSpam] = useState(false);
  const [selected, setSelected] = useState(state.openOppId || null);
  const real = intel.opps.filter((o) => !o.ai.isSpam && o.status !== 'archived').sort((a, b) => b.ai.priority - a.ai.priority);
  const spam = intel.opps.filter((o) => o.ai.isSpam);
  const counts = {};
  real.forEach((o) => (counts[o.ai.category] = (counts[o.ai.category] || 0) + 1));
  const list = cat === 'All' ? real : real.filter((o) => o.ai.category === cat);
  const sel = intel.opps.find((o) => o.id === (selected || list[0]?.id));
  const high = real.filter((o) => o.ai.priority >= 50).length;

  return (
    <div>
      <PageHeader icon={Briefcase} eyebrow="Opportunities inbox" title={`${high} high-priority opportunities`}
        sub={`${intel.opps.length.toLocaleString('en-US')} message${intel.opps.length === 1 ? '' : 's'} received. AI classified each one, removed spam and ranked what’s left by priority.`} />
      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-xl">
        {[[intel.opps.length.toLocaleString('en-US'), 'Messages received', 'text-muted'], [real.length, 'Real opportunities', 'text-ink'], [high, 'High priority', 'text-accent']].map(([n, l, c]) => (
          <div key={l} className="card p-3"><p className={cx('font-display text-2xl font-semibold', c)}>{n}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_minmax(0,1fr)_420px]">
        <nav aria-label="Categories" className="space-y-0.5">
          {['All', ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])].map((c) => (
            <button key={c} onClick={() => { dispatch({ type: 'NAV', patch: { oppCategory: c } }); setSelected(null); }} aria-current={cat === c ? 'true' : undefined}
              className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition', cat === c ? 'bg-ink text-white' : 'text-ink-2 hover:bg-line-2')}>
              <span>{c}</span><span className="text-xs opacity-70">{c === 'All' ? real.length : counts[c]}</span>
            </button>
          ))}
          <button onClick={() => setShowSpam((v) => !v)} className="mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted hover:bg-line-2" aria-expanded={showSpam}>
            <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" aria-hidden="true" /> Spam filtered</span><span className="text-xs">{spam.length.toLocaleString('en-US')}</span>
          </button>
        </nav>

        <div className="space-y-2">
          {showSpam && (
            <div className="card animate-fade-up border-dashed p-4">
              <p className="mb-2 text-xs font-semibold text-muted">Automatically quarantined (sample)</p>
              {spam.map((o) => (
                <div key={o.id} className="border-t border-line-2 py-2 text-xs first:border-0">
                  <p className="truncate text-ink-2 line-through decoration-muted/50">{o.message}</p>
                  <p className="mt-0.5 text-coral">{o.ai.reasons.join(' • ')}</p>
                </div>
              ))}
            </div>
          )}
          {list.map((o) => (
            <button key={o.id} onClick={() => setSelected(o.id)} aria-pressed={sel?.id === o.id}
              className={cx('card flex w-full items-start gap-3 p-4 text-left transition hover:border-ink/15', sel?.id === o.id && 'border-accent ring-4 ring-accent/10')}>
              <span className={cx('flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl font-mono text-sm font-bold', o.ai.priority >= 70 ? 'bg-accent text-white' : o.ai.priority >= 50 ? 'bg-accent-soft text-accent' : 'bg-line-2 text-ink-2')}>{o.ai.priority}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5"><Chip tone={CAT_TONE[o.ai.category]}>{o.ai.category}</Chip>{o.status !== 'new' && <Chip tone="mint" icon={Check}>{o.status}</Chip>}</span>
                <span className="mt-1.5 block truncate text-sm font-semibold text-ink">{o.subject}</span>
                <span className="block truncate text-xs text-muted">{o.from.name}{o.from.org ? ` • ${o.from.org}` : ''} • {o.channel} • {hoursAgo(o.hoursAgo)}</span>
              </span>
            </button>
          ))}
        </div>

        {sel && <OppDetail key={sel.id} sel={sel} onArchived={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function OppDetail({ sel, onArchived }) {
  const { dispatch } = useStore();
  const [reply, setReply] = useState(() => draftReply(sel, sel.ai));
  return (
    <aside className="card h-fit p-5 lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1">
      <div className="flex items-center gap-3">
        <Avatar name={sel.from.name} size={42} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-semibold text-ink">{sel.from.name}{sel.from.verified && <BadgeCheck className="h-4 w-4 text-sky" aria-label="Verified" />}</p>
          <p className="truncate text-xs text-muted">{[sel.from.title, sel.from.org].filter(Boolean).join(' • ')} • via {sel.channel}</p>
        </div>
      </div>
      <p className="mt-4 font-display font-semibold text-ink">{sel.subject}</p>
      <p className="mt-2 rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink-2">{sel.message}</p>

      <div className="mt-4 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI classification</p>
        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-ink">{sel.ai.category}</span><span className="text-xs text-muted">{Math.round(sel.ai.confidence * 100)}% confidence</span></div>
        <div className="mt-2"><div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">Priority</span><span className="font-mono">{sel.ai.priority}/100</span></div><Bar value={sel.ai.priority} /></div>
        {sel.ai.signals.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{sel.ai.signals.map((s) => <Chip key={s} tone="outline">{s}</Chip>)}</div>}
      </div>

      {!sel.ai.isSpam && (
        <>
          <label htmlFor="reply" className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> AI-drafted reply</label>
          <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={5} className="mt-1.5 w-full resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-accent" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="accent" size="sm" icon={Send} onClick={() => dispatch({ type: 'OPP_STATUS', oppId: sel.id, status: 'replied', toastText: `Reply sent to ${sel.from.name.split(' ')[0]}` })}>Send reply</Button>
            <Button variant="secondary" size="sm" icon={Check} onClick={() => dispatch({ type: 'OPP_STATUS', oppId: sel.id, status: 'accepted', toastText: 'Marked as accepted' })}>Accept</Button>
            <Button variant="ghost" size="sm" icon={Archive} onClick={() => { dispatch({ type: 'OPP_STATUS', oppId: sel.id, status: 'archived', toastText: 'Archived' }); onArchived(); }}>Archive</Button>
          </div>
        </>
      )}
    </aside>
  );
}

// ================================================================== People
const PEOPLE_EXAMPLES = ['Find me React developers from my audience', 'Find designers who have contributed useful ideas in the last 30 days', 'Find founders interested in AI automation', 'Video editors in Mumbai', 'Hidden talent who joined recently'];

export function PeoplePage() {
  const { state } = useStore();
  // The parent keys this page by peopleQuery, so a new query from the copilot remounts it.
  const [q, setQ] = useState(state.peopleQuery || '');
  const [query, setQuery] = useState(state.peopleQuery || '');
  const [role, setRole] = useState('All');
  const res = useMemo(() => (query ? searchPeople(query, state.members) : null), [query, state.members]);
  const gems = hiddenGems(state.members);
  const leaderboard = useMemo(() => [...state.members].filter((m) => role === 'All' || m.role === role).sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 12), [state.members, role]);
  const p = res?.parsed;
  const criteria = p ? [...p.roles, ...p.skills, ...p.interests.map((i) => `Interest: ${i}`), p.city && `City: ${p.city}`, p.days && `Last ${p.days} days`, p.contributed && 'Has contributed', p.fresh && 'New / rising'].filter(Boolean) : [];

  return (
    <div>
      <PageHeader icon={Users} eyebrow="People discovery" title="Search your audience like a database" sub="Every member is more than a username — skills, interests, goals and contributions are all searchable in plain English." />
      <form className="card ai-glow p-4 sm:p-5" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" aria-hidden="true" />
            <label htmlFor="people-q" className="sr-only">Describe who you’re looking for</label>
            <input id="people-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Find designers who contributed useful ideas in the last 30 days…" className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-4 text-[15px] shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
          </div>
          <Button type="submit" variant="primary" size="lg" icon={Search}>Search</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PEOPLE_EXAMPLES.map((ex) => <button type="button" key={ex} onClick={() => { setQ(ex); setQuery(ex); }} className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-ink-2 transition hover:border-accent/40 hover:text-ink">{ex}</button>)}
        </div>
      </form>

      {res ? (
        <section className="mt-6 animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="font-display text-xl font-semibold text-ink">{res.results.length} matching members</p>
            {criteria.map((c) => <Chip key={c} tone="accent">{c}</Chip>)}
            <button onClick={() => { setQuery(''); setQ(''); }} className="ml-auto text-sm text-muted hover:text-ink">Clear</button>
          </div>
          {res.results.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {res.results.slice(0, 30).map((r) => <PersonCard key={r.member.id} member={r.member} why={r.why} action={<InviteBtn member={r.member} />} />)}
            </div>
          ) : <Empty icon={Search} title="No members match" text="Try fewer filters, e.g. just a role or a skill." />}
        </section>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-5">
            <SectionTitle eyebrow="AI-discovered" icon={Gem} title="Hidden gems" />
            <div className="space-y-3">
              {gems.map((g) => (
                <div key={g.member.id} className="card p-4">
                  <div className="flex gap-3">
                    <Avatar name={g.member.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{g.member.name}</p>
                      <p className="text-xs text-muted">{g.member.role} • {g.member.skills.slice(0, 2).join(', ')}</p>
                      <p className="mt-2 text-sm text-ink-2">{g.reason}</p>
                      <p className="mt-1 text-xs text-accent">AI identified as a rising contributor — only {fmt(g.member.socialFollowers)} followers.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end"><InviteBtn member={g.member} /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="xl:col-span-7">
            <SectionTitle eyebrow="Value over popularity" icon={Trophy} title="Contribution leaderboard" />
            <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
              {['All', ...ROLES.filter((r) => r !== 'Other')].map((r) => (
                <button key={r} onClick={() => setRole(r)} aria-pressed={role === r} className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-medium transition', role === r ? 'bg-ink text-white' : 'bg-white text-ink-2 border border-line hover:border-ink/20')}>{r}</button>
              ))}
            </div>
            <div className="card divide-y divide-line-2 overflow-hidden">
              {leaderboard.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2 px-3">
                  <span className={cx('w-6 text-center font-display text-sm font-semibold', i < 3 ? 'text-accent' : 'text-muted')}>{i + 1}</span>
                  <div className="flex-1"><PersonRow member={m} why={`${m.role} • ${m.stats.ideas} ideas • ${m.stats.helpful} helpful • ${fmt(m.socialFollowers)} followers`} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InviteBtn({ member }) {
  const { state } = useStore();
  const open = useOpen();
  const sent = state.invites.some((i) => i.memberId === member.id);
  return (
    <button onClick={(e) => { e.stopPropagation(); open.invite(member.id); }}
      className={cx('rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:bg-accent-soft', sent ? 'text-mint' : 'text-accent')}>
      {sent ? '✓ Invited' : 'Invite to collaborate'}
    </button>
  );
}

// ================================================================== Communities
export function CommunitiesPage({ go }) {
  const { state, dispatch, intel } = useStore();
  if (state.communityId) return <CommunityPage communityId={state.communityId} mode="creator" onBack={() => dispatch({ type: 'NAV', patch: { communityId: null } })} />;
  return (
    <div>
      <PageHeader icon={Users} eyebrow="Organized communities" title="Communities" sub="Members join multiple interest-based communities. Each one revolves around structured contributions — ideas, help and projects — not endless chat."
        action={<Button variant="primary" icon={Plus} onClick={() => dispatch({ type: 'NAV', patch: { modal: { type: 'community' } } })}>Create community</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {state.communities.map((c) => {
          const ideas = state.ideas.filter((i) => i.communityId === c.id);
          const top = [...ideas].sort((a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score)[0];
          const contributors = [...state.members].filter((m) => m.communities.includes(c.id)).sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 5);
          return (
            <article key={c.id} onClick={() => dispatch({ type: 'NAV', patch: { communityId: c.id, communityTab: 'feed' } })} className="card card-hover flex cursor-pointer flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-2xl" aria-hidden="true">{c.emoji}</span>
                {c.growth !== 0 && <Chip tone={c.growth > 0 ? 'mint' : 'coral'}>{c.growth > 0 ? '↑' : '↓'}{Math.abs(c.growth)}% this month</Chip>}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{c.name}</h3>
              <p className="text-sm text-muted">{c.members.toLocaleString('en-US')} members</p>
              <p className="mt-2 flex-1 text-sm text-ink-2">{c.description}</p>
              {top && <p className="mt-3 truncate rounded-xl bg-paper px-3 py-2 text-xs text-ink-2"><span className="font-semibold text-ink">Top idea:</span> {top.title}</p>}
              <div className="mt-4 flex items-center justify-between">
                <AvatarStack names={contributors.map((m) => m.name)} size={24} max={4} extra={Math.max(0, c.members - 4)} />
                <button onClick={(e) => { e.stopPropagation(); go('ideas', { ideasCommunity: c.id, ideasTab: 'ranked' }); }} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">{ideas.length} ideas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================== Projects
export function ProjectsPage() {
  const { state, dispatch } = useStore();
  const openId = state.openProjectId;
  const project = state.projects.find((p) => p.id === openId);
  if (project) return <ProjectDetail project={project} onBack={() => dispatch({ type: 'NAV', patch: { openProjectId: null } })} />;
  return (
    <div>
      <PageHeader icon={FolderKanban} eyebrow="Idea → action" title="Community projects" sub="Ideas with traction become small, focused projects with real contributors from your audience." />
      {state.projects.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.projects.map((p) => {
            const done = p.tasks.filter((t) => t.done).length;
            const pct = Math.round((done / Math.max(1, p.tasks.length)) * 100);
            return (
              <button key={p.id} onClick={() => dispatch({ type: 'NAV', patch: { openProjectId: p.id } })} className="card card-hover p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div><Chip tone={p.createdDaysAgo === 0 ? 'accent' : 'mint'}>{p.status}</Chip><h3 className="mt-2 font-display text-lg font-semibold text-ink">{p.name}</h3></div>
                  <span className="font-display text-2xl font-semibold text-ink">{pct}%</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.description}</p>
                <div className="mt-4"><Bar value={pct} color="bg-mint" /></div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-2"><AvatarStack names={p.contributors.map((c) => memberName(state, c.memberId))} size={24} /> {p.contributors.length} contributors</span>
                  <span>{done}/{p.tasks.length} tasks • started {ago(p.createdDaysAgo)}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : <Empty icon={Rocket} title="No projects yet" text="Open a high-signal idea and click “Turn into project”." />}
    </div>
  );
}

const ROLE_EMOJI = { Developer: '👨‍💻', Designer: '🎨', Marketer: '📢', 'Video Editor': '🎬', Writer: '✍️', Investor: '💰', Founder: '🚀', Student: '🎓' };

export function ProjectDetail({ project, onBack, memberMode = false }) {
  const { state, dispatch } = useStore();
  const open = useOpen();
  const [task, setTask] = useState('');
  const [update, setUpdate] = useState('');
  const idea = state.ideas.find((i) => i.id === project.ideaId);
  const done = project.tasks.filter((t) => t.done).length;
  const pct = Math.round((done / Math.max(1, project.tasks.length)) * 100);
  const roles = {};
  project.contributors.forEach((c) => (roles[c.role] = (roles[c.role] || 0) + 1));
  const isMember = memberMode && state.meId;
  const joined = isMember && project.contributors.some((c) => c.memberId === state.meId);
  const author = isMember ? state.meId : 'creator';
  const candidates = (idea?.volunteers || []).map((v) => state.members.find((m) => m.id === v.memberId)).filter((m) => m && !project.contributors.some((c) => c.memberId === m.id))
    .sort((a, b) => contributionScore(b) - contributionScore(a));
  const completed = project.status === 'Completed';
  const owner = state.members.find((m) => m.id === project.ownerId);
  const canSetStatus = !memberMode || (state.meId && project.ownerId === state.meId);

  return (
    <div className="animate-fade-up">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects</button>
      <div className="card p-6">
        {idea && <div className="mb-5 max-w-xl"><StageTrack stage={ideaStage(idea, state.projects)} /></div>}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone={completed ? 'mint' : 'amber'} icon={completed ? Check : Rocket}>{completed ? 'Completed' : 'In progress'}</Chip>
              {memberMode || !project.contributors.length ? (
                <Chip tone="outline">Owner: {owner?.name || 'not set'}</Chip>
              ) : (
                <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-ink-2">
                  Owner
                  <select value={project.ownerId || ''} onChange={(e) => dispatch({ type: 'SET_OWNER', projectId: project.id, memberId: e.target.value })} className="rounded-full bg-transparent py-0.5 text-[11px] font-semibold text-ink outline-none" aria-label="Project owner">
                    {!project.ownerId && <option value="">Choose…</option>}
                    {project.contributors.map((c) => <option key={c.memberId} value={c.memberId}>{memberName(state, c.memberId)}</option>)}
                  </select>
                </label>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Project: {project.name}</h1>
            <p className="mt-1 max-w-2xl text-ink-2">{project.description}</p>
            {idea && <button onClick={() => open.idea(idea.id)} className="mt-2 text-sm text-accent hover:underline">Born from a community idea by {memberName(state, idea.authorId)} → “{idea.title}”</button>}
          </div>
          <div className="flex gap-2">
            {canSetStatus && (completed
              ? <Button variant="secondary" onClick={() => dispatch({ type: 'PROJECT_STATUS', projectId: project.id, status: 'Active' })}>Reopen</Button>
              : <Button variant="accent" icon={Check} onClick={() => dispatch({ type: 'PROJECT_STATUS', projectId: project.id, status: 'Completed' })}>Mark complete</Button>)}
            {!memberMode && idea && <Button variant="secondary" icon={Megaphone} onClick={() => open.promote(idea.id)}>Promote</Button>}
            {isMember && !joined && <Button variant="accent" icon={Plus} onClick={() => dispatch({ type: 'JOIN_PROJECT', projectId: project.id })}>Join team</Button>}
            {isMember && joined && <Chip tone="mint" icon={Check}>You’re on the team</Chip>}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4"><div className="flex-1"><Bar value={pct} color="bg-mint" /></div><span className="text-sm font-semibold text-ink">{pct}% • {done}/{project.tasks.length} tasks</span></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(roles).map(([r, n]) => <Chip key={r} tone="default">{ROLE_EMOJI[r] || '⭐'} {n} {r}{n > 1 ? 's' : ''}</Chip>)}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="card p-5 lg:col-span-7">
          <SectionTitle eyebrow="Tasks" title="What needs doing" />
          <ul className="space-y-1">
            {project.tasks.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-paper">
                  <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'TOGGLE_TASK', projectId: project.id, taskId: t.id })} className="h-4 w-4 accent-[#5b3df5]" />
                  <span className={cx('flex-1 text-sm', t.done ? 'text-muted line-through' : 'text-ink')}>{t.title}</span>
                  {t.assignee && <span className="flex items-center gap-1.5 text-xs text-muted"><Avatar name={memberName(state, t.assignee)} size={20} />{memberName(state, t.assignee).split(' ')[0]}</span>}
                </label>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (task.trim()) { dispatch({ type: 'ADD_TASK', projectId: project.id, title: task.trim().slice(0, 120) }); setTask(''); } }}>
            <label htmlFor="new-task" className="sr-only">New task</label>
            <input id="new-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task…" className="h-10 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent" />
            <Button type="submit" variant="secondary" icon={Plus} disabled={!task.trim()}>Add</Button>
          </form>
        </section>
        <div className="space-y-6 lg:col-span-5">
          <section className="card p-5">
            <SectionTitle eyebrow="Team" title={`${project.contributors.length} people from your audience`} />
            <div className="-mx-2">{project.contributors.map((c) => { const m = state.members.find((x) => x.id === c.memberId); return m ? <PersonRow key={c.memberId} member={m} why={`${ROLE_EMOJI[c.role] || ''} ${c.role}`} /> : null; })}</div>
            {!memberMode && candidates.length > 0 && (
              <div className="mt-4 border-t border-line-2 pt-4">
                <p className="mb-2 text-xs font-semibold text-accent">Collaboration requests on the original idea ({candidates.length})</p>
                <ul className="space-y-1">
                  {candidates.slice(0, 5).map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Avatar name={m.name} size={26} />
                      <span className="min-w-0 flex-1 truncate text-xs"><b className="font-medium text-ink">{m.name}</b> <span className="text-muted">• {m.role}</span></span>
                      <button onClick={() => dispatch({ type: 'ADD_CONTRIBUTOR', projectId: project.id, memberId: m.id })} className="rounded-md px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent-soft">+ Add to team</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="card p-5">
            <SectionTitle eyebrow="Updates" title="Progress log" />
            {(!memberMode || joined) && (
              <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (update.trim()) { dispatch({ type: 'ADD_UPDATE', projectId: project.id, memberId: author, text: update.trim().slice(0, 500) }); setUpdate(''); } }}>
                <label htmlFor="new-update" className="sr-only">Post an update</label>
                <input id="new-update" value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="Post an update…" className="h-10 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent" />
                <Button type="submit" variant="primary" icon={Send} aria-label="Post update" disabled={!update.trim()} />
              </form>
            )}
            <ul className="space-y-3">
              {project.updates.map((u) => (
                <li key={u.id} className="flex gap-3"><Avatar name={memberName(state, u.memberId)} size={28} /><div><p className="text-xs font-semibold text-ink">{memberName(state, u.memberId)} <span className="font-normal text-muted">• {ago(u.daysAgo)}</span></p><p className="text-sm text-ink-2">{u.text}</p></div></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
