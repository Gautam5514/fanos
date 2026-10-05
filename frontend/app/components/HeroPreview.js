'use client';

// Landing-page illustration of the creator dashboard. It deliberately uses fixed
// sample values (below) and never reads app data: real dashboards start empty.
import {
  ArrowRight, Bell, Boxes, FolderKanban, LayoutDashboard, Lightbulb, Lock, Newspaper, Search, Sparkles, TrendingUp, Users,
} from 'lucide-react';
import { fmt } from '../lib/ai';
import { Avatar, AvatarStack, ScoreRing, Sparkline, cx } from './ui';

const SAMPLE = {
  creator: { name: 'gautam Kumar', firstName: 'gautam', handle: '@gautam.builds' },
  members: 48291, membersThisWeek: 1204, ideasThisWeek: 384, spamFiltered: 1312,
  signal: { title: '30-Day AI Builder Challenge', score: 87, supports: 428, volunteers: 31 },
  helpers: ['Priya Sharma', 'Arjun Mehta', 'Sara Khan', 'Leo Park', 'Meera Nair'],
  clusters: [['AI Agent Course', 59], ['Weekly build streams', 41], ['Notion templates pack', 27], ['Creator monetization', 19]],
  ideas: [['Beginner course on building AI agents', 88, 412, 'AI'], ['Free AI tool directory', 85, 386, 'AI'], ['Community startup directory', 76, 248, 'Startup']],
  gems: [['Priya Sharma', 'Designer', 18], ['Arjun Mehta', 'Developer', 34], ['Ishaan Bose', 'Student', 22]],
};

const NAV = [
  [LayoutDashboard, 'Dashboard'], [Newspaper, 'Community Brief'], [Lightbulb, 'Ideas', 6], [Bell, 'Opportunities', 7],
  [Users, 'People'], [Boxes, 'Communities'], [FolderKanban, 'Projects'],
];

function Panel({ className, children }) {
  return <div className={cx('rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(20,19,26,.04)] sm:p-5', className)}>{children}</div>;
}

function Label({ icon: Icon, children, tone = 'text-muted' }) {
  return <p className={cx('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em]', tone)}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{children}</p>;
}

export default function HeroPreview({ onOpen }) {
  const { creator: CREATOR, clusters, helpers, signal } = SAMPLE;
  const score = signal.score;
  const volunteers = signal.volunteers;
  const ideaRows = SAMPLE.ideas;
  const gemRows = SAMPLE.gems;
  const stats = [
    ['Members', fmt(SAMPLE.members), `+${fmt(SAMPLE.membersThisWeek)} this week`, [12, 14, 13, 17, 19, 22, 26, 31], '#5b3df5'],
    ['Ideas this week', fmt(SAMPLE.ideasThisWeek), 'structured', [8, 11, 9, 14, 13, 18, 21, 24], '#ff5a36'],
    ['Collab requests', '179', '4 rising contributors', [4, 6, 5, 8, 9, 8, 12, 14], '#2577e8'],
    ['Spam filtered', fmt(SAMPLE.spamFiltered), 'auto-hidden', [5, 7, 6, 9, 8, 11, 10, 13], '#0e9f63'],
  ];
  const first = CREATOR.firstName;

  return (
    <div className="relative mx-auto mt-16 max-w-[1240px] animate-fade-up text-left [animation-delay:200ms] sm:mt-20">
      <div aria-hidden="true" className="absolute -inset-x-16 -bottom-16 top-16 -z-10 rounded-[64px] bg-gradient-to-r from-accent/30 via-[#c06bff]/25 to-coral/30 blur-3xl" />
      <div className="rounded-[26px] border border-white/70 bg-white/60 p-2 shadow-pop ring-1 ring-ink/5 backdrop-blur-xl">
        <div className="overflow-hidden rounded-[20px] border border-line bg-paper">
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
            <span className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></span>
            <span className="mx-auto hidden items-center gap-1.5 rounded-lg bg-paper px-4 py-1 text-xs text-muted sm:flex"><Lock className="h-3 w-3" aria-hidden="true" /> fanos.app</span>
            <span className="ml-auto flex items-center gap-2 sm:ml-0">
              <span className="hidden sm:inline-flex"><AvatarStack names={helpers.slice(0, 3)} size={24} /></span>
              <span className="rounded-full bg-ink px-3.5 py-1 text-xs font-medium text-white">Share</span>
            </span>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white p-3 lg:flex">
              <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-paper p-2.5">
                <Avatar name={CREATOR.name} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{CREATOR.name}</p>
                  <p className="truncate text-[11px] text-muted">{CREATOR.handle}</p>
                </div>
              </div>
              {NAV.map(([Icon, label, count], i) => (
                <div key={label} className={cx('mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px]', i === 0 ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-2')}>
                  <Icon className="h-4 w-4" aria-hidden="true" />{label}
                  {count && <span className="ml-auto rounded-full bg-line-2 px-1.5 text-[10px] font-semibold text-ink-2">{count}</span>}
                </div>
              ))}
              <div className="mt-auto rounded-xl bg-gradient-to-br from-accent to-[#9b3ff0] p-3.5 text-white shadow-[0_12px_28px_-12px_rgba(91,61,245,.7)]">
                <p className="flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI brief ready</p>
                <p className="mt-1 text-[12px] leading-snug text-white/80">7 things need your attention this week.</p>
              </div>
            </aside>

            <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted">Good morning,</p>
                  <p className="truncate font-display text-2xl font-semibold text-ink">{first} 👋</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs text-muted md:flex"><Search className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Ask anything about your community…</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-medium text-mint"><span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" /> Live</span>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map(([label, value, sub, data, color], i) => (
                  <Panel key={label} className={cx(i > 1 && 'hidden sm:block')}>
                    <p className="text-xs text-muted">{label}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-[28px] font-semibold leading-none text-ink">{value}</p>
                        <p className="mt-1.5 truncate text-[11px] text-muted">{sub}</p>
                      </div>
                      <span className="hidden shrink-0 xl:block"><Sparkline data={data} width={80} height={30} color={color} /></span>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Signal + trends */}
              <div className="grid gap-3 md:grid-cols-12">
                <button type="button" onClick={onOpen} className="ai-border ai-glow group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 md:col-span-7">
                  <Label icon={Sparkles} tone="text-accent">Top signal</Label>
                  <div className="mt-3 flex items-center gap-4">
                    <ScoreRing score={score} size={68} stroke={6} />
                    <div className="min-w-0">
                      <p className="font-display text-xl font-semibold leading-tight text-ink">{signal.title}</p>
                      <p className="mt-1 text-sm text-muted">{fmt(signal.supports)} supporters • {volunteers} offered to help</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {['Developer', 'Designer', 'Video Editor'].map((n) => <span key={n} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-line">Needs {n}</span>)}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <AvatarStack names={helpers.slice(0, 4)} size={28} extra={Math.max(0, volunteers - 4)} />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-accent">Make it a project <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  </div>
                </button>
                <Panel className="md:col-span-5">
                  <Label icon={TrendingUp}>Trending requests</Label>
                  <ul className="mt-3 space-y-3">
                    {clusters.map(([label, n], i) => (
                      <li key={label}>
                        <div className="flex items-center justify-between gap-2 text-[13px]"><span className="truncate font-medium text-ink">{label}</span><span className="shrink-0 tabular-nums text-muted">{n}</span></div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-2"><div className={cx('h-full rounded-full', i === 0 ? 'bg-gradient-to-r from-accent to-coral' : 'bg-accent/35')} style={{ width: `${Math.max(12, (n / clusters[0][1]) * 100)}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              {/* Ideas + people */}
              <div className="hidden gap-3 sm:grid md:grid-cols-12">
                <Panel className="md:col-span-7">
                  <Label icon={Lightbulb}>Ideas worth your attention</Label>
                  <ul className="mt-3 divide-y divide-line">
                    {ideaRows.map(([title, s, supports, tag]) => (
                      <li key={title} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <ScoreRing score={s} size={36} stroke={3.5} />
                        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{title}</p>
                        <span className="hidden shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent sm:inline">{tag}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">♥ {supports}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel className="md:col-span-5">
                  <Label icon={Users}>Hidden gems</Label>
                  <ul className="mt-3 space-y-2.5">
                    {gemRows.map(([name, role, days]) => (
                      <li key={name} className="flex items-center gap-3">
                        <Avatar name={name} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
                          <p className="truncate text-[11px] text-muted">{role} • joined {days} days ago</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] font-medium text-ink-2">Invite</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
