'use client';

import { useMemo } from 'react';
import { Sparkles, Lightbulb, Users, Inbox, Boxes, ArrowRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { buildBrief, hoursAgo } from '../../lib/ai';
import { CREATOR } from '../../lib/seed';
import { Button, SectionTitle, cx } from '../ui';
import { IdeaCard, PersonRow, useOpen } from '../shared';
import { Aurora } from '../chrome';
import { StatTile } from '../controls';
import GettingStarted, { CopyInviteButton, useInviteLink } from './GettingStarted';
import PriorityList from './Priority';
import ActivityFeed from './ActivityFeed';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// First-run experience: shown on the dashboard until the community has its first member or idea.
// Turns an empty dashboard into a clear, premium "here's how to start" moment.
function FirstRun({ firstName, go }) {
  const inviteLink = useInviteLink();
  return (
    <div className="space-y-6">
      <section aria-label="Welcome" className="relative animate-fade-up overflow-hidden rounded-[28px] bg-night p-6 text-white shadow-pop sm:p-9">
        <Aurora tone="dark" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white/80"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Welcome to FanOS</p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-[40px]">{greeting()}, <span className="ai-gradient-animated">{firstName}</span> 👋</h1>
          <p className="mt-3 text-[15px] text-white/70">Your community is ready — it just needs its first members. Copy your invite link below and share it with your audience. Follow the steps underneath and you’re set.</p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/[.07] p-2 backdrop-blur-xl sm:flex sm:items-center sm:gap-2">
            <code className="block min-w-0 flex-1 truncate rounded-xl bg-black/20 px-3.5 py-2.5 text-sm text-white/90">{inviteLink || 'Loading your invite link…'}</code>
            <CopyInviteButton className="mt-2 w-full shrink-0 bg-white text-ink hover:bg-white/90 sm:mt-0 sm:w-auto" />
          </div>
        </div>
      </section>

      <GettingStarted go={go} />
    </div>
  );
}

export default function Dashboard({ go, ask }) {
  const { state, intel } = useStore();
  const open = useOpen();
  // Greet the signed-in user by their own first name; fall back to the creator brand.
  const firstName = (state.user?.name || '').trim().split(' ')[0] || CREATOR.firstName;
  const brief = useMemo(() => buildBrief(state, intel), [state, intel]);
  const totalMembers = state.members.length;
  const joinedThisWeek = state.members.filter((m) => (m.joinedDaysAgo ?? 99) < 7).length;
  const newIdeas = state.ideas.filter((i) => (i.daysAgo ?? 99) < 7).length;
  const realOpps = intel.opps.filter((o) => !o.ai.isSpam && o.status !== 'archived').sort((a, b) => b.ai.priority - a.ai.priority);
  const high = realOpps.filter((o) => o.ai.priority >= 50);
  const topIdeas = intel.ranked.filter((i) => i.status === 'open').slice(0, 3);
  const newest = [...state.members].sort((a, b) => (a.joinedDaysAgo ?? 99) - (b.joinedDaysAgo ?? 99)).slice(0, 4);
  const runAction = (a) => {
    if (!a) return;
    if (a.idea) open.idea(a.idea);
    else if (a.member) open.member(a.member);
    else if (a.ask) ask?.(a.ask);
    else if (a.to) go(a.to);
  };

  // Brand-new community (no members and no ideas yet): show the first-run guide instead of
  // an empty data dashboard. All hooks above have already run, so this early return is safe.
  if (totalMembers === 0 && state.ideas.length === 0) return <FirstRun firstName={firstName} go={go} />;

  const summary = joinedThisWeek || newIdeas
    ? `${joinedThisWeek} new member${joinedThisWeek === 1 ? '' : 's'} and ${newIdeas} new idea${newIdeas === 1 ? '' : 's'} this week.`
    : 'A quiet week so far. Share your invite link to bring more people in.';

  return (
    <div className="space-y-6">
      <section aria-label="Today" className="relative animate-fade-up overflow-hidden rounded-[28px] bg-night p-6 text-white shadow-pop sm:p-8">
        <Aurora tone="dark" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-white/55">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-[38px]">{greeting()}, <span className="ai-gradient-animated">{firstName}</span></h1>
            <p className="mt-2 max-w-md text-[15px] text-white/70">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyInviteButton label="Copy invite link" className="bg-white text-ink hover:bg-white/90" />
            <Button variant="ghost" icon={Lightbulb} onClick={() => go('ideas')} className="text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white">Review ideas</Button>
          </div>
        </div>
      </section>

      <GettingStarted go={go} />

      <section aria-label="Community metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label="Members" value={totalMembers.toLocaleString('en-US')} sub={joinedThisWeek ? `+${joinedThisWeek} this week` : 'None new this week'} tone="accent" onClick={() => go('people')} />
        <StatTile icon={Lightbulb} label="Ideas" value={state.ideas.length.toLocaleString('en-US')} sub={newIdeas ? `${newIdeas} new this week` : 'None new this week'} tone="amber" onClick={() => go('ideas')} />
        <StatTile icon={Boxes} label="Communities" value={state.communities.length} sub={`${state.projects.length} project${state.projects.length === 1 ? '' : 's'} running`} tone="sky" onClick={() => go('communities')} />
        <StatTile icon={Inbox} label="Opportunities" value={realOpps.length} sub={high.length ? `${high.length} high priority` : 'Nothing urgent'} tone="coral" onClick={() => go('opportunities')} />
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <section className="card p-5 sm:p-6">
            <SectionTitle eyebrow="Today" icon={Sparkles} title="Needs your attention" action={<Button size="sm" variant="ghost" onClick={() => go('brief')}>Full brief <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>} />
            <PriorityList items={brief.things} limit={4} onAction={runAction} empty="You’re all caught up. New insights appear as members share ideas." />
          </section>

          <section>
            <SectionTitle eyebrow="Best of your community" icon={Lightbulb} title="Top ideas" action={<Button size="sm" variant="ghost" onClick={() => go('ideas')}>All ideas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>} />
            <div className="space-y-3">
              {topIdeas.length ? topIdeas.map((i, k) => <IdeaCard key={i.id} idea={i} rank={k + 1} />)
                : <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No open ideas yet. They show up here ranked as soon as members share them.</p>}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-6 xl:col-span-4">
          <section className="card p-5">
            <SectionTitle eyebrow="Just joined" icon={Users} title="New members" action={<Button size="sm" variant="ghost" onClick={() => go('people')}>All</Button>} />
            <div className="-mx-2">
              {newest.map((m) => <PersonRow key={m.id} member={m} why={`${m.role}${m.city && m.city !== '—' ? ` · ${m.city}` : ''}`} right={<span className="text-[11px] text-muted">{(m.joinedDaysAgo ?? 99) === 0 ? 'today' : `${m.joinedDaysAgo}d ago`}</span>} />)}
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle eyebrow="Inbox" icon={Inbox} title={high.length ? `${high.length} high priority` : 'Opportunities'} action={<Button size="sm" variant="ghost" onClick={() => go('opportunities')}>Open</Button>} />
            {realOpps.length ? (
              <ul className="-mx-2 space-y-0.5">
                {realOpps.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <button onClick={() => go('opportunities', { openOppId: o.id })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-paper">
                      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold', o.ai.priority >= 70 ? 'bg-accent text-white' : 'bg-accent-soft text-accent')}>{o.ai.priority}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{o.subject}</span>
                        <span className="block truncate text-xs text-muted">{o.ai.category} · {hoursAgo(o.hoursAgo)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Brand deals, collaborations and invitations will appear here, already sorted.</p>}
          </section>

          {state.activity.length > 0 && (
            <section className="card p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><span className="live-dot h-2 w-2 rounded-full bg-mint" aria-hidden="true" /> Live activity</p>
              <p className="mb-2 mt-1 text-sm text-ink-2">What your community did recently</p>
              <ActivityFeed items={state.activity.slice(0, 5)} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
