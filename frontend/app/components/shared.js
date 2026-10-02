'use client';

import { Heart, MessageCircle, Handshake, Bookmark, Star, Rocket, Sparkles, Layers, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { contributionScore, fmt, ago } from '../lib/ai';
import { CREATOR } from '../lib/seed';
import { Avatar, AvatarStack, Chip, ScoreRing, cx } from './ui';

export function useOpen() {
  const { dispatch } = useStore();
  return {
    idea: (id) => dispatch({ type: 'NAV', patch: { modal: { type: 'idea', id } } }),
    member: (id) => dispatch({ type: 'NAV', patch: { modal: { type: 'member', id } } }),
    promote: (id) => dispatch({ type: 'NAV', patch: { modal: { type: 'promote', id } } }),
    project: (id) => dispatch({ type: 'NAV', patch: { modal: { type: 'project', id } } }),
    share: (prefill) => dispatch({ type: 'NAV', patch: { modal: { type: 'share', prefill } } }),
    invite: (id, projectId) => dispatch({ type: 'NAV', patch: { modal: { type: 'invite', id, projectId } } }),
    close: () => dispatch({ type: 'NAV', patch: { modal: null } }),
  };
}

export function useCommunity(id) {
  const { state } = useStore();
  return state.communities.find((c) => c.id === id);
}

export function memberName(state, id) {
  if (id === 'creator') return CREATOR.name;
  return state.members.find((m) => m.id === id)?.name || 'Member';
}

export function IdeaStatus({ idea }) {
  return (
    <>
      {idea.featured && <Chip tone="amber" icon={Star}>Featured by {CREATOR.firstName}</Chip>}
      {idea.status === 'project' && <Chip tone="mint" icon={Rocket}>Project</Chip>}
    </>
  );
}

export function IdeaCard({ idea, mode = 'creator', compact = false, rank }) {
  const { state, dispatch, intel } = useStore();
  const open = useOpen();
  const sig = intel.scored.get(idea.id);
  const community = state.communities.find((c) => c.id === idea.communityId);
  const author = state.members.find((m) => m.id === idea.authorId);
  const cluster = intel.clusterOf.get(idea.id);
  const supported = !!state.supported[idea.id];
  const volunteered = state.meId && idea.volunteers.some((v) => v.memberId === state.meId);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <article
      onClick={() => open.idea(idea.id)}
      className={cx('card group cursor-pointer p-4 transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-lg', compact ? '' : 'sm:p-5')}
    >
      <div className="flex gap-4">
        {mode === 'creator' && sig && (
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <ScoreRing score={sig.score} size={compact ? 44 : 52} />
            <span className="text-[10px] font-medium text-muted">Signal</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {rank && <span className="font-display text-xs font-semibold text-muted">#{rank}</span>}
            {community && <Chip>{community.emoji} {community.name}</Chip>}
            {idea.category && <Chip tone="sky">{idea.category}</Chip>}
            <IdeaStatus idea={idea} />
            {mode === 'creator' && sig?.label === 'High potential' && <Chip tone="accent" icon={Sparkles}>High potential</Chip>}
          </div>
          <h3 className="font-display text-[15px] font-semibold leading-snug text-ink group-hover:text-accent">{idea.title}</h3>
          {!compact && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{idea.description}</p>}

          {mode === 'creator' && sig && !compact && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span>{sig.reasons.slice(0, 2).join(' • ')}</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2">
            {mode === 'member' ? (
              <>
                <button onClick={stop(() => dispatch({ type: 'SUPPORT', ideaId: idea.id }))} aria-pressed={supported}
                  className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition', supported ? 'bg-coral-soft text-coral' : 'hover:bg-line-2')}>
                  <Heart className={cx('h-3.5 w-3.5', supported && 'fill-coral')} aria-hidden="true" /> {idea.supports.toLocaleString('en-US')}
                </button>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> {idea.commentsCount}</span>
                <span className={cx('inline-flex items-center gap-1.5', volunteered && 'font-medium text-mint')}><Handshake className="h-3.5 w-3.5" aria-hidden="true" /> {idea.volunteers.length} want to contribute</span>
                <button onClick={stop(() => dispatch({ type: 'SAVE', ideaId: idea.id }))} aria-label={state.saved[idea.id] ? 'Unsave idea' : 'Save idea'} aria-pressed={!!state.saved[idea.id]} className="ml-auto rounded-full p-1 hover:bg-line-2">
                  <Bookmark className={cx('h-4 w-4', state.saved[idea.id] && 'fill-ink')} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" aria-hidden="true" /> <b className="font-semibold text-ink">{idea.supports.toLocaleString('en-US')}</b> supporters</span>
                <span className="inline-flex items-center gap-1.5"><Handshake className="h-3.5 w-3.5" aria-hidden="true" /> <b className="font-semibold text-ink">{idea.volunteers.length}</b> collaborators</span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> {idea.commentsCount}</span>
                {cluster && cluster.ideaIds.length > 1 && !compact && (
                  <span className="inline-flex items-center gap-1.5 text-accent"><Layers className="h-3.5 w-3.5" aria-hidden="true" /> {cluster.requests} similar requests</span>
                )}
              </>
            )}
          </div>
          {!compact && author && (
            <div className="mt-3 flex items-center gap-2 border-t border-line-2 pt-3 text-xs text-muted">
              <Avatar name={author.name} size={20} />
              <span><span className="font-medium text-ink-2">{author.name}</span> • {author.role} • {ago(idea.daysAgo)}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function PersonRow({ member, why, right, onClick }) {
  const open = useOpen();
  const score = contributionScore(member);
  return (
    <button onClick={onClick || (() => open.member(member.id))} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-paper">
      <Avatar name={member.name} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
        <p className="truncate text-xs text-muted">{why || `${member.role} • ${member.skills.slice(0, 2).join(', ')}`}</p>
      </div>
      {right ?? (
        <div className="text-right">
          <p className="font-display text-sm font-semibold text-ink">{score}</p>
          <p className="text-[10px] text-muted">score</p>
        </div>
      )}
    </button>
  );
}

export function PersonCard({ member, why = [], action }) {
  const open = useOpen();
  const score = contributionScore(member);
  return (
    <div className="card flex flex-col p-4 transition hover:border-ink/15">
      <button onClick={() => open.member(member.id)} className="flex items-center gap-3 text-left">
        <Avatar name={member.name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{member.name}</p>
          <p className="truncate text-xs text-muted">{member.role} • {member.city}</p>
        </div>
        <div className="rounded-xl bg-accent-soft px-2.5 py-1.5 text-center">
          <p className="font-display text-sm font-bold leading-none text-accent">{score}</p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-accent/80">score</p>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-1">
        {member.skills.slice(0, 4).map((s) => <Chip key={s} tone="outline">{s}</Chip>)}
      </div>
      {why.length > 0 && (
        <p className="mt-3 text-xs text-ink-2"><span className="font-medium text-accent">Matched:</span> {why.slice(0, 4).join(' • ')}</p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-line-2 pt-3 text-xs text-muted">
        <span>{member.stats.ideas} ideas • {member.stats.helpful} helpful • {fmt(member.socialFollowers)} followers</span>
        {action}
      </div>
    </div>
  );
}

// People who want to help across every merged idea in a cluster (deduplicated).
export function clusterHelpers(cluster, members) {
  const ids = new Set();
  cluster.items.forEach(({ idea }) => idea.volunteers.forEach((v) => ids.add(v.memberId)));
  const people = [...ids].map((id) => members.find((m) => m.id === id)).filter(Boolean);
  const builders = people.filter((m) => m.role === 'Developer' || m.role === 'Designer').length;
  return { total: people.length, builders };
}

export function ClusterCard({ cluster, defaultOpen = false }) {
  const { state, dispatch } = useStore();
  const open = useOpen();
  const [expanded, setExpanded] = useState(defaultOpen);
  const authors = cluster.items.map((x) => memberName(state, x.idea.authorId));
  const helpers = clusterHelpers(cluster, state.members);
  const top = cluster.items[0].idea; // most-supported idea represents the cluster
  const isCreator = state.view === 'creator';
  const selected = top.featured || top.status === 'project';
  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Layers className="h-3.5 w-3.5" aria-hidden="true" /> AI Topic Cluster</p>
            <h3 className="font-display text-lg font-semibold text-ink">🔥 {cluster.label}</h3>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold leading-none text-ink">{cluster.requests}</p>
            <p className="text-[11px] text-muted">similar requests</p>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-xl bg-accent-soft px-3 py-1.5 font-medium text-accent">👥 {cluster.supporters.toLocaleString('en-US')}+ people interested</span>
          <span className="rounded-xl bg-mint-soft px-3 py-1.5 font-medium text-mint">🛠 {helpers.builders} developers/designers want to help</span>
        </div>
        <p className="rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink-2"><span className="font-semibold text-ink">AI summary: </span>{cluster.summary}</p>
        {isCreator && (
          <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Turn this request into action">
            <li><button onClick={() => { if (!top.featured) dispatch({ type: 'FEATURE', ideaId: top.id }); open.idea(top.id); }} className={cx('w-full rounded-xl border px-2 py-2 text-xs font-semibold transition', selected ? 'border-mint/40 bg-mint-soft text-mint' : 'border-line bg-white text-ink hover:border-accent/40')}>{selected ? '✓ Selected' : '1 · Select idea'}</button></li>
            <li><button onClick={() => (top.status === 'project' ? dispatch({ type: 'NAV', patch: { creatorPage: 'projects', openProjectId: top.projectId || state.projects.find((p) => p.ideaId === top.id)?.id } }) : open.project(top.id))} className={cx('w-full rounded-xl border px-2 py-2 text-xs font-semibold transition', top.status === 'project' ? 'border-mint/40 bg-mint-soft text-mint' : 'border-accent bg-accent text-white hover:bg-accent-600')}>{top.status === 'project' ? '✓ Collaboration' : '2 · Create collaboration'}</button></li>
            <li><button onClick={() => open.promote(top.id)} className="w-full rounded-xl border border-line bg-white px-2 py-2 text-xs font-semibold text-ink transition hover:border-accent/40">3 · Promote</button></li>
          </ol>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <AvatarStack names={authors} size={22} max={5} />
            <span>{cluster.supporters.toLocaleString('en-US')} combined supporters</span>
          </div>
          <button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            {expanded ? 'Hide' : 'View'} {cluster.items.length} merged ideas
            <ChevronDown className={cx('h-4 w-4 transition', expanded && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded && (
        <ul className="animate-fade-in divide-y divide-line-2 border-t border-line-2 bg-paper/50">
          {cluster.items.map(({ idea, similarity }) => (
            <li key={idea.id}>
              <button onClick={() => open.idea(idea.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-white">
                <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">{Math.round(Math.min(1, similarity) * 100)}%</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{idea.title}</span>
                <span className="text-xs text-muted">❤️ {idea.supports}</span>
                <ArrowUpRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
