'use client';

import { useMemo, useState } from 'react';
import { Lightbulb, Flame, Handshake, Rocket, Users, Star, Megaphone, Plus, Check, Trophy, Bookmark, Sparkles, Home, Boxes, FolderKanban, Heart, MessageCircle, LogOut, Mail, X, UserRound } from 'lucide-react';
import { useStore } from '../../lib/store';
import { contributionScore, roleMatchesNeed, ago } from '../../lib/ai';
import { CREATOR } from '../../lib/seed';
import { Avatar, AvatarStack, Bar, Button, Chip, Empty, Logo, SectionTitle, cx } from '../ui';
import { Aurora, Grad, PageHeader } from '../chrome';
import ProfileMenu from '../ProfileMenu';
import { IdeaCard, PersonCard, memberName, useOpen } from '../shared';
import { ProjectDetail } from '../creator/Pages';
import CommunityPage from '../CommunityPage';

const TABS = [['home', 'Home', Home], ['ideas', 'Ideas', Lightbulb], ['communities', 'Communities', Boxes], ['projects', 'Projects', FolderKanban], ['people', 'People', Users]];

export default function MemberApp() {
  const { state, dispatch, auth } = useStore();
  const open = useOpen();
  const me = state.members.find((m) => m.id === state.meId);
  const page = state.memberPage;
  const go = (p, extra = {}) => { dispatch({ type: 'NAV', patch: { memberPage: p, ...(p === 'communities' ? { communityId: null } : {}), ...(p === 'projects' && !('memberProjectId' in extra) ? { memberProjectId: null } : {}), ...extra } }); window.scrollTo({ top: 0 }); };
  if (!me) return null;

  return (
    <div className="relative min-h-screen pb-20 md:pb-0">
      <Aurora className="h-[560px]" />
      <header className="glass sticky top-0 z-20 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <span className="hidden text-sm text-muted lg:inline">× {CREATOR.name}’s community</span>
          <nav aria-label="Member navigation" className="mx-auto hidden gap-0.5 rounded-full bg-white/70 p-1 ring-1 ring-line backdrop-blur md:flex">
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={cx('rounded-full px-4 py-1.5 text-sm font-medium transition', page === id ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:bg-line-2 hover:text-ink')}>{label}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button variant="accent" size="sm" icon={Plus} onClick={() => open.share()}>Share an Idea</Button>
            <ProfileMenu
              name={me.name}
              email={state.user?.email}
              sections={[
                [
                  { icon: UserRound, label: 'My profile', onClick: () => go('profile') },
                  { icon: Boxes, label: 'My communities', onClick: () => go('communities') },
                ],
                [{ icon: LogOut, label: 'Log out', onClick: () => auth.logout() }],
              ]}
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {page === 'home' && <MemberHome me={me} go={go} />}
        {page === 'ideas' && <MemberIdeas me={me} />}
        {page === 'communities' && (state.communityId
          ? <CommunityPage communityId={state.communityId} mode="member" onBack={() => dispatch({ type: 'NAV', patch: { communityId: null } })} />
          : <MemberCommunities me={me} />)}
        {page === 'projects' && <MemberProjects />}
        {page === 'people' && <MemberPeople />}
        {page === 'profile' && <MemberProfile me={me} />}
      </main>


      <nav aria-label="Member navigation" className="glass fixed inset-x-0 bottom-0 z-20 flex border-t border-line/70 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', page === id ? 'text-accent' : 'text-muted')}>
            <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', page === id && 'bg-accent-soft')}><Icon className="h-5 w-5" aria-hidden="true" /></span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function MemberHome({ me, go }) {
  const { state, dispatch, intel } = useStore();
  const open = useOpen();
  const openIdeas = state.ideas.filter((i) => i.status === 'open');
  const trending = [...openIdeas].sort((a, b) => b.supports - a.supports)[0];
  const featured = state.ideas.filter((i) => i.featured);
  const forMe = openIdeas
    .filter((i) => i.needs.some((n) => roleMatchesNeed(me.role, n) && n !== 'Feedback'))
    .sort((a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score)
    .slice(0, 3);
  const myCommunities = state.communities.filter((c) => me.communities.includes(c.id));
  const score = contributionScore(me);
  const invites = (state.invites || []).filter((i) => i.memberId === me.id && i.status === 'pending');

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-6 lg:col-span-8">
        <section className="animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-[34px]">Welcome back, <Grad>{me.name.split(' ')[0]}</Grad> 👋</h1>
          <p className="mt-1 text-ink-2">Here’s what’s happening in {CREATOR.firstName}’s community.</p>
        </section>

        {invites.length > 0 && (
          <section aria-label="Invitations" className="space-y-2">
            {invites.map((inv) => {
              const p = state.projects.find((x) => x.id === inv.projectId);
              return (
                <div key={inv.id} className="card flex flex-col gap-3 border-accent/30 bg-gradient-to-r from-accent-soft/70 to-white p-4 sm:flex-row sm:items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white"><Mail className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{CREATOR.name} invited you to collaborate{p ? ` on “${p.name}”` : ''} 🎉</p>
                    {inv.message && <p className="text-sm text-ink-2">“{inv.message}”</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="accent" icon={Check} onClick={() => dispatch({ type: 'RESPOND_INVITE', inviteId: inv.id, accept: true })}>Accept</Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={() => dispatch({ type: 'RESPOND_INVITE', inviteId: inv.id, accept: false })}>Decline</Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <button onClick={() => open.share()} className="card ai-glow group flex w-full items-center gap-4 p-5 text-left transition hover:border-accent/40">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30"><Lightbulb className="h-6 w-6" aria-hidden="true" /></span>
          <span className="flex-1">
            <span className="block font-display text-lg font-semibold text-ink">Share an Idea</span>
            <span className="text-sm text-muted">Got something {CREATOR.firstName} should build, teach or launch? Members vote, help and the best ideas become projects.</span>
          </span>
          <Plus className="h-5 w-5 text-muted transition group-hover:rotate-90 group-hover:text-accent" aria-hidden="true" />
        </button>

        <nav aria-label="Explore" className="no-scrollbar flex gap-2 overflow-x-auto">
          {[['🔥 Trending', () => go('ideas', { memberIdeasTab: 'trending' })], ['💡 Ideas', () => go('ideas', { memberIdeasTab: 'new' })], ['🤝 Collaborations', () => go('ideas', { memberIdeasTab: 'skills' })], ['🚀 Projects', () => go('projects')], ['👥 People', () => go('people')]].map(([l, fn]) => (
            <button key={l} onClick={fn} className="shrink-0 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 hover:shadow-sm">{l}</button>
          ))}
        </nav>

        {(state.announcements.length > 0 || featured.length > 0) && (
          <section>
            <SectionTitle eyebrow={`Featured by ${CREATOR.firstName}`} icon={Star} title="From the creator" />
            <div className="space-y-3">
              {state.announcements.slice(0, 2).map((a) => (
                <article key={a.id} className="card border-amber/30 bg-gradient-to-br from-amber-soft/60 to-white p-5">
                  <div className="flex items-center gap-2"><Avatar name={CREATOR.name} size={28} /><p className="text-sm font-semibold text-ink">{CREATOR.name}</p><Chip tone="amber" icon={Megaphone}>Announcement</Chip></div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{a.text}</p>
                  {a.ideaId && <Button size="sm" variant="secondary" className="mt-3" onClick={() => open.idea(a.ideaId)}>View idea</Button>}
                </article>
              ))}
              {featured.filter((f) => !state.announcements.some((a) => a.ideaId === f.id)).slice(0, 2).map((i) => <IdeaCard key={i.id} idea={i} mode="member" />)}
            </div>
          </section>
        )}

        {trending && (
          <section>
            <SectionTitle eyebrow="Trending idea" icon={Flame} title="Most supported this week" />
            <button onClick={() => open.idea(trending.id)} className="card card-hover w-full overflow-hidden text-left">
              <div className="bg-gradient-to-br from-accent to-[#9b4bf0] p-6 text-white">
                <Chip className="bg-white/20 text-white">🔥 #1 trending</Chip>
                <h3 className="mt-3 font-display text-2xl font-semibold">{trending.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/80">{trending.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-5 p-5 text-sm text-ink-2">
                <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-coral" aria-hidden="true" /> <b className="text-ink">{trending.supports}</b></span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden="true" /> <b className="text-ink">{trending.commentsCount}</b></span>
                <span className="inline-flex items-center gap-1.5"><Handshake className="h-4 w-4 text-mint" aria-hidden="true" /> <b className="text-ink">{trending.volunteers.length}</b> want to contribute</span>
                <span className="ml-auto"><AvatarStack names={trending.volunteers.slice(0, 4).map((v) => memberName(state, v.memberId))} size={24} extra={Math.max(0, trending.volunteers.length - 4)} /></span>
              </div>
            </button>
          </section>
        )}

        <section>
          <SectionTitle eyebrow="AI recommended for you" icon={Sparkles} title={`Ideas that need a ${me.role.toLowerCase()}`} action={<Button size="sm" variant="ghost" onClick={() => go('ideas', { memberIdeasTab: 'skills' })}>More →</Button>} />
          <div className="space-y-3">{forMe.length ? forMe.map((i) => <IdeaCard key={i.id} idea={i} mode="member" />) : <Empty icon={Lightbulb} title="Nothing yet" text="We’ll surface ideas that need your skills here." />}</div>
        </section>
      </div>

      <aside className="min-w-0 space-y-6 lg:col-span-4">
        <section className="ai-border ai-glow rounded-[18px] p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Your Contribution Score</p>
          <p className="mt-1 font-display text-4xl font-bold text-ink">{score}</p>
          <p className="text-xs text-muted">Earn points by sharing ideas, helping members and joining projects. {CREATOR.firstName} sees top contributors first.</p>
          <div className="mt-3"><Bar value={Math.min(100, (score / 500) * 100)} /></div>
          <p className="mt-1.5 text-[11px] text-muted">{Math.max(0, 500 - score)} points to “Rising Contributor”</p>
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="Your communities" icon={Boxes} title={`${myCommunities.length} joined`} action={<Button size="sm" variant="ghost" onClick={() => go('communities')}>Manage</Button>} />
          <ul className="space-y-1">
            {myCommunities.map((c) => (
              <li key={c.id}><button onClick={() => go('communities', { communityId: c.id, communityTab: 'feed' })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-paper"><span className="text-xl" aria-hidden="true">{c.emoji}</span><span className="flex-1 text-sm font-medium text-ink">{c.name}</span><span className="text-xs text-muted">{(c.members / 1000).toFixed(1)}K</span></button></li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <SectionTitle eyebrow="Live projects" icon={Rocket} title="Built by this community" />
          {state.projects.slice(0, 3).map((p) => (
            <button key={p.id} onClick={() => go('projects', { memberProjectId: p.id })} className="block w-full rounded-xl p-2 text-left hover:bg-paper">
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="text-xs text-muted">{p.contributors.length} contributors • {p.status}</p>
            </button>
          ))}
        </section>
      </aside>
    </div>
  );
}

function MemberIdeas({ me }) {
  const { state, dispatch, intel } = useStore();
  const tab = state.memberIdeasTab || 'trending';
  const community = state.memberIdeasCommunity || 'all';
  const list = useMemo(() => {
    let l = state.ideas.filter((i) => i.status !== 'archived');
    if (community !== 'all') l = l.filter((i) => i.communityId === community);
    if (tab === 'skills') l = l.filter((i) => i.status === 'open' && i.needs.some((n) => n !== 'Feedback' && roleMatchesNeed(me.role, n)));
    if (tab === 'saved') l = l.filter((i) => state.saved[i.id]);
    if (tab === 'mine') l = l.filter((i) => i.authorId === me.id || i.volunteers.some((v) => v.memberId === me.id));
    const sorter = tab === 'new' ? (a, b) => a.daysAgo - b.daysAgo : tab === 'skills' ? (a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score : (a, b) => b.supports - a.supports;
    return [...l].sort(sorter);
  }, [state.ideas, state.saved, tab, community, me, intel]);
  const set = (patch) => dispatch({ type: 'NAV', patch });
  return (
    <div>
      <PageHeader icon={Lightbulb} eyebrow="Idea board" title={<>Community <Grad>ideas</Grad></>} description="Support what you want to see, offer help where you can." className="mb-2" />
      <div className="my-5 flex flex-wrap items-center gap-3">
        <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-line-2 p-1">
          {[['trending', '🔥 Trending'], ['new', '🆕 New'], ['skills', `🤝 Needs a ${me.role.toLowerCase()}`], ['saved', '🔖 Saved'], ['mine', '✨ Mine']].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => set({ memberIdeasTab: id })} className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition', tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
        <label htmlFor="m-comm" className="sr-only">Community</label>
        <select id="m-comm" value={community} onChange={(e) => set({ memberIdeasCommunity: e.target.value })} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
          <option value="all">All communities</option>
          {state.communities.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>
      {list.length ? <div className="grid gap-3 md:grid-cols-2">{list.map((i) => <IdeaCard key={i.id} idea={i} mode="member" />)}</div>
        : <Empty icon={Bookmark} title="Nothing here yet" text={tab === 'saved' ? 'Save ideas with the bookmark icon to find them later.' : 'Try another filter.'} />}
    </div>
  );
}

function MemberCommunities({ me }) {
  const { state, dispatch } = useStore();
  return (
    <div>
      <PageHeader icon={Boxes} eyebrow="Spaces" title={<>Your <Grad>communities</Grad></>} description="Join the spaces that match what you care about and what you can contribute." className="mb-2" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.communities.map((c) => {
          const joined = me.communities.includes(c.id);
          const n = state.ideas.filter((i) => i.communityId === c.id).length;
          return (
            <article key={c.id} className="card flex flex-col p-5">
              <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
              <h2 className="mt-3 font-display text-lg font-semibold text-ink"><button onClick={() => dispatch({ type: 'NAV', patch: { communityId: c.id, communityTab: 'feed' } })} className="hover:text-accent">{c.name}</button></h2>
              <p className="text-sm text-muted">{c.members.toLocaleString('en-US')} members • {n} ideas</p>
              <p className="mt-2 flex-1 text-sm text-ink-2">{c.description}</p>
              <Button variant="ghost" size="sm" className="mt-3 justify-start px-0 text-accent" onClick={() => dispatch({ type: 'NAV', patch: { communityId: c.id, communityTab: 'feed' } })}>Open community →</Button>
              <Button className="mt-2" variant={joined ? 'secondary' : 'primary'} icon={joined ? Check : Plus} onClick={() => dispatch({ type: 'JOIN_COMMUNITY', communityId: c.id })} aria-pressed={joined}>{joined ? 'Joined' : 'Join'}</Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MemberProjects() {
  const { state, dispatch } = useStore();
  const p = state.projects.find((x) => x.id === state.memberProjectId);
  if (p) return <ProjectDetail project={p} memberMode onBack={() => dispatch({ type: 'NAV', patch: { memberProjectId: null } })} />;
  return (
    <div>
      <PageHeader icon={FolderKanban} eyebrow="Idea → action" title={<>Community <Grad>projects</Grad></>} description={`Community ideas that ${CREATOR.firstName} turned into real projects.`} className="mb-2" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {state.projects.map((pr) => {
          const pct = Math.round((pr.tasks.filter((t) => t.done).length / Math.max(1, pr.tasks.length)) * 100);
          return (
            <button key={pr.id} onClick={() => dispatch({ type: 'NAV', patch: { memberProjectId: pr.id } })} className="card card-hover p-5 text-left">
              <Chip tone="mint" icon={Rocket}>{pr.status}</Chip>
              <h2 className="mt-2 font-display text-lg font-semibold text-ink">{pr.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{pr.description}</p>
              <div className="mt-4"><Bar value={pct} color="bg-mint" /></div>
              <p className="mt-2 text-xs text-muted">{pr.contributors.length} contributors • {pct}% done • started {ago(pr.createdDaysAgo)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberPeople() {
  const { state } = useStore();
  const [role, setRole] = useState('All');
  const people = [...state.members].filter((m) => m.id !== state.meId && (role === 'All' || m.role === role)).sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 18);
  return (
    <div>
      <PageHeader icon={Users} eyebrow="Collaborators" title={<>Find your <Grad>people</Grad></>} description="Top contributors in the community — find collaborators for your ideas." className="mb-2" />
      <div className="no-scrollbar my-5 flex gap-1.5 overflow-x-auto">
        {['All', 'Developer', 'Designer', 'Founder', 'Marketer', 'Video Editor', 'Writer', 'Investor', 'Student'].map((r) => (
          <button key={r} onClick={() => setRole(r)} aria-pressed={role === r} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition', role === r ? 'bg-ink text-white' : 'border border-line bg-white text-ink-2')}>{r}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{people.map((m) => <PersonCard key={m.id} member={m} />)}</div>
    </div>
  );
}

function MemberProfile({ me }) {
  const { state } = useStore();
  const score = contributionScore(me);
  const mine = state.ideas.filter((i) => i.authorId === me.id);
  const helping = state.ideas.filter((i) => i.volunteers.some((v) => v.memberId === me.id));
  const supported = state.ideas.filter((i) => state.supported[i.id]).length;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-accent via-[#9b4bf0] to-coral" />
        <div className="-mt-10 p-6">
          <Avatar name={me.name} size={80} ring />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">{me.name}</h1>
          <p className="text-sm text-muted">{me.role} • {me.handle}</p>
          <div className="mt-3 flex flex-wrap gap-1">{me.skills.map((s) => <Chip key={s} tone="accent">{s}</Chip>)}{me.interests.map((s) => <Chip key={s}>{s}</Chip>)}</div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Contribution score', score], ['Ideas shared', mine.length], ['Helping on', helping.length], ['Supported', supported]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-paper p-4"><p className="font-display text-2xl font-semibold text-ink">{v}</p><p className="text-xs text-muted">{k}</p></div>
            ))}
          </div>
        </div>
      </div>
      <section className="mt-6">
        <SectionTitle eyebrow="Your activity" icon={Lightbulb} title="Ideas & contributions" />
        <div className="space-y-3">
          {[...mine, ...helping.filter((h) => !mine.includes(h))].map((i) => <IdeaCard key={i.id} idea={i} mode="member" />)}
          {!mine.length && !helping.length && <Empty icon={Lightbulb} title="No contributions yet" text="Share an idea or click “I can help” on one to start building your score." />}
        </div>
      </section>
    </div>
  );
}
