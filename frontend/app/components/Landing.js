'use client';

import {
  ArrowRight, Sparkles, Layers, MessageSquare, LogIn,
  ShieldCheck, Search, Megaphone, FolderKanban, Bot, Gauge,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Button, Logo, ScoreRing, cx } from './ui';
import HowItWorks from './HowItWorks';
import Hero, { TiltOnScroll } from './Hero';
import HeroPreview from './HeroPreview';
import SiteFooter from './SiteFooter';

const DMS = [
  ['I have an idea for you 🙏', '2m'], ['Can we collaborate?', '4m'], ['I can design this!!', '6m'], ['Please make a video about AI agents', '7m'],
  ['I built something your audience might like', '9m'], ['🔥 GROW 10K FOLLOWERS FAST', '11m'], ['I’m a developer, can I help?', '12m'], ['Brand partnership inquiry', '15m'],
];

const FEATURES = [
  [Gauge, 'AI Signal Score', 'Every idea is scored on demand, momentum, talent and fit - so the best ones rise on their own.', 'sm:col-span-2'],
  [Layers, 'Similar-idea clustering', '59 people asking for the same thing becomes one clear trend, not 59 messages.', ''],
  [Search, 'People discovery', 'Ask in plain English: “designers who contributed in the last 30 days”.', ''],
  [FolderKanban, 'Idea → project', 'Pick an idea, get an AI-recommended team, then track tasks and updates together.', ''],
  [Megaphone, 'AI promotion posts', 'Instagram, X, LinkedIn and community posts written from the real idea and its supporters.', ''],
  [Bot, 'Creator copilot', 'A weekly AI brief plus answers to any question about your community.', 'lg:col-span-2'],
  [ShieldCheck, 'Spam & duplicate guard', 'Low-effort and promo spam is caught before it reaches you.', 'lg:col-span-2'],
];


const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

function Eyebrow({ icon: Icon, children, tone = 'text-accent', center }) {
  return (
    <p className={cx('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em]', center && 'justify-center', tone)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{children}
    </p>
  );
}

export default function Landing() {
  const { state, dispatch, auth } = useStore();
  const getStarted = (role = 'member') => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'signup', authRole: role } });
  const logIn = () => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'login' } });
  const user = state.user;
  // The app routes unfinished accounts to /setup or /onboarding automatically.
  const openMine = () => dispatch({ type: 'NAV', patch: user.role === 'creator' ? { view: 'creator', creatorPage: 'dashboard' } : { view: 'member', memberPage: 'home' } });
  const primaryCta = user
    ? <Button variant="primary" size="lg" arrow onClick={openMine} className="shadow-lg shadow-ink/20">{user.role === 'creator' ? 'Open my dashboard' : 'Open my community'}</Button>
    : <Button variant="primary" size="lg" arrow onClick={() => getStarted()} className="shadow-lg shadow-ink/20">Get started free</Button>;

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {[['how', 'How it works'], ['problem', 'Why FanOS'], ['features', 'Features']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="rounded-full px-3.5 py-1.5 text-sm text-ink-2 transition hover:bg-line-2 hover:text-ink">{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <Button variant="ghost" size="sm" pill onClick={() => auth.logout()}>Log out</Button>
                <Button variant="primary" size="sm" arrow onClick={openMine}>{user.role === 'creator' ? 'Dashboard' : 'My community'}</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" pill onClick={logIn}>Log in</Button>
                <Button variant="primary" size="sm" arrow onClick={() => getStarted()}>Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-x-clip px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
        <Hero
          primaryCta={primaryCta}
          onBadge={() => scrollTo('features')}
          onSecondary={() => scrollTo('how')}
        />

        <TiltOnScroll>
          <HeroPreview onOpen={() => getStarted('creator')} />
        </TiltOnScroll>
        <p className="mt-6 text-sm text-muted">
          Illustration with sample data. Your dashboard starts empty and fills with your real community. <button onClick={() => getStarted('member')} className="font-medium text-accent hover:underline">Joining as a fan?</button>
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow icon={Sparkles} center>How it works</Eyebrow>
            <h2 className="mt-2 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">From followers to finished projects</h2>
            <p className="mt-3 text-ink-2">Six steps, one flow. FanOS does the sorting so you can do the building.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Problem vs solution */}
      <section id="problem" className="scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow tone="text-coral" center>The problem</Eyebrow>
            <h2 className="mt-2 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">You don’t have an audience problem. You have an organization problem.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="card relative min-w-0 overflow-hidden p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow tone="text-muted">Without FanOS</Eyebrow>
                <span className="rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-semibold text-coral">2,836 unread</span>
              </div>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">An inbox you’ll never finish</h3>
              <p className="mt-1 text-sm text-muted">Great ideas, real talent and paid deals - mixed with spam.</p>
              <ul className="mt-5 space-y-1.5" aria-label="Example inbox">
                {DMS.map(([t, time]) => (
                  <li key={t} className="flex min-w-0 items-center gap-3 rounded-xl bg-paper px-3 py-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{t}</span>
                    <span className="shrink-0 text-[11px] text-muted">{time}</span>
                  </li>
                ))}
              </ul>
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
            </div>
            <div className="ai-border ai-glow min-w-0 rounded-[18px] p-6 shadow-card sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow icon={Sparkles}>With FanOS</Eyebrow>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent">7 signals</span>
              </div>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">Only what’s worth your time</h3>
              <p className="mt-1 text-sm text-muted">Every member structured by interests, skills and goals.</p>
              <ul className="mt-5 space-y-2">
                {[
                  ['🔥', '59 members are asking for an AI Agent Course', 'Trend'],
                  ['💡', '30-Day AI Builder Challenge - Signal 87/100', 'Idea'],
                  ['🤝', '31 skilled members offered to help', 'Talent'],
                  ['💼', 'Flowdesk - $12,000 brand partnership', 'Opportunity'],
                  ['🌟', 'Priya Sharma - designer, joined 18 days ago', 'Hidden gem'],
                ].map(([e, t, tag]) => (
                  <li key={t} className="flex min-w-0 items-center gap-3 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm">
                    <span aria-hidden="true">{e}</span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">{t}</span>
                    <span className="hidden shrink-0 rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-medium text-ink-2 sm:inline">{tag}</span>
                  </li>
                ))}
              </ul>
              <Button variant="accent" className="mt-5 w-full" arrow onClick={() => getStarted('creator')}>Create your community</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <Eyebrow icon={Bot}>Features</Eyebrow>
            <h2 className="mt-2 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">An AI team that reads every message for you</h2>
            <p className="mt-3 text-ink-2">Everything a creator needs to go from a noisy audience to a community that ships.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([Icon, title, text, span], i) => (
              <div key={title} className={cx('card group relative overflow-hidden p-6 transition hover:-translate-y-0.5 hover:shadow-pop', span, i === 0 && 'ai-glow')}>
                <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', i === 0 ? 'bg-gradient-to-br from-accent to-coral text-white' : 'bg-accent-soft text-accent')}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
                {i === 0 && (
                  <div className="mt-5 flex items-center gap-4">
                    {[94, 87, 72, 58].map((s) => <ScoreRing key={s} score={s} size={44} stroke={4} />)}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => getStarted('creator')} className="group flex min-h-40 flex-col justify-between rounded-[18px] bg-ink p-6 sm:col-span-2 text-left text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
              <Sparkles className="h-6 w-6 text-[#b9a8ff]" aria-hidden="true" />
              <span>
                <span className="block font-display text-lg font-semibold">Start with your own community</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm text-white/70 group-hover:text-white">Create it free <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-night px-6 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[min(800px,100%)] -translate-x-1/2 rounded-full bg-gradient-to-r from-accent/50 via-[#c06bff]/40 to-coral/50 blur-3xl" />
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-balance font-display text-3xl font-semibold text-white sm:text-5xl">Your audience already has the ideas. Start building with them.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">Set up your community in minutes and share one link with your followers.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user
                ? <Button size="lg" arrow onClick={openMine} className="bg-white text-ink hover:bg-white/90">{user.role === 'creator' ? 'Open my dashboard' : 'Open my community'}</Button>
                : <Button size="lg" arrow onClick={() => getStarted('creator')} className="bg-white text-ink hover:bg-white/90">Create my community</Button>}
              {!user && <Button variant="ghost" size="lg" pill icon={LogIn} onClick={logIn} className="text-white/80 hover:bg-white/10 hover:text-white">Log in</Button>}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter scrollTo={scrollTo} onSignup={getStarted} onLogin={logIn} />
    </div>
  );
}
