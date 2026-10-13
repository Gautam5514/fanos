'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, PanelLeftClose, Lightbulb, Flame, Handshake, Rocket, Users, Star, Megaphone, Plus, Check, Trophy, Bookmark, Sparkles, Home, Boxes, FolderKanban, Heart, MessageCircle, LogOut, Mail, X, UserRound } from 'lucide-react';
import { useStore } from '../../lib/store';
import { contributionScore, roleMatchesNeed, ago } from '../../lib/ai';
import { CREATOR, ROLES } from '../../lib/seed';
import { Avatar, AvatarStack, Bar, Button, Chip, Empty, Logo, SectionTitle, cx } from '../ui';
import { Aurora, CollapsedLogoToggle, Grad, PageHeader, RailTip } from '../chrome';
import ProfileMenu from '../ProfileMenu';
import { IdeaCard, PersonCard, memberName, memberCount, useOpen } from '../shared';
import { ProjectDetail } from '../creator/Pages';
import CommunityPage from '../CommunityPage';
import Welcome from './Welcome';
import SearchPalette, { SearchTrigger } from '../SearchPalette';
import AiAssistant from '../AiAssistant';
import { AskAiButton } from '../AiParts';
import { ClearFilters, Dropdown, SearchField, Segmented, Toolbar, spaceOptions } from '../controls';
import { AiIcon, ROLE_ICON, SpaceIcon } from '../icons';

const TABS = [['home', 'Home', Home], ['ideas', 'Ideas', Lightbulb], ['communities', 'Communities', Boxes], ['projects', 'Projects', FolderKanban], ['people', 'People', Users]];

export default function MemberApp() {
  const { state, dispatch, auth } = useStore();
  const open = useOpen();
  const me = state.members.find((m) => m.id === state.meId);
  const page = state.memberPage;
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistant, setAssistant] = useState({ open: false, q: null }); // fan-side AI assistant
  const askAi = (q = null) => setAssistant({ open: true, q });
  // Collapsible sidebar: full labels <-> icon-only rail. Remembered per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('fanos_member_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem('fanos_member_sidebar_collapsed', n ? '1' : '0'); } catch { /* private mode */ } return n; });
  const go = (p, extra = {}) => { dispatch({ type: 'NAV', patch: { memberPage: p, ...(p === 'communities' ? { communityId: null } : {}), ...(p === 'projects' && !('memberProjectId' in extra) ? { memberProjectId: null } : {}), ...extra } }); window.scrollTo({ top: 0 }); };
  if (!me) return null;

  const mySpaces = state.communities.filter((c) => me.communities.includes(c.id));

  const renderSidebar = (mini) => (
    <nav aria-label="Member navigation" className={cx('flex h-full flex-col bg-night py-4 text-white', mini ? 'px-2' : 'px-3')}>
      <div className={cx('flex items-center', mini ? 'justify-center' : 'justify-between px-1')}>
        {mini ? <CollapsedLogoToggle onClick={toggleCollapsed} /> : (
          <>
            <Logo dark />
            <button onClick={toggleCollapsed} aria-label="Collapse sidebar" title="Collapse" className="rounded-lg p-1.5 text-white/50 transition hover:bg-night-2 hover:text-white">
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Whose community this is */}
      {CREATOR.name && (mini
        ? <div className="group relative mt-5 flex justify-center"><Avatar name={CREATOR.name} size={36} src={CREATOR.avatar} /><RailTip>{CREATOR.name}’s community</RailTip></div>
        : (
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-white/[.06] p-2.5 ring-1 ring-white/10">
            <Avatar name={CREATOR.name} size={36} src={CREATOR.avatar} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-[13px] font-semibold"><span className="truncate">{CREATOR.name}</span><BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#b9a8ff]" aria-label="Creator" /></p>
              <p className="truncate text-[11px] text-white/50">Community</p>
            </div>
          </div>
        ))}

      <ul className={cx('no-scrollbar mt-5 min-h-0 flex-1', mini ? 'space-y-1.5 overflow-visible' : 'space-y-0.5 overflow-y-auto')}>
        {TABS.map(([id, label, Icon]) => {
          const active = page === id;
          return (
            <li key={id}>
              <button onClick={() => go(id)} aria-current={active ? 'page' : undefined} aria-label={mini ? label : undefined}
                className={cx('group relative flex items-center text-[13px] transition', mini ? 'mx-auto h-11 w-11 justify-center rounded-2xl' : 'w-full gap-3 rounded-full px-3.5 py-2.5', active ? 'bg-white font-semibold text-ink shadow-[0_8px_20px_-10px_rgba(255,255,255,.5)]' : 'text-white/65 hover:bg-white/[.07] hover:text-white')}>
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />{!mini && label}{mini && <RailTip>{label}</RailTip>}
              </button>
            </li>
          );
        })}

        {!mini && mySpaces.length > 0 && (
          <>
            <li className="px-3.5 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Your spaces</li>
            {mySpaces.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button onClick={() => go('communities', { communityId: c.id, communityTab: 'feed' })} className={cx('flex w-full items-center gap-3 rounded-full px-3.5 py-2 text-[13px] transition', page === 'communities' && state.communityId === c.id ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/[.07] hover:text-white')}>
                  <SpaceIcon name={c.name} className="h-4 w-4 shrink-0" /><span className="truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </>
        )}
      </ul>

      <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
        {state.aiEnabled && (
          <button onClick={() => askAi()} aria-label={mini ? 'Ask AI' : undefined}
            className={cx('group relative flex items-center text-[13px] font-medium text-white/85 ring-1 ring-white/15 transition hover:bg-white/[.08] hover:text-white', mini ? 'mx-auto h-11 w-11 justify-center rounded-2xl' : 'w-full justify-center gap-2 rounded-full px-3 py-2.5')}>
            <AiIcon className="h-[18px] w-[18px] shrink-0 text-[#b9a8ff]" />{!mini && 'Ask AI'}{mini && <RailTip>Ask AI</RailTip>}
          </button>
        )}
        <button onClick={() => open.share()} aria-label={mini ? 'Share an idea' : undefined}
          className={cx('group relative flex items-center bg-gradient-to-r from-accent to-[#9b4bf0] text-[13px] font-semibold shadow-lg shadow-accent/25 transition hover:brightness-110', mini ? 'mx-auto h-11 w-11 justify-center rounded-2xl' : 'w-full justify-center gap-2 rounded-full px-3 py-2.5')}>
          <Plus className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />{!mini && 'Share an idea'}{mini && <RailTip>Share an idea</RailTip>}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="relative min-h-screen pb-20 lg:pb-0">
      <aside className={cx('fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-out lg:block', collapsed ? 'w-[72px]' : 'w-64')}>{renderSidebar(collapsed)}</aside>

      <div className={cx('relative transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Aurora className="h-[560px]" />
        <header className="glass sticky top-0 z-20 border-b border-line/70">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
            <div className="lg:hidden"><Logo iconOnly /></div>
            <div className="min-w-0 flex-1 sm:max-w-md"><SearchTrigger onClick={() => setSearchOpen(true)} placeholder="Search ideas, people, spaces…" /></div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="accent" size="sm" icon={Plus} className="lg:hidden" onClick={() => open.share()}>Share an Idea</Button>
              {state.aiEnabled && <AskAiButton onClick={() => askAi()} />}
              <ProfileMenu
                name={me.name}
                avatar={state.user?.avatar}
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

        <Welcome me={me} go={go} onShare={() => open.share()} />
        <SearchPalette open={searchOpen} setOpen={setSearchOpen} mode="member" onAsk={state.aiEnabled ? (q) => askAi(q) : undefined}
          pages={[['home', 'Home', Home], ['ideas', 'Ideas', Lightbulb], ['communities', 'Communities', Boxes], ['projects', 'Projects', FolderKanban], ['people', 'People', Users], ['profile', 'My profile', UserRound]].map(([id, label, icon]) => ({ id, label, icon, open: (extra) => go(id, extra) }))}
          actions={[...(state.aiEnabled ? [{ id: 'ai', label: 'Ask AI', hint: 'Ask anything about this community', icon: AiIcon, run: () => askAi() }] : []), { id: 'share', label: 'Share an idea', hint: `Tell ${CREATOR.firstName} what you’d love to see`, icon: Plus, run: () => open.share() }]} />
        <AiAssistant open={assistant.open} onClose={() => setAssistant({ open: false, q: null })} go={go} initialQuestion={assistant.q} />
        <main className="relative mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
          {page === 'home' && <MemberHome me={me} go={go} askAi={askAi} />}
          {page === 'ideas' && <MemberIdeas me={me} />}
          {page === 'communities' && (state.communityId
            ? <CommunityPage communityId={state.communityId} mode="member" onBack={() => dispatch({ type: 'NAV', patch: { communityId: null } })} />
            : <MemberCommunities me={me} />)}
          {page === 'projects' && <MemberProjects />}
          {page === 'people' && <MemberPeople />}
          {page === 'profile' && <MemberProfile me={me} />}
        </main>
      </div>

      <nav aria-label="Member navigation" className="glass fixed inset-x-0 bottom-0 z-20 flex border-t border-line/70 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', page === id ? 'text-accent' : 'text-muted')}>
            <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', page === id && 'bg-accent-soft')}><Icon className="h-5 w-5" aria-hidden="true" /></span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const STEPS_HIDE_KEY = 'fanos_member_steps_hidden';
const readFlag = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };

// Four small first steps for new members. Each completes by itself from real activity.
function FirstSteps({ me, go }) {
  const { state } = useStore();
  const open = useOpen();
  const [hidden, setHidden] = useState(() => readFlag(STEPS_HIDE_KEY));
  const supported = Object.values(state.supported || {}).some(Boolean);
  const offered = state.ideas.some((i) => i.volunteers.some((v) => v.memberId === me.id));
  const steps = [
    { id: 'idea', icon: Lightbulb, title: 'Share your first idea', text: `Tell ${CREATOR.firstName} what you’d love to see.`, done: (me.stats?.ideas || 0) > 0, cta: 'Share idea', run: () => open.share() },
    { id: 'support', icon: Heart, title: 'Support an idea', text: 'Back the ideas you want to see happen.', done: supported, cta: 'Browse ideas', run: () => go('ideas', { memberIdeasTab: 'trending' }) },
    { id: 'help', icon: Handshake, title: 'Offer your skills', text: 'Raise your hand where your skills fit.', done: offered, cta: 'Find ideas', run: () => go('ideas', { memberIdeasTab: 'skills' }) },
    { id: 'space', icon: Boxes, title: 'Join another space', text: 'Follow more topics you care about.', done: state.communities.length > 0 && me.communities.length >= state.communities.length, cta: 'See spaces', run: () => go('communities') },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  if (hidden || doneCount === steps.length) return null;
  const nextId = steps.find((x) => !x.done)?.id;
  return (
    <section aria-label="Your first steps" className="card animate-fade-up p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Your first steps</h2>
          <p className="mt-0.5 text-sm text-muted">{doneCount} of {steps.length} done</p>
        </div>
        <button type="button" onClick={() => { try { localStorage.setItem(STEPS_HIDE_KEY, '1'); } catch { /* private mode */ } setHidden(true); }} aria-label="Hide first steps" className="rounded-full p-1.5 text-muted transition hover:bg-line-2 hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="mt-3"><Bar value={(doneCount / steps.length) * 100} /></div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((st) => {
          const next = st.id === nextId;
          return (
            <li key={st.id} className={cx('flex items-center gap-3 rounded-2xl border p-3 transition', next ? 'border-accent/30 bg-accent-soft/50' : 'border-line bg-white', st.done && 'opacity-60')}>
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', st.done ? 'bg-mint text-white' : next ? 'bg-accent text-white' : 'bg-line-2 text-ink-2')}>
                {st.done ? <Check className="h-[18px] w-[18px]" aria-label="Done" /> : <st.icon className="h-[18px] w-[18px]" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-sm font-semibold text-ink', st.done && 'line-through decoration-ink/30')}>{st.title}</span>
                <span className="block truncate text-xs text-muted">{st.text}</span>
              </span>
              {!st.done && <button type="button" onClick={st.run} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition', next ? 'bg-accent text-white hover:brightness-110' : 'bg-line-2 text-ink-2 hover:bg-accent-soft hover:text-accent')}>{st.cta}</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MemberHome({ me, go, askAi }) {
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
  const first = me.name.split(' ')[0];
  const creatorName = CREATOR.name || 'your creator';
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-8">
        <section className="flex animate-fade-up items-center gap-4">
          <Avatar name={me.name} size={52} src={state.user?.avatar} ring />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold text-ink sm:text-3xl">Welcome back, <Grad>{first}</Grad></h1>
            <p className="truncate text-sm text-ink-2">{CREATOR.name ? `${creatorName}’s community` : 'Your community'}{myCommunities.length ? ` · ${myCommunities.length} space${myCommunities.length === 1 ? '' : 's'} joined` : ''}</p>
          </div>
        </section>

        {invites.length > 0 && (
          <section aria-label="Invitations" className="space-y-2">
            {invites.map((inv) => {
              const p = state.projects.find((x) => x.id === inv.projectId);
              return (
                <div key={inv.id} className="card flex flex-col gap-3 border-accent/30 bg-gradient-to-r from-accent-soft/70 to-white p-4 sm:flex-row sm:items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white"><Mail className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{creatorName} invited you to collaborate{p ? ` on “${p.name}”` : ''}</p>
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

        {/* One clear primary action */}
        <section className="ai-border ai-glow relative animate-fade-up rounded-[22px] p-4 sm:p-5" aria-label="Share an idea">
          <div className="flex items-start gap-3">
            <Avatar name={me.name} size={44} src={state.user?.avatar} />
            <button onClick={() => open.share()} className="group min-h-[56px] min-w-0 flex-1 rounded-2xl bg-white/85 px-4 py-2.5 text-left ring-1 ring-line transition hover:bg-white hover:ring-accent/40 hover:shadow-sm">
              <span className="block truncate text-[15px] text-ink-2">What would you love {CREATOR.firstName === 'your creator' ? 'to see built' : `${CREATOR.firstName} to build, teach or launch`}?</span>
              <span className="mt-0.5 block truncate text-xs text-muted">Members vote — the best ideas become real projects.</span>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Start from</span>
            {[['Course', 'Make a free beginner course on '], ['Live session', 'Host a live build session about '], ['Tool', 'Build a tool that automates '], ['Challenge', 'Run a community challenge to ']].map(([l, t]) => (
              <button key={l} onClick={() => open.share({ title: t })} className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-medium text-ink-2 transition hover:border-accent/40 hover:text-accent">{l}</button>
            ))}
            {state.aiEnabled && (
              <button onClick={() => askAi('Suggest an idea I could share, based on what this community wants')} className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"><AiIcon className="h-3.5 w-3.5" /> Ask AI for ideas</button>
            )}
            <button onClick={() => open.share()} className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-accent to-[#7a3df0] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(91,61,245,.55)] transition hover:-translate-y-px hover:brightness-110 active:scale-[.98]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Share idea
            </button>
          </div>
        </section>

        <FirstSteps me={me} go={go} />

        {state.ideas.length === 0 && (
          <Empty icon={Lightbulb} title="No ideas yet — be the first" text={`Share something you’d like ${CREATOR.firstName} to build, teach or launch. Members vote, and the best ideas become real projects.`} action={<Button variant="accent" icon={Plus} onClick={() => open.share()}>Share the first idea</Button>} />
        )}

        {(state.announcements.length > 0 || featured.length > 0) && (
          <section>
            <SectionTitle eyebrow={`Featured by ${CREATOR.firstName}`} icon={Star} title="From the creator" />
            <div className="space-y-3">
              {state.announcements.slice(0, 2).map((a) => (
                <article key={a.id} className="card border-amber/30 bg-gradient-to-br from-amber-soft/60 to-white p-5">
                  <div className="flex items-center gap-2"><Avatar name={CREATOR.name} size={28} src={CREATOR.avatar} /><p className="text-sm font-semibold text-ink">{CREATOR.name}</p><Chip tone="amber" icon={Megaphone}>Announcement</Chip></div>
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
            <button onClick={() => open.idea(trending.id)} className="card card-hover w-full p-5 text-left">
              <Chip tone="accent" icon={Flame}>#1 trending</Chip>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{trending.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{trending.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-line-2 pt-4 text-sm text-ink-2">
                <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-coral" aria-hidden="true" /> <b className="text-ink">{trending.supports}</b></span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden="true" /> <b className="text-ink">{trending.commentsCount}</b></span>
                <span className="inline-flex items-center gap-1.5"><Handshake className="h-4 w-4 text-mint" aria-hidden="true" /> <b className="text-ink">{trending.volunteers.length}</b> want to help</span>
                <span className="ml-auto"><AvatarStack names={trending.volunteers.slice(0, 4).map((v) => memberName(state, v.memberId))} size={24} extra={Math.max(0, trending.volunteers.length - 4)} /></span>
              </div>
            </button>
          </section>
        )}

        {state.ideas.length > 0 && (
          <section>
            <SectionTitle eyebrow="Picked for you" icon={Sparkles} title={`Ideas that need a ${me.role.toLowerCase()}`} action={<Button size="sm" variant="ghost" onClick={() => go('ideas', { memberIdeasTab: 'skills' })}>See all</Button>} />
            <div className="space-y-3">{forMe.length ? forMe.map((i) => <IdeaCard key={i.id} idea={i} mode="member" />) : <Empty icon={Lightbulb} title="Nothing for your skills yet" text="Ideas that need what you do will appear here." />}</div>
          </section>
        )}
      </div>

      <aside className="min-w-0 space-y-5 lg:col-span-4">
        <section className="card p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-muted"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Your progress</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-display text-4xl font-semibold leading-none text-ink">{score}</p>
            <p className="pb-0.5 text-xs text-muted">{score >= 500 ? 'Rising Contributor' : `${500 - score} pts to Rising Contributor`}</p>
          </div>
          <div className="mt-3"><Bar value={Math.min(100, (score / 500) * 100)} /></div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[['Ideas', me.stats?.ideas || 0], ['Helpful', me.stats?.helpful || 0], ['Projects', me.stats?.projects || 0]].map(([l, n]) => (
              <div key={l} className="rounded-xl bg-paper px-2 py-2"><dd className="font-display text-lg font-semibold text-ink">{n}</dd><dt className="text-[11px] text-muted">{l}</dt></div>
            ))}
          </dl>
        </section>

        <section className="card p-5 lg:hidden">
          <SectionTitle eyebrow="Your spaces" icon={Boxes} title={`${myCommunities.length} joined`} action={<Button size="sm" variant="ghost" onClick={() => go('communities')}>Manage</Button>} />
          {myCommunities.length ? (
            <ul className="-mx-2 space-y-0.5">
              {myCommunities.map((c) => (
                <li key={c.id}>
                  <button onClick={() => go('communities', { communityId: c.id, communityTab: 'feed' })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-paper">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><SpaceIcon name={c.name} className="h-[18px] w-[18px]" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted">{memberCount(state.members, c).toLocaleString('en-US')} {memberCount(state.members, c) === 1 ? 'member' : 'members'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">You haven’t joined a space yet.</p>}
        </section>

        {state.projects.length > 0 && (
          <section className="card p-5">
            <SectionTitle eyebrow="Built together" icon={Rocket} title="Live projects" action={<Button size="sm" variant="ghost" onClick={() => go('projects')}>All</Button>} />
            {state.projects.slice(0, 3).map((p) => (
              <button key={p.id} onClick={() => go('projects', { memberProjectId: p.id })} className="-mx-2 block w-[calc(100%+1rem)] rounded-xl p-2 text-left transition hover:bg-paper">
                <p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-muted">{p.contributors.length} contributors · {p.status}</p>
              </button>
            ))}
          </section>
        )}

        {CREATOR.name && (
          <section className="card flex items-center gap-3 p-4 lg:hidden">
            <Avatar name={CREATOR.name} size={44} src={CREATOR.avatar} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink"><span className="truncate">{CREATOR.name}</span><BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-label="Creator" /></p>
              <p className="truncate text-xs text-muted">{[CREATOR.handle, CREATOR.niche].filter(Boolean).join(' · ') || 'Community creator'}</p>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

function MemberIdeas({ me }) {
  const { state, dispatch, intel } = useStore();
  const tab = state.memberIdeasTab || 'trending';
  const community = state.memberIdeasCommunity || 'all';
  const [q, setQ] = useState('');
  const visible = useMemo(() => state.ideas.filter((i) => i.status !== 'archived'), [state.ideas]);
  const fitsMe = (i) => i.status === 'open' && i.needs.some((n) => n !== 'Feedback' && roleMatchesNeed(me.role, n));
  const isMine = (i) => i.authorId === me.id || i.volunteers.some((v) => v.memberId === me.id);
  const list = useMemo(() => {
    let l = visible;
    if (community !== 'all') l = l.filter((i) => i.communityId === community);
    if (tab === 'skills') l = l.filter(fitsMe);
    if (tab === 'saved') l = l.filter((i) => state.saved[i.id]);
    if (tab === 'mine') l = l.filter(isMine);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((i) => `${i.title} ${i.description} ${i.tags.join(' ')}`.toLowerCase().includes(t)); }
    const sorter = tab === 'new' ? (a, b) => a.daysAgo - b.daysAgo : tab === 'skills' ? (a, b) => intel.scored.get(b.id).score - intel.scored.get(a.id).score : (a, b) => b.supports - a.supports;
    return [...l].sort(sorter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, state.saved, tab, community, q, me, intel]);
  const set = (patch) => dispatch({ type: 'NAV', patch });
  const filtered = !!q || community !== 'all';
  return (
    <div>
      <PageHeader title={<>Community <Grad>ideas</Grad></>} description="Support what you want to see, and offer help where you can." />
      <Toolbar>
        <Segmented label="Idea views" value={tab} onChange={(v) => set({ memberIdeasTab: v })} options={[
          { value: 'trending', label: 'Trending', icon: Flame }, { value: 'new', label: 'New', icon: Sparkles },
          { value: 'skills', label: `Needs a ${me.role.toLowerCase()}`, icon: Handshake, count: visible.filter(fitsMe).length },
          { value: 'saved', label: 'Saved', icon: Bookmark, count: visible.filter((i) => state.saved[i.id]).length }, { value: 'mine', label: 'Mine', icon: Star, count: visible.filter(isMine).length },
        ]} />
        <SearchField value={q} onChange={setQ} placeholder="Search ideas…" label="Search ideas" className="min-w-[180px] flex-1 sm:max-w-xs" />
        <Dropdown label="Space" value={community} onChange={(v) => set({ memberIdeasCommunity: v })} options={spaceOptions(state.communities)} icon={Boxes} />
        <ClearFilters show={filtered} onClick={() => { setQ(''); set({ memberIdeasCommunity: 'all' }); }} />
      </Toolbar>
      {list.length ? <div className="grid gap-3 md:grid-cols-2">{list.map((i) => <IdeaCard key={i.id} idea={i} mode="member" />)}</div>
        : visible.length === 0 ? <Empty icon={Lightbulb} title="No ideas yet" text="Be the first to share something you’d like to see." />
        : <Empty icon={tab === 'saved' ? Bookmark : Lightbulb} title={tab === 'saved' ? 'Nothing saved yet' : tab === 'mine' ? 'You haven’t joined any idea yet' : 'No ideas here'} text={tab === 'saved' ? 'Tap the bookmark on an idea to find it here later.' : tab === 'mine' ? 'Share an idea or offer help on one and it will show up here.' : 'Try another view or clear the filters.'} />}
    </div>
  );
}

function MemberCommunities({ me }) {
  const { state, dispatch } = useStore();
  const [view, setView] = useState('joined'); // joined | discover
  const joinedList = state.communities.filter((c) => me.communities.includes(c.id));
  const discover = state.communities.filter((c) => !me.communities.includes(c.id));
  const shown = view === 'joined' ? joinedList : discover;
  const openSpace = (c) => dispatch({ type: 'NAV', patch: { communityId: c.id, communityTab: 'feed' } });
  return (
    <div>
      <PageHeader title={<>Your <Grad>communities</Grad></>} description="Spaces built around what you care about." />
      <Toolbar>
        <Segmented label="Communities" value={view} onChange={setView} options={[{ value: 'joined', label: 'Joined', icon: Check, count: joinedList.length }, { value: 'discover', label: 'Discover', icon: Boxes, count: discover.length }]} />
      </Toolbar>
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const joined = me.communities.includes(c.id);
            const n = state.ideas.filter((i) => i.communityId === c.id).length;
            return (
              <article key={c.id} onClick={() => openSpace(c)} className="card card-hover flex cursor-pointer flex-col p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><SpaceIcon name={c.name} className="h-6 w-6" /></span>
                <h2 className="mt-3 font-display text-lg font-semibold text-ink">{c.name}</h2>
                <p className="text-sm text-muted">{memberCount(state.members, c).toLocaleString('en-US')} {memberCount(state.members, c) === 1 ? 'member' : 'members'} · {n} {n === 1 ? 'idea' : 'ideas'}</p>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-2">{c.description}</p>
                <Button className="mt-4" variant={joined ? 'secondary' : 'primary'} icon={joined ? Check : Plus} aria-pressed={joined} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'JOIN_COMMUNITY', communityId: c.id }); }}>{joined ? 'Joined' : 'Join'}</Button>
              </article>
            );
          })}
        </div>
      ) : view === 'joined'
        ? <Empty icon={Boxes} title="You haven’t joined a community yet" text="Browse the spaces and join the ones that match your interests." action={<Button variant="accent" onClick={() => setView('discover')}>Discover communities</Button>} />
        : <Empty icon={Check} title="You’ve joined them all" text="New spaces will appear here when the creator adds them." />}
    </div>
  );
}

function MemberProjects() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('all');
  const p = state.projects.find((x) => x.id === state.memberProjectId);
  if (p) return <ProjectDetail project={p} memberMode onBack={() => dispatch({ type: 'NAV', patch: { memberProjectId: null } })} />;
  const active = state.projects.filter((x) => x.status !== 'Completed');
  const done = state.projects.filter((x) => x.status === 'Completed');
  const list = filter === 'active' ? active : filter === 'done' ? done : state.projects;
  return (
    <div>
      <PageHeader title={<>Community <Grad>projects</Grad></>} description={`Ideas that ${CREATOR.firstName === 'your creator' ? 'the creator' : CREATOR.firstName} turned into real projects.`} />
      {state.projects.length > 1 && (
        <Toolbar>
          <Segmented label="Project status" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: state.projects.length }, { value: 'active', label: 'In progress', icon: Rocket, count: active.length }, { value: 'done', label: 'Completed', icon: Check, count: done.length }]} />
        </Toolbar>
      )}
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((pr) => {
            const pct = Math.round((pr.tasks.filter((t) => t.done).length / Math.max(1, pr.tasks.length)) * 100);
            return (
              <button key={pr.id} onClick={() => dispatch({ type: 'NAV', patch: { memberProjectId: pr.id } })} className="card card-hover p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <Chip tone={pr.status === 'Completed' ? 'mint' : 'accent'} icon={pr.status === 'Completed' ? Check : Rocket}>{pr.status === 'Completed' ? 'Completed' : 'In progress'}</Chip>
                  <span className="font-display text-xl font-semibold text-ink tabular-nums">{pct}%</span>
                </div>
                <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">{pr.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{pr.description}</p>
                <div className="mt-4"><Bar value={pct} color="bg-mint" /></div>
                <p className="mt-2 text-xs text-muted">{pr.contributors.length} {pr.contributors.length === 1 ? 'person' : 'people'} · started {ago(pr.createdDaysAgo)}</p>
              </button>
            );
          })}
        </div>
      ) : state.projects.length === 0
        ? <Empty icon={Rocket} title="No projects yet" text="The most supported ideas become projects the community builds together. Support an idea you like." action={<Button variant="accent" icon={Lightbulb} onClick={() => dispatch({ type: 'NAV', patch: { memberPage: 'ideas' } })}>Browse ideas</Button>} />
        : <Empty icon={Rocket} title="Nothing here" text="No projects in this view." action={<Button variant="secondary" onClick={() => setFilter('all')}>Show all</Button>} />}
    </div>
  );
}

function MemberPeople() {
  const { state } = useStore();
  const [role, setRole] = useState('All');
  const [q, setQ] = useState('');
  const others = state.members.filter((m) => m.id !== state.meId);
  const people = others.filter((m) => (role === 'All' || m.role === role) && (!q.trim() || `${m.name} ${m.role} ${m.city} ${(m.skills || []).join(' ')}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 24);
  return (
    <div>
      <PageHeader title={<>Find your <Grad>people</Grad></>} description="Top contributors in the community — find collaborators for your ideas." />
      <Toolbar>
        <SearchField value={q} onChange={setQ} placeholder="Search by name, skill or city…" label="Search people" className="min-w-[200px] flex-1 sm:max-w-sm" />
        <Dropdown label="Role" showLabel value={role} onChange={setRole} icon={Users} options={[{ value: 'All', label: 'All roles' }, ...ROLES.filter((r) => r !== 'Other').map((r) => ({ value: r, label: r, icon: ROLE_ICON[r] }))]} />
        <ClearFilters show={!!q || role !== 'All'} onClick={() => { setQ(''); setRole('All'); }} />
      </Toolbar>
      {people.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{people.map((m) => <PersonCard key={m.id} member={m} />)}</div>
        : <Empty icon={Users} title={others.length ? 'No one matches' : 'You’re the first one here'} text={others.length ? 'Try a different name, skill or role.' : 'Other members will appear here as they join.'} />}
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
        <div className="h-24 bg-gradient-to-r from-accent to-[#9b4bf0]" />
        <div className="-mt-10 p-6">
          <Avatar name={me.name} size={80} ring src={state.user?.avatar} />
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
