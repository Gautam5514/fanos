'use client';

import { useMemo } from 'react';
import { Sparkles, Flame, Lightbulb, Users, Inbox, Boxes, ArrowRight, Star, Gem, Newspaper, MessageSquareText, Layers, Target, TrendingUp } from 'lucide-react';
import { useStore } from '../../lib/store';
import { buildBrief, contributionScore, hiddenGems, trends, fmt, hoursAgo } from '../../lib/ai';
import { CREATOR } from '../../lib/seed';
import { Avatar, Button, SectionTitle, Sparkline, cx } from '../ui';
import { ClusterCard, IdeaCard, PersonRow, useOpen, clusterHelpers } from '../shared';
import { Aurora } from '../chrome';
import DrawnArrow from '../DrawnArrow';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard({ go, ask }) {
  const { state, intel } = useStore();
  const open = useOpen();
  const brief = useMemo(() => buildBrief(state, intel), [state, intel]);
  const t = trends(state.ideas);
  const gems = hiddenGems(state.members);
  const people = [...state.members].sort((a, b) => contributionScore(b) - contributionScore(a)).slice(0, 3);
  const realOpps = intel.opps.filter((o) => !o.ai.isSpam && o.status !== 'archived').sort((a, b) => b.ai.priority - a.ai.priority);
  const high = realOpps.filter((o) => o.ai.priority >= 50);
  const topIdeas = intel.ranked.filter((i) => i.status === 'open').slice(0, 3);
  const topCluster = intel.clusters[0];
  const rising = state.members.filter((m) => m.growth >= 100).length;
  const helpers = topCluster ? clusterHelpers(topCluster, state.members) : null;
  const totalMembers = state.members.length;
  const joinedThisWeek = state.members.filter((m) => (m.joinedDaysAgo ?? 99) < 7).length;
  const totalComments = state.ideas.reduce((n, i) => n + (i.commentsCount || 0), 0);
  const totalSupports = state.ideas.reduce((n, i) => n + (i.supports || 0), 0);
  const collabRequests = state.ideas.filter((i) => i.status === 'open').reduce((n, i) => n + i.volunteers.length, 0);
  const topTopic = t[0];
  const risingMember = brief.people[0];
  const topOpenCluster = intel.clusters[0];
  const clusterHelpersCount = topOpenCluster ? clusterHelpers(topOpenCluster, state.members).total : 0;

  return (
    <div className="space-y-6">
      {/* Command center: greeting + the noise → signal pipeline in one dark banner */}
      <section aria-label="Today in your community" className="relative animate-fade-up overflow-hidden rounded-[28px] bg-night p-6 text-white shadow-pop sm:p-8">
        <Aurora tone="dark" />
        <div className="relative grid items-center gap-7 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <p className="text-sm text-white/55">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-[40px]">{greeting()}, <span className="ai-gradient-animated">{CREATOR.firstName}</span> 👋</h1>
            <p className="mt-2 max-w-md text-[15px] text-white/70">
              FanOS analyzed <b className="font-semibold text-white">{brief.analyzed.toLocaleString('en-US')}</b> activities since yesterday and found <b className="font-semibold text-white">{brief.things.length} things worth your attention</b>.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button arrow onClick={() => go('brief')} className="bg-white text-ink hover:bg-white/90">Read today’s brief</Button>
              <Button variant="ghost" pill icon={Sparkles} onClick={() => ask('Summarize this week')} className="text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white">Summarize</Button>
            </div>
          </div>

          <ol aria-label="Noise to signal" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-x-9">
            {[
              { n: totalComments.toLocaleString('en-US'), l: 'Comments', s: `${totalSupports.toLocaleString('en-US')} supports`, icon: MessageSquareText },
              { n: state.ideas.length.toLocaleString('en-US'), l: 'Ideas shared', s: 'by your members', icon: Lightbulb },
              { n: intel.clusters.length, l: 'Topic clusters', s: 'duplicates merged', icon: Layers },
              { n: brief.things.length, l: 'Need you', s: 'ranked by Signal', icon: Target, hl: true },
            ].map((x, i) => (
              <li key={x.l} className={cx('relative rounded-xl px-2.5 py-2 ring-1', x.hl ? 'bg-gradient-to-br from-accent via-[#8a3df0] to-coral ring-white/20 shadow-[0_14px_32px_-12px_rgba(176,63,240,.8)]' : 'bg-white/[.06] ring-white/10')}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-[20px] font-semibold leading-none">{x.n}</p>
                  <x.icon className={cx('h-3.5 w-3.5', x.hl ? 'text-white' : 'text-white/50')} aria-hidden="true" />
                </div>
                <p className="mt-1.5 text-[13px] font-medium leading-tight">{x.l}</p>
                <p className={cx('truncate text-[10px]', x.hl ? 'text-white/80' : 'text-white/45')}>{x.s}</p>
                {i < 3 && <DrawnArrow variant="wave" tone="light" delay={0.3 + i * 0.3} className="absolute -right-[42px] top-1/2 z-10 hidden h-6 w-10 -translate-y-1/2 sm:block" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* KPIs */}
      <section aria-label="Community metrics" className="grid grid-cols-2 gap-3 sm:gap-x-11 lg:grid-cols-4">
        {[
          { label: 'Members', value: totalMembers.toLocaleString('en-US'), sub: totalMembers ? `${joinedThisWeek} joined this week` : 'share your invite link', icon: Users, to: 'people', tile: 'tile-accent', chip: 'bg-accent-soft text-accent' },
          { label: 'Communities', value: state.communities.length, sub: 'interest-based', icon: Boxes, to: 'communities', tile: 'tile-sky', chip: 'bg-sky-soft text-sky' },
          { label: 'Collaboration requests', value: collabRequests, sub: `${rising} rising contributors`, icon: TrendingUp, to: 'ideas', tile: 'tile-mint', chip: 'bg-mint-soft text-mint' },
          { label: 'Opportunities', value: realOpps.length, sub: `${high.length} high-priority`, icon: Inbox, to: 'opportunities', tile: 'tile-coral', chip: 'bg-coral-soft text-coral' },
        ].map((k, i) => (
          <button key={k.label} onClick={() => go(k.to)} className={cx('tile group relative px-3.5 py-3 text-left', k.tile)}>
            <div className="relative flex items-center gap-3">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition group-hover:scale-110', k.chip)}><k.icon className="h-4 w-4" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="font-display text-[22px] font-semibold leading-none text-ink">{k.value}</p>
                <p className="mt-1 truncate text-xs font-medium text-ink-2">{k.label}</p>
              </div>
            </div>
            <p className="relative mt-2 truncate text-[11px] text-muted">{k.sub}</p>
            {i < 3 && <DrawnArrow variant="wave" delay={1.3 + i * 0.3} className="absolute -right-[46px] top-1/2 z-10 hidden h-7 w-11 -translate-y-1/2 lg:block" />}
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {/* AI Signals */}
          <section className="card p-5 sm:p-6">
            <SectionTitle eyebrow="AI Signals" icon={Flame} title="What’s moving in your community" action={<Button size="sm" variant="ghost" onClick={() => ask('What topics are trending?')}>Ask why →</Button>} />
            {topCluster && (
              <button onClick={() => go('ideas', { ideasTab: 'clusters' })} className="mb-5 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-coral-soft to-accent-soft p-4 text-left transition hover:brightness-[.98]">
                <span className="text-3xl" aria-hidden="true">🔥</span>
                <span className="flex-1">
                  <span className="block font-display text-lg font-semibold text-ink">{topCluster.requests} members are asking for “{topCluster.label}”</span>
                  <span className="mt-0.5 block text-sm text-ink-2">Trending request • {topCluster.supporters.toLocaleString('en-US')}+ people interested • <b className="font-semibold text-mint">{helpers.builders} developers/designers want to help</b> • {topCluster.items.length} ideas merged by AI</span>
                </span>
                <ArrowRight className="h-5 w-5 text-ink-2" aria-hidden="true" />
              </button>
            )}
            {!topCluster && !t.length && (
              <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Nothing is trending yet. Topics appear here as soon as members share ideas.</p>
            )}
            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {t.slice(0, 6).map((x) => (
                <li key={x.topic} className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{x.topic}</span>
                    <span className="text-xs text-muted">{x.thisWeek} idea{x.thisWeek === 1 ? '' : 's'} this week</span>
                  </span>
                  <Sparkline data={x.spark} width={80} height={26} color={x.change >= 0 ? '#5b3df5' : '#ff5a36'} />
                  <span className={cx('w-14 text-right text-sm font-semibold', x.change >= 0 ? 'text-mint' : 'text-coral')}>{x.change >= 0 ? '↑' : '↓'}{Math.abs(x.change)}%</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Ideas worth attention */}
          <section>
            <SectionTitle eyebrow="Ranked by AI Signal Score" icon={Lightbulb} title="Ideas worth your attention" action={<Button size="sm" variant="ghost" onClick={() => go('ideas')}>All ideas →</Button>} />
            <div className="space-y-3">
              {topIdeas.map((i, k) => <IdeaCard key={i.id} idea={i} rank={k + 1} />)}
            </div>
          </section>

          {/* Clusters */}
          <section>
            <SectionTitle eyebrow="Noise → signal" icon={Layers} title="Duplicate requests, merged" action={<Button size="sm" variant="ghost" onClick={() => go('ideas', { ideasTab: 'clusters' })}>All clusters →</Button>} />
            <div className="grid gap-4 lg:grid-cols-2">
              {intel.clusters.slice(0, 2).map((c) => <ClusterCard key={c.id} cluster={c} />)}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6 xl:col-span-4">
          <section className="card p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Newspaper className="h-3.5 w-3.5" aria-hidden="true" /> Weekly AI Brief</p>
            <p className="mt-1 text-sm text-muted">{brief.analyzed.toLocaleString('en-US')} community activities analyzed</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Top topic', topTopic ? `${topTopic.topic} (${topTopic.thisWeek} this week)` : '—', () => ask('What topics are trending?')],
                ['Top idea', brief.topIdeas[0]?.title || '—', () => brief.topIdeas[0] && open.idea(brief.topIdeas[0].id)],
                ['Rising member', risingMember ? `${risingMember.name} — ${risingMember.role}` : '—', () => risingMember && open.member(risingMember.id)],
                ['Community opportunity', topOpenCluster ? `${clusterHelpersCount} members want to work on “${topOpenCluster.label}”` : '—', () => go('ideas', { ideasTab: 'clusters' })],
              ].map(([k, v, fn]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd><button onClick={fn} className="text-left font-medium text-ink hover:text-accent">{v}</button></dd>
                </div>
              ))}
            </dl>
            <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => go('brief')}>View full insights</Button>
          </section>
          <section className="ai-border ai-glow rounded-[18px] p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ask FanOS AI</p>
            <p className="mt-2 font-display text-lg font-semibold text-ink">Search your audience like a database.</p>
            <div className="mt-3 space-y-1.5">
              {['What does my audience want me to make next?', 'Find React developers interested in AI', 'What topics are trending?'].map((q) => (
                <button key={q} onClick={() => ask(q)} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-white hover:text-ink">
                  {q}<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle eyebrow="People to notice" icon={Star} title="Top contributors" action={<Button size="sm" variant="ghost" onClick={() => go('people')}>All →</Button>} />
            <div className="-mx-2">{people.map((m) => <PersonRow key={m.id} member={m} why={`${m.role} • ${m.stats.ideas} ideas • ${m.stats.projects} projects`} />)}</div>
            <div className="mt-4 border-t border-line-2 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent"><Gem className="h-3.5 w-3.5" aria-hidden="true" /> Hidden gems — AI-discovered</p>
              <div className="space-y-2">
                {gems.slice(0, 2).map((g) => (
                  <button key={g.member.id} onClick={() => open.member(g.member.id)} className="flex w-full gap-3 rounded-xl bg-paper p-3 text-left transition hover:bg-accent-soft/40">
                    <Avatar name={g.member.name} size={36} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{g.member.name} <span className="font-normal text-muted">• {g.member.role}</span></span>
                      <span className="block text-xs text-ink-2">{g.reason}</span>
                      <span className="mt-1 block text-[11px] text-muted">Only {fmt(g.member.socialFollowers)} social followers</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle eyebrow="Opportunities" icon={Inbox} title={`${high.length} high-priority`} action={<Button size="sm" variant="ghost" onClick={() => go('opportunities')}>Inbox →</Button>} />
            <ul className="space-y-1">
              {realOpps.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <button onClick={() => go('opportunities', { openOppId: o.id })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-paper">
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold', o.ai.priority >= 70 ? 'bg-accent text-white' : 'bg-accent-soft text-accent')}>{o.ai.priority}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{o.subject}</span>
                      <span className="block truncate text-xs text-muted">{o.ai.category} • {o.from.org || o.from.name} • {hoursAgo(o.hoursAgo)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {state.activity.length > 0 && (
            <section className="card p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><span className="live-dot h-2 w-2 rounded-full bg-mint" aria-hidden="true" /> Live activity</p>
              <ul className="space-y-2">
                {state.activity.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <button disabled={!a.ideaId} onClick={() => a.ideaId && open.idea(a.ideaId)} className="text-left text-sm text-ink-2 enabled:hover:text-accent disabled:cursor-default">{a.text}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
