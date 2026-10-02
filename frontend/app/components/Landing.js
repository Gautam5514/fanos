'use client';

import { ArrowRight, Sparkles, Users, Lightbulb, Layers, Handshake, Rocket, MessageSquare, Crown, UserPlus, Play } from 'lucide-react';
import { useStore } from '../lib/store';
import { CREATOR, SCALE } from '../lib/seed';
import { Avatar, Button, Logo, cx } from './ui';
import { TestimonialCard, useAllFeedback } from './validation';
import { FlaskConical, ShieldCheck } from 'lucide-react';

const FLOW = [
  ['Followers', Users, 'An unstructured crowd'],
  ['Communities', Layers, 'Organized by interest & skill'],
  ['Ideas', Lightbulb, 'Structured contributions'],
  ['AI Signals', Sparkles, 'Noise → what matters'],
  ['Collaboration', Handshake, 'The right people, matched'],
  ['Action', Rocket, 'Projects & promotion'],
];

const DMS = [
  ['I have an idea for you 🙏', '2m'], ['Can we collaborate?', '4m'], ['I can design this!!', '6m'], ['Please make a video about AI agents', '7m'],
  ['I built something your audience might like', '9m'], ['🔥 GROW 10K FOLLOWERS FAST', '11m'], ['I’m a developer, can I help?', '12m'], ['Brand partnership inquiry', '15m'],
];

export default function Landing() {
  const { state, dispatch, intel, startDemo, auth } = useStore();
  const feedback = useAllFeedback();
  const testimonials = feedback.filter((f) => f.consentPublish && f.quote);
  // Demo = browser sandbox with seeded data; Get started = real account (live mode).
  const enterCreator = (patch = {}) => startDemo(patch);
  const enterMember = () => startDemo({ view: state.mode === 'demo' && state.meId ? 'member' : 'onboarding' });
  const getStarted = (role = 'member') => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'signup', authRole: role } });
  const user = state.mode === 'live' ? state.user : null;
  const openMine = () => dispatch({ type: 'NAV', patch: { view: user.role === 'creator' ? (state.creator?.claimed ? 'creator' : 'creator-setup') : (state.meId ? 'member' : 'onboarding') } });
  const challenge = state.ideas.find((i) => i.title === '30-Day AI Builder Challenge');
  const story = [
    ['The problem', 'Thousands of unread DMs. Gold buried in noise.', () => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })],
    ['FanOS dashboard', `AI found ${7} things worth your attention.`, () => enterCreator()],
    ['Trend', `${intel.clusters[0]?.requests ?? 59} members want an AI agent course.`, () => enterCreator({ creatorPage: 'ideas', ideasTab: 'clusters' })],
    ['Idea', `30-Day AI Builder Challenge — ${challenge?.supports ?? 428} supporters.`, () => enterCreator({ modal: challenge ? { type: 'idea', id: challenge.id } : null })],
    ['Talent', 'Find designers who contributed in the last 30 days.', () => enterCreator({ creatorPage: 'people', peopleQuery: 'Find designers who have contributed useful ideas in the last 30 days' })],
    ['Action', 'Turn the idea into a project with an AI-picked team.', () => enterCreator({ modal: challenge && challenge.status === 'open' ? { type: 'project', id: challenge.id } : null, creatorPage: challenge?.status === 'open' ? 'dashboard' : 'projects' })],
    ['Amplify', 'Promote it to the wider audience with AI-written posts.', () => enterCreator({ modal: challenge ? { type: 'promote', id: challenge.id } : null })],
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={FlaskConical} className="hidden sm:inline-flex" onClick={() => dispatch({ type: 'NAV', patch: { view: 'validation' } })}>Creator tests</Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => auth.logout()}>Log out</Button>
              <Button variant="primary" size="sm" onClick={openMine}>{user.role === 'creator' ? 'Open my dashboard' : 'Open my community'}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'login' } })}>Log in</Button>
              <Button variant="primary" size="sm" onClick={() => getStarted()}>Get started</Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 text-center sm:pt-16">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent/20 via-[#c06bff]/10 to-coral/20 blur-3xl" />
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-medium text-ink-2 shadow-sm"><Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> The operating system for your audience</p>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-7xl">
          Turn your audience into a community that <span className="ai-gradient-text">builds with you.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-2">
          Organize followers, discover valuable ideas, find talented people and turn community activity into real action.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {user
            ? <Button variant="primary" size="lg" icon={user.role === 'creator' ? Crown : UserPlus} onClick={openMine}>{user.role === 'creator' ? 'Open my dashboard' : 'Open my community'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            : <Button variant="primary" size="lg" icon={Crown} onClick={() => getStarted()}>Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>}
          <Button variant="secondary" size="lg" icon={Play} onClick={() => enterCreator()}>View Demo</Button>
        </div>
        <p className="mt-4 text-sm text-muted">Demo uses sample data in your browser. <button onClick={enterMember} className="font-medium text-accent hover:underline">Try the member side</button> • <button onClick={() => getStarted('creator')} className="font-medium text-accent hover:underline">Create a creator account</button></p>

        {/* Flow */}
        <ol className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="How FanOS works">
          {FLOW.map(([label, Icon, sub], i) => (
            <li key={label} className="card relative p-4 text-left animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', i === 5 ? 'bg-ink text-white' : i === 3 ? 'bg-gradient-to-br from-accent to-coral text-white' : 'bg-accent-soft text-accent')}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <p className="mt-3 font-display font-semibold text-ink">{label}</p>
              <p className="text-xs text-muted">{sub}</p>
              {i < 5 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-1 text-muted shadow lg:block" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      {/* Problem vs solution */}
      <section id="problem" className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2">
        <div className="card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-coral">Today</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{SCALE.rawInbox.toLocaleString('en-US')} unread messages</h2>
          <p className="mt-1 text-sm text-muted">Creators don’t have an audience problem. They have an organization problem.</p>
          <ul className="mt-5 space-y-1.5" aria-label="Example inbox">
            {DMS.map(([t, time], i) => (
              <li key={t} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2" style={{ opacity: 1 - i * 0.08 }}>
                <MessageSquare className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="flex-1 truncate text-sm text-ink-2">{t}</span>
                <span className="text-[11px] text-muted">{time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ai-border ai-glow rounded-[18px] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-accent">With FanOS</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">AI found 7 things worth your attention</h2>
          <p className="mt-1 text-sm text-muted">{SCALE.members.toLocaleString('en-US')} members, structured by interests, skills and goals.</p>
          <ul className="mt-5 space-y-2">
            {[
              ['🔥', `${intel.clusters[0]?.requests ?? 59} members are asking for an AI Agent Course`, 'Trend'],
              ['💡', `30-Day AI Builder Challenge — Signal ${intel.scored.get(challenge?.id)?.score ?? 87}/100`, 'Idea'],
              ['🤝', `${challenge?.volunteers.length ?? 31} skilled members offered to help`, 'Talent'],
              ['💼', 'Flowdesk — $12,000 brand partnership', 'Opportunity'],
              ['🌟', 'Priya Sharma — designer, joined 18 days ago', 'Hidden gem'],
            ].map(([e, t, tag]) => (
              <li key={t} className="flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm">
                <span aria-hidden="true">{e}</span><span className="flex-1 text-sm font-medium text-ink">{t}</span><span className="text-[11px] text-muted">{tag}</span>
              </li>
            ))}
          </ul>
          <Button variant="accent" className="mt-5 w-full" icon={Sparkles} onClick={() => enterCreator()}>See the creator dashboard</Button>
        </div>
      </section>

      {/* Real creator validation — only real submissions are shown */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Real influencer validation</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink">{testimonials.length ? `Tested with ${feedback.length} real creator${feedback.length === 1 ? '' : 's'}` : 'Tested with real creators'}</h2>
            {feedback.length > 0 && <p className="mt-1 text-ink-2">Combined reach {(feedback.reduce((s, f) => s + (f.tester.followers || 0), 0) / 1000).toFixed(0)}K followers • average usefulness {(feedback.reduce((s, f) => s + (f.ratings?.overall || 0), 0) / feedback.length).toFixed(1)}/5</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => dispatch({ type: 'NAV', patch: { view: 'validation' } })}>See all results</Button>
            <Button variant="primary" icon={FlaskConical} onClick={() => dispatch({ type: 'NAV', patch: { view: 'test-start' } })}>Run a creator test</Button>
          </div>
        </div>
        {testimonials.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">{testimonials.slice(0, 4).map((t) => <TestimonialCard key={t.id} entry={t} />)}</div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 p-8 text-center">
            <p className="font-display font-semibold text-ink">No creator testimonials yet</p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-muted">Run a 10-minute session with a real creator. Their ratings, quote and video link appear here automatically — only with their permission.</p>
          </div>
        )}
      </section>

      {/* Demo story */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Play className="h-3.5 w-3.5" aria-hidden="true" /> Guided demo</p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-ink">One story, seven scenes</h2>
              <p className="mt-1 text-ink-2">Followers → Organized Communities → Ideas → Collaboration → Action.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted"><Avatar name={CREATOR.name} size={28} /> Starring {CREATOR.name}, {CREATOR.platforms.map((p) => `${Math.round(p.followers / 1000)}K ${p.name}`).join(' • ')}</div>
          </div>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {story.map(([title, text, fn], i) => (
              <li key={title}>
                <button onClick={fn} className="card group flex h-full w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40">
                  <span className="font-display text-sm font-semibold text-accent">Scene {i + 1}</span>
                  <span className="mt-1 font-display text-lg font-semibold text-ink">{title}</span>
                  <span className="mt-1 flex-1 text-sm text-ink-2">{text}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink group-hover:text-accent">Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs text-muted sm:flex-row">
        <Logo size={22} />
        <p>Discord organizes conversations. FanOS organizes the value hidden inside an audience.</p>
      </footer>
    </div>
  );
}
