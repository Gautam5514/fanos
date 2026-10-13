'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Newspaper, Flame, Lightbulb, Users, Briefcase, Search, Loader2, Sparkles, Layers, Star, Rocket, ShieldAlert, Check, Archive, Send, Plus, ArrowLeft,
  Megaphone, BadgeCheck, Mail, FolderKanban, ArrowRight, Boxes, RefreshCw, Zap, Clock, TrendingUp, Trophy, Gem, SlidersHorizontal, Inbox, Heart, Handshake,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { buildBrief, contributionScore, draftReply, hiddenGems, searchPeople, searchPeopleBy, hoursAgo, ago } from '../../lib/ai';
import { CREATOR, ROLES } from '../../lib/seed';
import { Avatar, AvatarStack, Bar, Button, Chip, Empty, SectionTitle, Sparkline, cx } from '../ui';
import { ClusterCard, IdeaCard, PersonCard, PersonRow, StageTrack, memberName, memberCount, useOpen } from '../shared';
import { ideaStage, STAGE_LABEL, STAGES } from '../../lib/reducer';
import CommunityPage from '../CommunityPage';
import { Grad, PageHeader as SharedPageHeader } from '../chrome';
import { ClearFilters, Dropdown, SearchField, Segmented, Toolbar, spaceOptions } from '../controls';
import { AiIcon, ROLE_ICON, SpaceIcon } from '../icons';
import PriorityList from './Priority';
import ActivityFeed from './ActivityFeed';
import { aiContext, aiTask } from '../../lib/aiClient';

// Highlights the closing words of a string title with the animated gradient.
function accentTitle(title) {
  if (typeof title !== 'string') return title;
  const words = title.split(' ');
  const n = words.length >= 3 ? 2 : 1;
  const head = words.slice(0, -n).join(' ');
  return <>{head && `${head} `}<Grad>{words.slice(-n).join(' ')}</Grad></>;
}

export function PageHeader({ eyebrow, title, sub, action, icon }) {
  return <SharedPageHeader eyebrow={eyebrow} icon={icon} title={accentTitle(title)} description={sub} actions={action} />;
}

// ================================================================== Brief
export function BriefPage({ go, ask }) {
  const { state, intel } = useStore();
  const open = useOpen();
  const brief = useMemo(() => buildBrief(state, intel), [state, intel]);
  const requested = intel.clusters.filter((c) => c.requests > 1).slice(0, 4);
  const recent = state.activity.slice(0, 6);
  const none = (text) => <p className="py-6 text-center text-sm text-muted">{text}</p>;
  const runAction = (a) => {
    if (!a) return;
    if (a.idea) open.idea(a.idea);
    else if (a.member) open.member(a.member);
    else if (a.ask) ask(a.ask);
    else if (a.to) go(a.to);
  };
  return (
    <div className="space-y-6">
      <PageHeader icon={Newspaper} eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} title="Community brief"
        sub="The few things that deserve your attention today." />

      {state.aiEnabled && (state.ideas.length > 0 || state.members.length > 0) && <AiSummary />}

      <section className="card p-5 sm:p-6">
        <SectionTitle icon={Sparkles} title={brief.things.length ? `${brief.things.length} thing${brief.things.length === 1 ? '' : 's'} worth your time` : 'You’re all caught up'} />
        <PriorityList items={brief.things} onAction={runAction} empty="Insights appear here as members share ideas and messages arrive." />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <SectionTitle icon={TrendingUp} title="Trending topics" />
          {!brief.trends.length && none('No topics yet.')}
          {brief.trends.slice(0, 4).map((t) => (
            <div key={t.topic} className="flex items-center justify-between gap-3 border-b border-line-2 py-3 last:border-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{t.topic}</p><Sparkline data={t.spark} width={90} height={22} /></div>
              <p className="text-right"><span className="block font-display text-lg font-semibold text-ink">{t.thisWeek}</span><span className="text-[11px] text-muted">new</span></p>
            </div>
          ))}
        </section>
        <section className="card p-5">
          <SectionTitle icon={Layers} title="Most requested" />
          {!requested.length && none('Nothing requested more than once yet.')}
          {requested.map((c) => (
            <button key={c.id} onClick={() => go('ideas', { ideasTab: 'clusters' })} className="flex w-full items-center gap-3 border-b border-line-2 py-3 text-left last:border-0 hover:bg-paper/60">
              <p className="flex-1 text-sm text-ink">{c.label}</p>
              <p className="text-right"><span className="block font-display font-semibold text-ink">{c.requests}×</span><span className="text-[11px] text-muted">requests</span></p>
            </button>
          ))}
        </section>
        <section className="card p-5">
          <SectionTitle icon={Users} title="Top contributors" action={<Button size="sm" variant="ghost" onClick={() => go('people')}>All</Button>} />
          {!brief.people.length && none('No members have joined yet.')}
          <div className="-mx-2">{brief.people.slice(0, 4).map((m) => <PersonRow key={m.id} member={m} why={`${m.role}${m.growth > 30 ? ` · +${m.growth}% this month` : ''}`} />)}</div>
        </section>
      </div>

      <section className="card p-5">
        <SectionTitle icon={Clock} title="Recent activity" />
        {!recent.length && none('No activity yet.')}
        <ActivityFeed items={recent} />
      </section>
    </div>
  );
}

// AI weekly summary (Groq, strict JSON). Cached per data-snapshot in this browser session so
// reopening the page never spends another AI call.
function AiSummary() {
  const { state, intel } = useStore();
  const ctx = useMemo(() => aiContext(state, intel), [state, intel]);
  const key = useMemo(() => {
    const raw = JSON.stringify([ctx.counts, ctx.topIdeas.map((i) => i.title), ctx.clusters.map((c) => c.label)]);
    let h = 0; for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return `fanos_ai_brief_${h}`;
  }, [ctx]);
  const [res, setRes] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setLoading(true); setError('');
    const r = await aiTask('brief', { context: ctx });
    setLoading(false);
    if (r.ok) { const v = { data: r.data, meta: r.meta }; setRes(v); try { sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }
    else setError(r.error || 'AI is unavailable right now.');
  };
  useEffect(() => { if (res) return undefined; const t = setTimeout(run, 0); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card ai-glow p-5 sm:p-6" aria-label="AI summary" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-accent"><AiIcon className="h-3.5 w-3.5" /> AI summary</p>
        <button type="button" onClick={run} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted transition hover:bg-white hover:text-ink disabled:opacity-60"><RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />{loading ? 'Writing…' : 'Regenerate'}</button>
      </div>
      {loading && !res && <div className="mt-4 space-y-2.5" aria-label="Writing your summary"><div className="h-5 w-3/4 animate-pulse rounded bg-white/80" /><div className="h-3.5 w-full animate-pulse rounded bg-white/80" /><div className="h-3.5 w-5/6 animate-pulse rounded bg-white/80" /></div>}
      {error && !res && <p className="mt-3 text-sm text-ink-2">{error} <button type="button" onClick={run} className="font-semibold text-accent hover:underline">Try again</button></p>}
      {res && (
        <div className={cx('mt-3', loading && 'opacity-60 transition-opacity')}>
          <h2 className="font-display text-xl font-semibold leading-snug text-ink">{res.data.headline}</h2>
          {res.data.highlights.length > 0 && (
            <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
              {res.data.highlights.map((h) => (
                <li key={h.title} className="rounded-2xl bg-white/80 p-3.5"><p className="text-sm font-semibold text-ink">{h.title}</p><p className="mt-0.5 text-xs leading-relaxed text-ink-2">{h.detail}</p></li>
              ))}
            </ul>
          )}
          {res.data.next_steps.length > 0 && (
            <div className="mt-4"><p className="text-xs font-semibold text-muted">Suggested next steps</p>
              <ul className="mt-1.5 space-y-1">{res.data.next_steps.map((n) => <li key={n} className="flex gap-2 text-sm text-ink-2"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />{n}</li>)}</ul>
            </div>
          )}
          <p className="mt-4 text-[11px] text-muted">Written by AI from your community’s real numbers.</p>
        </div>
      )}
    </section>
  );
}

// ================================================================== Ideas
const SORTS = [{ value: 'signal', label: 'Signal score', icon: Sparkles }, { value: 'support', label: 'Most supported', icon: Heart }, { value: 'help', label: 'Most collaborators', icon: Handshake }, { value: 'new', label: 'Newest', icon: Clock }];

export function IdeasPage() {
  const { state, dispatch, intel } = useStore();
  const tab = state.ideasTab || 'ranked';
  const community = state.ideasCommunity || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('signal');
  const [stage, setStage] = useState('active'); // 'active' = every stage except archived
  const setTab = (t) => dispatch({ type: 'NAV', patch: { ideasTab: t } });
  const base = useMemo(() => state.ideas.filter((i) => ideaStage(i, state.projects) !== 'archived'), [state.ideas, state.projects]);
  const list = useMemo(() => {
    let l = state.ideas.filter((i) => { const st = ideaStage(i, state.projects); return stage === 'active' ? st !== 'archived' : st === stage; });
    if (tab === 'featured') l = l.filter((i) => i.featured);
    if (community !== 'all') l = l.filter((i) => i.communityId === community);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((i) => `${i.title} ${i.description} ${i.tags.join(' ')}`.toLowerCase().includes(t)); }
    const by = { signal: (a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score, support: (a, b) => b.supports - a.supports, new: (a, b) => a.daysAgo - b.daysAgo, help: (a, b) => b.volunteers.length - a.volunteers.length };
    return [...l].sort(by[sort]);
  }, [state.ideas, state.projects, stage, tab, community, q, sort, intel]);
  const clusters = community === 'all' ? intel.clusters : intel.clusters.filter((c) => c.items.some((x) => x.idea.communityId === community));
  const newThisWeek = state.ideas.filter((i) => (i.daysAgo ?? 0) < 7).length;
  const filtered = !!q || stage !== 'active' || community !== 'all' || sort !== 'signal';
  const reset = () => { setQ(''); setStage('active'); setSort('signal'); dispatch({ type: 'NAV', patch: { ideasCommunity: 'all' } }); };

  return (
    <div>
      <PageHeader icon={Lightbulb} title="Ideas from your audience"
        sub={base.length ? `${base.length} idea${base.length === 1 ? '' : 's'}${newThisWeek ? ` · ${newThisWeek} new this week` : ''}. Ranked by how much your community wants them.` : 'What your audience wants you to build, teach or launch.'} />
      <Toolbar>
        <Segmented label="Idea views" value={tab} onChange={setTab} options={[{ value: 'ranked', label: 'Ranked', icon: Sparkles, count: base.length }, { value: 'clusters', label: 'Clusters', icon: Layers, count: intel.clusters.length }, { value: 'featured', label: 'Featured', icon: Star, count: state.ideas.filter((i) => i.featured).length }]} />
        {tab !== 'clusters' && <SearchField value={q} onChange={setQ} placeholder="Search ideas…" label="Search ideas" className="min-w-[180px] flex-1 sm:max-w-xs" />}
        <Dropdown label="Space" value={community} onChange={(v) => dispatch({ type: 'NAV', patch: { ideasCommunity: v } })} options={spaceOptions(state.communities)} icon={Boxes} />
        {tab !== 'clusters' && <Dropdown label="Stage" value={stage} onChange={setStage} icon={SlidersHorizontal} options={[{ value: 'active', label: 'All stages' }, ...[...STAGES, 'archived'].map((st) => ({ value: st, label: STAGE_LABEL[st] }))]} />}
        {tab !== 'clusters' && <Dropdown label="Sort" showLabel value={sort} onChange={setSort} options={SORTS} align="right" menuWidth="w-56" />}
        <ClearFilters show={filtered} onClick={reset} />
      </Toolbar>
      {tab === 'clusters' ? (
        clusters.length ? <div className="grid gap-4 lg:grid-cols-2">{clusters.map((c, i) => <ClusterCard key={c.id} cluster={c} defaultOpen={i === 0} />)}</div>
          : <Empty icon={Layers} title="No clusters yet" text="When several members ask for similar things, we group them here so you see the real demand." />
      ) : list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">{list.map((i) => <IdeaCard key={i.id} idea={i} />)}</div>
      ) : (
        state.ideas.length === 0 ? (
          <Empty icon={Lightbulb} title="No ideas yet" text="Ideas appear here the moment your members start sharing. Share your invite link to bring your audience in." />
        ) : (
          <Empty icon={Star} title={tab === 'featured' ? 'No featured ideas yet' : 'No ideas match'} text={tab === 'featured' ? 'Open any idea and choose “Feature idea” to spotlight it to your members.' : 'Try a different search or clear the filters.'} action={filtered && <Button variant="secondary" onClick={reset}>Clear filters</Button>} />
        )
      )}
    </div>
  );
}

// ================================================================== Opportunities
const CAT_TONE = { 'Brand Partnership': 'accent', 'Business Opportunity': 'sky', 'Speaking Invitation': 'amber', Collaboration: 'mint', 'Community Proposal': 'coral', Hiring: 'default', 'Talent Offer': 'outline' };

export function OpportunitiesPage() {
  const { state, dispatch, intel } = useStore();
  const cat = state.oppCategory || 'All';
  const [level, setLevel] = useState('all'); // all | high | new
  const [showSpam, setShowSpam] = useState(false);
  const [selected, setSelected] = useState(state.openOppId || null);
  const real = intel.opps.filter((o) => !o.ai.isSpam && o.status !== 'archived').sort((a, b) => b.ai.priority - a.ai.priority);
  const spam = intel.opps.filter((o) => o.ai.isSpam);
  const counts = {};
  real.forEach((o) => (counts[o.ai.category] = (counts[o.ai.category] || 0) + 1));
  const high = real.filter((o) => o.ai.priority >= 50);
  const unread = real.filter((o) => o.status === 'new');
  let list = cat === 'All' ? real : real.filter((o) => o.ai.category === cat);
  if (level === 'high') list = list.filter((o) => o.ai.priority >= 50);
  if (level === 'new') list = list.filter((o) => o.status === 'new');
  const sel = intel.opps.find((o) => o.id === (selected || list[0]?.id)) || null;
  const setCat = (c) => { dispatch({ type: 'NAV', patch: { oppCategory: c } }); setSelected(null); };

  return (
    <div>
      <PageHeader icon={Inbox} title="Opportunities inbox"
        sub={real.length ? `${high.length} high priority out of ${real.length}. Spam is removed and the rest is ranked for you.` : 'Brand deals, collaborations and invitations from your audience land here.'} />
      <Toolbar>
        <Segmented label="Priority" value={level} onChange={(v) => { setLevel(v); setSelected(null); }} options={[{ value: 'all', label: 'All', count: real.length }, { value: 'high', label: 'High priority', icon: Flame, count: high.length }, { value: 'new', label: 'Not replied', icon: Mail, count: unread.length }]} />
        <Dropdown label="Type" showLabel value={cat} onChange={setCat} icon={Briefcase} options={[{ value: 'All', label: 'All types', count: real.length }, ...Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((c) => ({ value: c, label: c, count: counts[c] }))]} />
        {spam.length > 0 && (
          <button type="button" onClick={() => setShowSpam((v) => !v)} aria-expanded={showSpam} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition hover:bg-line-2 hover:text-ink">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> {spam.length.toLocaleString('en-US')} spam filtered
          </button>
        )}
      </Toolbar>

      {showSpam && (
        <div className="card mb-4 animate-fade-up border-dashed p-4">
          <p className="mb-2 text-xs font-semibold text-muted">Automatically removed</p>
          {spam.slice(0, 5).map((o) => (
            <div key={o.id} className="border-t border-line-2 py-2 text-xs first:border-0">
              <p className="truncate text-ink-2 line-through decoration-muted/50">{o.message}</p>
              <p className="mt-0.5 text-coral">{o.ai.reasons.join(' · ')}</p>
            </div>
          ))}
        </div>
      )}

      {!real.length ? (
        <Empty icon={Inbox} title="No opportunities yet" text="When someone sends you a collaboration, brand deal or invitation, it appears here already sorted by priority." />
      ) : !list.length ? (
        <Empty icon={Search} title="Nothing in this view" text="Try another priority or type." action={<Button variant="secondary" onClick={() => { setLevel('all'); setCat('All'); }}>Show everything</Button>} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-2">
            {list.map((o) => (
              <button key={o.id} onClick={() => setSelected(o.id)} aria-pressed={sel?.id === o.id}
                className={cx('card flex w-full items-start gap-3.5 p-4 text-left transition hover:border-ink/15', sel?.id === o.id && 'border-accent ring-4 ring-accent/10')}>
                <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-base font-semibold', o.ai.priority >= 70 ? 'bg-accent text-white' : o.ai.priority >= 50 ? 'bg-accent-soft text-accent' : 'bg-line-2 text-ink-2')} title="Priority">{o.ai.priority}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5"><Chip tone={CAT_TONE[o.ai.category]}>{o.ai.category}</Chip>{o.status !== 'new' && <Chip tone="mint" icon={Check}>{o.status}</Chip>}</span>
                  <span className="mt-1.5 block truncate text-sm font-semibold text-ink">{o.subject}</span>
                  <span className="block truncate text-xs text-muted">{o.from.name}{o.from.org ? ` · ${o.from.org}` : ''} · {hoursAgo(o.hoursAgo)}</span>
                </span>
              </button>
            ))}
          </div>
          {sel && <OppDetail key={sel.id} sel={sel} onArchived={() => setSelected(null)} />}
        </div>
      )}
    </div>
  );
}

function OppDetail({ sel, onArchived }) {
  const { state, dispatch } = useStore();
  const [reply, setReply] = useState(() => draftReply(sel, sel.ai));
  const [tone, setTone] = useState('Friendly');
  const [writing, setWriting] = useState(false);
  const [meta, setMeta] = useState(null);
  // Groq drafts the reply in the creator's voice; the creator edits before sending.
  const writeWithAI = async () => {
    setWriting(true);
    const r = await aiTask('reply', { tone, creator: CREATOR.name, niche: CREATOR.niche, opp: { name: sel.from.name, org: sel.from.org, category: sel.ai.category, subject: sel.subject, message: sel.message } });
    setWriting(false);
    if (r.ok) { setReply(r.text); setMeta(r.meta); } else dispatch({ type: 'TOAST', toast: { text: r.error || 'AI is unavailable — kept the current draft' } });
  };
  return (
    <aside className="card h-fit p-5 xl:sticky xl:top-24">
      <div className="flex items-center gap-3">
        <Avatar name={sel.from.name} size={44} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-semibold text-ink">{sel.from.name}{sel.from.verified && <BadgeCheck className="h-4 w-4 text-sky" aria-label="Verified" />}</p>
          <p className="truncate text-xs text-muted">{[sel.from.title, sel.from.org].filter(Boolean).join(' · ') || sel.channel} · via {sel.channel}</p>
        </div>
      </div>
      <p className="mt-4 font-display text-lg font-semibold leading-snug text-ink">{sel.subject}</p>
      <p className="mt-2 rounded-2xl bg-paper p-3.5 text-sm leading-relaxed text-ink-2">{sel.message}</p>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft/40 px-4 py-3">
        <AiIcon className="h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{sel.ai.category}</p>
          <p className="text-xs text-muted">{sel.ai.signals.length ? sel.ai.signals.slice(0, 3).join(' · ') : `${Math.round(sel.ai.confidence * 100)}% confident`}</p>
        </div>
        <div className="w-24 shrink-0"><div className="mb-1 flex justify-between text-[11px]"><span className="text-muted">Priority</span><span className="font-semibold text-ink">{sel.ai.priority}</span></div><Bar value={sel.ai.priority} /></div>
      </div>

      {!sel.ai.isSpam && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="reply" className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Reply</label>
            {state.aiEnabled && (
              <div className="flex items-center gap-1">
                {['Friendly', 'Professional', 'Short'].map((t) => (
                  <button key={t} type="button" aria-pressed={tone === t} onClick={() => setTone(t)} className={cx('rounded-full px-2.5 py-1 text-[11px] font-medium transition', tone === t ? 'bg-ink text-white' : 'text-muted hover:bg-line-2 hover:text-ink')}>{t}</button>
                ))}
                <button type="button" onClick={writeWithAI} disabled={writing} className="ml-1 inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-white disabled:opacity-60">
                  <AiIcon className={cx('h-3.5 w-3.5', writing && 'animate-pulse')} />{writing ? 'Writing…' : 'Write with AI'}
                </button>
              </div>
            )}
          </div>
          <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={6} className="mt-1.5 w-full resize-none rounded-2xl border border-line p-3.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" />
          {meta && <p className="mt-1 text-[11px] text-muted">Written by AI — please read and edit before sending.</p>}
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
const PEOPLE_EXAMPLES = ['React developers', 'Designers active this month', 'Video editors in Mumbai', 'Founders into AI'];

export function PeoplePage() {
  const { state } = useStore();
  // The parent keys this page by peopleQuery, so a new query from the copilot remounts it.
  const [q, setQ] = useState(state.peopleQuery || '');
  const [query, setQuery] = useState(state.peopleQuery || '');
  const [role, setRole] = useState('All');
  const [view, setView] = useState('top'); // top | rising | new
  const [aiParsed, setAiParsed] = useState(null); // filters the AI read out of a human sentence
  const [searching, setSearching] = useState(false);
  const res = useMemo(() => (query ? (aiParsed ? searchPeopleBy(aiParsed, query, state.members) : searchPeople(query, state.members)) : null), [query, aiParsed, state.members]);
  const gems = useMemo(() => hiddenGems(state.members), [state.members]);
  const people = useMemo(() => {
    const pool = state.members.filter((m) => role === 'All' || m.role === role);
    if (view === 'rising') return gems.filter((g) => role === 'All' || g.member.role === role).map((g) => ({ member: g.member, why: [g.reason] }));
    const sorted = view === 'new' ? [...pool].sort((a, b) => (a.joinedDaysAgo ?? 99) - (b.joinedDaysAgo ?? 99)) : [...pool].sort((a, b) => contributionScore(b) - contributionScore(a));
    return sorted.slice(0, 24).map((m) => ({ member: m, why: [] }));
  }, [state.members, role, view, gems]);
  const p = res?.parsed;
  const criteria = p ? [...p.roles, ...p.skills, ...p.interests, p.city && `City: ${p.city}`, p.days && `Last ${p.days} days`, p.contributed && 'Has contributed', p.fresh && 'New / rising'].filter(Boolean) : [];
  // With AI on, a sentence like "kaun video edit kar sakta hai Mumbai me" is understood by Groq first;
  // if AI is off or busy, the built-in keyword search takes over.
  const run = async (text) => {
    const t = text.trim();
    setQ(text);
    if (!t) { setQuery(''); setAiParsed(null); return; }
    if (state.aiEnabled) {
      setSearching(true);
      const r = await aiTask('people_query', { query: t });
      setSearching(false);
      if (r.ok) { setAiParsed(r.data); setQuery(t); return; }
    }
    setAiParsed(null); setQuery(t);
  };

  return (
    <div>
      <PageHeader icon={Users} title="Your audience, searchable"
        sub={state.members.length ? `${state.members.length.toLocaleString('en-US')} member${state.members.length === 1 ? '' : 's'}. Find people by skill, interest or city, in plain English.` : 'Find collaborators by skill, interest or city, in plain English.'} />

      <form className="card ai-glow mb-5 p-4" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <AiIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-accent" />
            <label htmlFor="people-q" className="sr-only">Describe who you’re looking for</label>
            <input id="people-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Who are you looking for? e.g. kaun video edit kar sakta hai Mumbai me"
              className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-4 text-[15px] shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" />
          </div>
          <Button type="submit" variant="primary" size="lg" icon={searching ? Loader2 : Search} disabled={!q.trim() || searching}>{searching ? 'Searching…' : 'Search'}</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Try</span>
          {PEOPLE_EXAMPLES.map((ex) => <button type="button" key={ex} onClick={() => run(ex)} className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-ink-2 transition hover:border-accent/40 hover:text-accent">{ex}</button>)}
        </div>
      </form>

      {res ? (
        <section className="animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="font-display text-xl font-semibold text-ink">{res.results.length} match{res.results.length === 1 ? '' : 'es'}</p>
            {aiParsed?.summary && <Chip tone="accent" icon={AiIcon}>AI understood: {aiParsed.summary}</Chip>}
            {criteria.map((c) => <Chip key={c} tone="default">{c}</Chip>)}
            <button onClick={() => { setQuery(''); setQ(''); }} className="ml-auto inline-flex h-9 items-center rounded-full px-3 text-sm text-muted transition hover:bg-line-2 hover:text-ink">Clear search</button>
          </div>
          {res.results.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {res.results.slice(0, 30).map((r) => <PersonCard key={r.member.id} member={r.member} why={r.why} action={<InviteBtn member={r.member} />} />)}
            </div>
          ) : <Empty icon={Search} title="No members match" text="Try fewer words, like just a role or a skill." />}
        </section>
      ) : state.members.length === 0 ? (
        <Empty icon={Users} title="No members yet" text="Share your invite link and your followers will show up here with their skills and interests." />
      ) : (
        <>
          <Toolbar>
            <Segmented label="People views" value={view} onChange={setView} options={[{ value: 'top', label: 'Top contributors', icon: Trophy }, { value: 'rising', label: 'Rising', icon: Gem, count: gems.length }, { value: 'new', label: 'Newest', icon: Clock }]} />
            <Dropdown label="Role" showLabel value={role} onChange={setRole} icon={Users} options={[{ value: 'All', label: 'All roles' }, ...ROLES.filter((r) => r !== 'Other').map((r) => ({ value: r, label: r, icon: ROLE_ICON[r] }))]} />
            <ClearFilters show={role !== 'All'} onClick={() => setRole('All')} />
          </Toolbar>
          {people.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((r) => <PersonCard key={r.member.id} member={r.member} why={r.why} whyLabel={view === 'rising' ? 'Why' : 'Matched'} action={<InviteBtn member={r.member} />} />)}
            </div>
          ) : (
            <Empty icon={view === 'rising' ? Gem : Users} title={view === 'rising' ? 'No rising members yet' : 'No one here yet'} text={view === 'rising' ? 'Members with strong contributions but a small following show up here.' : 'Try another role.'} />
          )}
        </>
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
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:bg-accent-soft', sent ? 'text-mint' : 'text-accent')}>
      {sent ? <><Check className="h-3 w-3" aria-hidden="true" /> Invited</> : 'Invite to collaborate'}
    </button>
  );
}

// ================================================================== Communities
export function CommunitiesPage({ go }) {
  const { state, dispatch, intel } = useStore();
  if (state.communityId) return <CommunityPage communityId={state.communityId} mode="creator" onBack={() => dispatch({ type: 'NAV', patch: { communityId: null } })} />;
  const create = () => dispatch({ type: 'NAV', patch: { modal: { type: 'community' } } });
  return (
    <div>
      <PageHeader icon={Boxes} title="Your communities"
        sub={state.communities.length ? 'Spaces where your audience gathers around a topic.' : 'Group your fans by interest so ideas reach the right people.'}
        action={<Button variant="primary" icon={Plus} onClick={create}>New space</Button>} />
      {state.communities.length === 0 ? (
        <Empty icon={Boxes} title="Create your first space" text="Spaces group your fans by interest, like AI, Design or Startups. It takes ten seconds." action={<Button variant="accent" icon={Plus} onClick={create}>Create a space</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.communities.map((c) => {
            const ideas = state.ideas.filter((i) => i.communityId === c.id);
            const projects = state.projects.filter((pr) => ideas.some((i) => i.id === pr.ideaId)).length;
            const top = [...ideas].sort((a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score)[0];
            const contributors = [...state.members].filter((m) => (m.communities || []).includes(c.id)).sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 5);
            return (
              <article key={c.id} onClick={() => dispatch({ type: 'NAV', patch: { communityId: c.id, communityTab: 'feed' } })} className="card card-hover flex cursor-pointer flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><SpaceIcon name={c.name} className="h-6 w-6" /></span>
                  {c.growth !== 0 && <Chip tone={c.growth > 0 ? 'mint' : 'coral'}>{c.growth > 0 ? '+' : '−'}{Math.abs(c.growth)}% this month</Chip>}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{c.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-2">{c.description}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['Members', memberCount(state.members, c)], ['Ideas', ideas.length], ['Projects', projects]].map(([l, n]) => (
                    <div key={l} className="rounded-xl bg-paper px-2 py-2"><dd className="font-display text-base font-semibold text-ink tabular-nums">{n.toLocaleString('en-US')}</dd><dt className="text-[11px] text-muted">{l}</dt></div>
                  ))}
                </dl>
                {top && <p className="mt-3 truncate text-xs text-ink-2"><span className="font-semibold text-ink">Top idea:</span> {top.title}</p>}
                <div className="mt-4 flex items-center justify-between">
                  {contributors.length ? <AvatarStack names={contributors.map((m) => m.name)} size={24} max={4} extra={Math.max(0, memberCount(state.members, c) - 4)} /> : <span className="text-xs text-muted">No members yet</span>}
                  <button onClick={(e) => { e.stopPropagation(); go('ideas', { ideasCommunity: c.id, ideasTab: 'ranked' }); }} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Ideas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
          <button onClick={create} className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-line text-muted transition hover:border-accent/40 hover:bg-accent-soft/30 hover:text-accent">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"><Plus className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-sm font-medium">New space</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ================================================================== Projects
const PSORTS = [{ value: 'recent', label: 'Recently started', icon: Clock }, { value: 'progress', label: 'Most progress', icon: TrendingUp }, { value: 'team', label: 'Biggest team', icon: Users }];

export function ProjectsPage() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('all'); // all | active | done
  const [sort, setSort] = useState('recent');
  const openId = state.openProjectId;
  const project = state.projects.find((p) => p.id === openId);
  const pct = (p) => Math.round((p.tasks.filter((t) => t.done).length / Math.max(1, p.tasks.length)) * 100);
  const active = state.projects.filter((p) => p.status !== 'Completed');
  const done = state.projects.filter((p) => p.status === 'Completed');
  const list = useMemo(() => {
    const l = filter === 'active' ? active : filter === 'done' ? done : state.projects;
    const by = { recent: (a, b) => a.createdDaysAgo - b.createdDaysAgo, progress: (a, b) => pct(b) - pct(a), team: (a, b) => b.contributors.length - a.contributors.length };
    return [...l].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.projects, filter, sort]);
  if (project) return <ProjectDetail project={project} onBack={() => dispatch({ type: 'NAV', patch: { openProjectId: null } })} />;
  return (
    <div>
      <PageHeader icon={FolderKanban} title="Community projects"
        sub={state.projects.length ? `${active.length} in progress · ${done.length} completed. Ideas with real traction, built with your audience.` : 'Ideas with real traction become projects, built with your audience.'} />
      {state.projects.length > 0 && (
        <Toolbar>
          <Segmented label="Project status" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: state.projects.length }, { value: 'active', label: 'In progress', icon: Rocket, count: active.length }, { value: 'done', label: 'Completed', icon: Check, count: done.length }]} />
          <Dropdown label="Sort" showLabel value={sort} onChange={setSort} options={PSORTS} align="right" menuWidth="w-56" className="ml-auto" />
        </Toolbar>
      )}
      {list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const doneN = p.tasks.filter((t) => t.done).length;
            const progress = pct(p);
            return (
              <button key={p.id} onClick={() => dispatch({ type: 'NAV', patch: { openProjectId: p.id } })} className="card card-hover p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Chip tone={p.status === 'Completed' ? 'mint' : 'accent'} icon={p.status === 'Completed' ? Check : Rocket}>{p.status === 'Completed' ? 'Completed' : 'In progress'}</Chip><h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">{p.name}</h3></div>
                  <span className="font-display text-2xl font-semibold text-ink tabular-nums">{progress}%</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.description}</p>
                <div className="mt-4"><Bar value={progress} color="bg-mint" /></div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-2"><AvatarStack names={p.contributors.map((c) => memberName(state, c.memberId))} size={24} /> {p.contributors.length} {p.contributors.length === 1 ? 'person' : 'people'}</span>
                  <span>{doneN}/{p.tasks.length} tasks · started {ago(p.createdDaysAgo)}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : state.projects.length === 0 ? (
        <Empty icon={Rocket} title="No projects yet" text="Open an idea with strong support and choose “Turn into project” to start one." action={<Button variant="accent" icon={Lightbulb} onClick={() => dispatch({ type: 'NAV', patch: { creatorPage: 'ideas' } })}>Browse ideas</Button>} />
      ) : <Empty icon={Search} title="Nothing here" text="No projects match this view." action={<Button variant="secondary" onClick={() => setFilter('all')}>Show all</Button>} />}
    </div>
  );
}


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
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{project.name}</h1>
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
          {Object.entries(roles).map(([r, n]) => { const RIcon = ROLE_ICON[r] || Star; return <Chip key={r} tone="default"><RIcon className="h-3 w-3" aria-hidden="true" />{n} {r}{n > 1 ? 's' : ''}</Chip>; })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="card p-5 lg:col-span-7">
          <SectionTitle title="What needs doing" />
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
            <SectionTitle title={`${project.contributors.length} people from your audience`} />
            <div className="-mx-2">{project.contributors.map((c) => { const m = state.members.find((x) => x.id === c.memberId); return m ? <PersonRow key={c.memberId} member={m} why={c.role} /> : null; })}</div>
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
            <SectionTitle title="Progress log" />
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
