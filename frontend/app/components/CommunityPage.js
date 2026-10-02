'use client';

import { useMemo } from 'react';
import { ArrowLeft, Plus, Check, Lightbulb, MessageCircle, Megaphone, Rocket, Handshake, Users, Rss, FolderKanban } from 'lucide-react';
import { useStore } from '../lib/store';
import { contributionScore, ago, roleMatchesNeed } from '../lib/ai';
import { CREATOR } from '../lib/seed';
import { Avatar, Bar, Button, Chip, Empty, cx } from './ui';
import { IdeaCard, PersonCard, memberName, useOpen } from './shared';

const TABS = [['feed', 'Feed', Rss], ['ideas', 'Ideas', Lightbulb], ['members', 'Members', Users], ['projects', 'Projects', FolderKanban]];

export default function CommunityPage({ communityId, onBack, mode }) {
  const { state, dispatch, intel } = useStore();
  const open = useOpen();
  const c = state.communities.find((x) => x.id === communityId);
  const tab = state.communityTab || 'feed';
  const me = state.members.find((m) => m.id === state.meId);
  const isMember = mode === 'member';
  const joined = me?.communities.includes(communityId);

  const ideas = useMemo(() => state.ideas.filter((i) => i.communityId === communityId)
    .sort((a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score), [state.ideas, communityId, intel]);
  const members = useMemo(() => state.members.filter((m) => m.communities.includes(communityId))
    .sort((a, b) => contributionScore(b) - contributionScore(a)), [state.members, communityId]);
  const projects = state.projects.filter((p) => ideas.some((i) => i.id === p.ideaId));

  // Feed = what happened in this community, newest first.
  const feed = useMemo(() => {
    const items = [];
    const ideaIds = new Set(ideas.map((i) => i.id));
    ideas.forEach((i) => {
      items.push({ key: `i${i.id}`, days: i.daysAgo, kind: 'idea', idea: i });
      i.comments.forEach((cm) => items.push({ key: `c${cm.id}`, days: cm.daysAgo, kind: 'comment', idea: i, comment: cm }));
      i.volunteers.slice(0, 2).forEach((v, k) => items.push({ key: `v${i.id}${v.memberId}`, days: Math.max(0, i.daysAgo - 1 - k), kind: 'volunteer', idea: i, memberId: v.memberId }));
    });
    state.announcements.filter((a) => ideaIds.has(a.ideaId)).forEach((a) => items.push({ key: `a${a.id}`, days: 0, at: a.at, kind: 'announce', text: a.text, ideaId: a.ideaId }));
    projects.forEach((p) => items.push({ key: `p${p.id}`, days: p.createdDaysAgo, kind: 'project', project: p }));
    return items.sort((a, b) => a.days - b.days || (b.at || 0) - (a.at || 0)).slice(0, 40);
  }, [ideas, projects, state.announcements]);

  if (!c) return <Empty title="Community not found" action={<Button onClick={onBack}>Back</Button>} />;
  const setTab = (t) => dispatch({ type: 'NAV', patch: { communityTab: t } });
  const needsMe = me ? ideas.filter((i) => i.status === 'open' && i.needs.some((n) => n !== 'Feedback' && roleMatchesNeed(me.role, n))).length : 0;

  return (
    <div className="animate-fade-up">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All communities</button>
      <header className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-accent/15 via-[#c06bff]/10 to-coral/15" />
        <div className="-mt-8 flex flex-col justify-between gap-4 px-6 pb-6 md:flex-row md:items-end">
          <div>
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-white text-3xl shadow-sm" aria-hidden="true">{c.emoji}</span>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{c.name}</h1>
            <p className="mt-1 text-ink-2">{c.description}</p>
            <p className="mt-2 text-sm text-muted">{c.members.toLocaleString('en-US')} members • {ideas.length} ideas • {projects.length} projects{isMember && needsMe ? ` • ${needsMe} ideas need a ${me.role.toLowerCase()}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {isMember && <Button variant={joined ? 'secondary' : 'primary'} icon={joined ? Check : Plus} aria-pressed={!!joined} onClick={() => dispatch({ type: 'JOIN_COMMUNITY', communityId })}>{joined ? 'Joined' : 'Join community'}</Button>}
            {isMember && <Button variant="accent" icon={Plus} onClick={() => open.share({ communityId })}>Share an Idea</Button>}
          </div>
        </div>
        <div role="tablist" aria-label="Community sections" className="flex gap-1 overflow-x-auto border-t border-line-2 px-4">
          {TABS.map(([id, l, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition', tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink')}>
              <Icon className="h-4 w-4" aria-hidden="true" />{l}
              <span className="text-xs text-muted">{id === 'ideas' ? ideas.length : id === 'members' ? members.length : id === 'projects' ? projects.length : ''}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6">
        {tab === 'feed' && (
          <div className="mx-auto max-w-3xl space-y-3">
            {isMember && (
              <button onClick={() => open.share({ communityId })} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent/40">
                {me && <Avatar name={me.name} size={36} />}
                <span className="flex-1 rounded-xl bg-paper px-4 py-2.5 text-sm text-muted">Share an idea with {c.name}…</span>
                <Plus className="h-5 w-5 text-accent" aria-hidden="true" />
              </button>
            )}
            {feed.length ? feed.map((f) => <FeedItem key={f.key} item={f} />) : <Empty icon={Rss} title="No activity yet" text="Be the first to share an idea here." />}
          </div>
        )}
        {tab === 'ideas' && (ideas.length ? <div className="grid gap-3 lg:grid-cols-2">{ideas.map((i) => <IdeaCard key={i.id} idea={i} mode={mode} />)}</div> : <Empty icon={Lightbulb} title="No ideas yet" action={isMember && <Button variant="accent" icon={Plus} onClick={() => open.share({ communityId })}>Share the first idea</Button>} />)}
        {tab === 'members' && (members.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{members.slice(0, 60).map((m) => <PersonCard key={m.id} member={m} />)}</div> : <Empty icon={Users} title="No members yet" />)}
        {tab === 'projects' && (projects.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => {
              const pct = Math.round((p.tasks.filter((t) => t.done).length / Math.max(1, p.tasks.length)) * 100);
              return (
                <button key={p.id} onClick={() => dispatch({ type: 'NAV', patch: isMember ? { memberPage: 'projects', memberProjectId: p.id } : { creatorPage: 'projects', openProjectId: p.id } })} className="card p-5 text-left transition hover:border-ink/15">
                  <Chip tone="mint" icon={Rocket}>{p.status}</Chip>
                  <p className="mt-2 font-display text-lg font-semibold text-ink">{p.name}</p>
                  <div className="mt-3"><Bar value={pct} color="bg-mint" /></div>
                  <p className="mt-2 text-xs text-muted">{p.contributors.length} contributors • {pct}% done</p>
                </button>
              );
            })}
          </div>
        ) : <Empty icon={FolderKanban} title="No projects yet" text={`When ${CREATOR.firstName} turns an idea from this community into a project, it shows up here.`} />)}
      </div>
    </div>
  );
}

function FeedItem({ item }) {
  const { state } = useStore();
  const open = useOpen();
  const wrap = 'card flex w-full gap-3 p-4 text-left transition hover:border-ink/15';
  if (item.kind === 'idea') {
    const author = memberName(state, item.idea.authorId);
    return (
      <button onClick={() => open.idea(item.idea.id)} className={wrap}>
        <Avatar name={author} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-2"><b className="font-semibold text-ink">{author}</b> shared an idea • {ago(item.days)}</span>
          <span className="mt-1 block font-display font-semibold text-ink">{item.idea.title}</span>
          <span className="mt-1 line-clamp-2 block text-sm text-ink-2">{item.idea.description}</span>
          <span className="mt-2 flex gap-4 text-xs text-muted"><span>❤️ {item.idea.supports}</span><span>💬 {item.idea.commentsCount}</span><span>🤝 {item.idea.volunteers.length}</span></span>
        </span>
      </button>
    );
  }
  if (item.kind === 'comment') {
    const who = memberName(state, item.comment.memberId);
    return (
      <button onClick={() => open.idea(item.idea.id)} className={wrap}>
        <Avatar name={who} size={32} />
        <span className="min-w-0 flex-1 text-sm">
          <span className="block text-ink-2"><MessageCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /><b className="font-semibold text-ink">{who}</b> commented on <b className="font-medium text-ink">{item.idea.title}</b> • {ago(item.days)}</span>
          <span className="mt-1 block text-ink-2">“{item.comment.text}”</span>
        </span>
      </button>
    );
  }
  if (item.kind === 'volunteer') {
    const who = memberName(state, item.memberId);
    return (
      <button onClick={() => open.idea(item.idea.id)} className={cx(wrap, 'items-center py-3')}>
        <Handshake className="h-4 w-4 text-mint" aria-hidden="true" />
        <span className="text-sm text-ink-2"><b className="font-semibold text-ink">{who}</b> offered to help on <b className="font-medium text-ink">{item.idea.title}</b></span>
      </button>
    );
  }
  if (item.kind === 'announce') return (
    <button onClick={() => open.idea(item.ideaId)} className={cx(wrap, 'border-amber/30 bg-amber-soft/40')}>
      <Megaphone className="mt-0.5 h-5 w-5 text-amber" aria-hidden="true" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{CREATOR.name} • Announcement</span><span className="mt-1 line-clamp-4 block whitespace-pre-line text-sm text-ink-2">{item.text}</span></span>
    </button>
  );
  if (item.kind === 'project') return (
    <div className={cx(wrap, 'items-center')}>
      <Rocket className="h-5 w-5 text-mint" aria-hidden="true" />
      <span className="text-sm text-ink-2"><b className="font-semibold text-ink">{CREATOR.firstName}</b> turned an idea into the project <b className="font-medium text-ink">{item.project.name}</b> • {ago(item.days)}</span>
    </div>
  );
  return null;
}
