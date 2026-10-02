'use client';

import { useState } from 'react';
import { Crown, UserPlus, Mail, Lock, User, KeyRound, ArrowLeft, Camera, PlaySquare, AtSign, Sparkles, Check, Zap, Users2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { CREATOR } from '../lib/seed';
import { Button, Logo, cx } from './ui';

const field = 'h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10';

function Field({ id, label, icon: Icon, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id={id} className={field} {...props} />
      </div>
    </div>
  );
}

export function AuthScreen() {
  const { state, dispatch, auth, startDemo } = useStore();
  const [tab, setTab] = useState(state.authTab || 'signup');
  const [role, setRole] = useState(state.authRole || 'member');
  const [f, setF] = useState({ name: '', email: '', password: '', creatorCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (tab === 'signup') await auth.signup({ ...f, role });
      else await auth.login({ email: f.email, password: f.password });
    } catch (err) {
      setError(err.status ? err.message : 'Cannot reach the FanOS server. Use “View demo” instead.');
    } finally { setBusy(false); }
  };

  const perks = [
    { icon: Zap, text: 'AI surfaces your best ideas automatically' },
    { icon: Users2, text: 'Turn followers into a community that builds' },
    { icon: Sparkles, text: 'Spot talent and launch projects together' },
  ];

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(91,61,245,0.45), transparent 55%), radial-gradient(130% 130% at 100% 100%, rgba(255,90,54,0.35), transparent 55%)' }}
          aria-hidden="true"
        />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl font-semibold leading-tight text-white">
            Turn your audience into a <span className="ai-gradient-text">community that builds</span> with you.
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon className="h-4.5 w-4.5 text-white" aria-hidden="true" /></span>
                <span className="text-[15px]">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">Followers → Communities → Ideas → AI Insights → Action</p>
      </aside>

      {/* Form side */}
      <div className="flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-5 lg:max-w-lg">
          <div className="lg:hidden"><Logo /></div>
          <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="ml-auto inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 lg:max-w-lg">
          {state.serverError && <p role="alert" className="mb-4 rounded-2xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm text-ink">⚠️ {state.serverError}</p>}

          <div className="animate-fade-up">
            <h1 className="font-display text-3xl font-semibold text-ink">{tab === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-2 text-ink-2">{tab === 'signup' ? 'Join in seconds — just your name, email and a password.' : 'Log in to your FanOS community.'}</p>
          </div>

          <div className="card mt-6 p-6 animate-fade-up sm:p-8">
            <div role="tablist" aria-label="Sign up or log in" className="grid grid-cols-2 gap-1 rounded-xl bg-line-2 p-1">
              {[['signup', 'Create account'], ['login', 'Log in']].map(([id, l]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(''); }} className={cx('rounded-lg py-2 text-sm font-medium transition', tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>{l}</button>
              ))}
            </div>

            {tab === 'signup' && (
              <fieldset className="mt-6">
                <legend className="text-sm font-medium text-ink">I am a…</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[['member', 'Community Member', UserPlus, `Join ${CREATOR.firstName}’s community`], ['creator', 'Creator', Crown, 'Run my community']].map(([id, l, Icon, sub]) => (
                    <button key={id} type="button" aria-pressed={role === id} onClick={() => setRole(id)}
                      className={cx('relative rounded-2xl border p-4 text-left transition', role === id ? 'border-accent bg-accent-soft ring-4 ring-accent/10' : 'border-line hover:border-ink/25')}>
                      {role === id && <Check className="absolute right-3 top-3 h-4 w-4 text-accent" aria-hidden="true" />}
                      <Icon className={cx('h-5 w-5', role === id ? 'text-accent' : 'text-muted')} aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-ink">{l}</p>
                      <p className="text-xs text-muted">{sub}</p>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              {tab === 'signup' && <Field id="a-name" label="Your name" icon={User} value={f.name} onChange={set('name')} maxLength={60} autoComplete="name" placeholder="e.g. Aditi Rao" required />}
              <Field id="a-email" label="Email" icon={Mail} type="email" value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" placeholder="you@example.com" required />
              <Field id="a-pass" label="Password" icon={Lock} type="password" value={f.password} onChange={set('password')} minLength={tab === 'signup' ? 8 : undefined} maxLength={200} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'} required />
              {tab === 'signup' && role === 'creator' && (
                <div>
                  <Field id="a-code" label="Creator access code" icon={KeyRound} value={f.creatorCode} onChange={set('creatorCode')} maxLength={100} placeholder="Only if a creator already exists" />
                  <p className="mt-1 text-xs text-muted">The first creator account claims this community — no code needed.</p>
                </div>
              )}
              {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? 'Please wait…' : tab === 'signup' ? 'Create account' : 'Log in'}</Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              {tab === 'signup' ? 'Already have an account? ' : 'New here? '}
              <button type="button" onClick={() => { setTab(tab === 'signup' ? 'login' : 'signup'); setError(''); }} className="font-medium text-accent hover:underline">
                {tab === 'signup' ? 'Log in' : 'Create one'}
              </button>
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-muted">Just looking? <button onClick={() => startDemo()} className="font-medium text-accent hover:underline">View the demo</button> — no account needed.</p>
        </main>
      </div>
    </div>
  );
}

export function CreatorSetup() {
  const { state, dispatch, auth } = useStore();
  const c = state.creator?.claimed ? state.creator : null;
  const [f, setF] = useState({
    name: c?.name || state.user?.name || '', handle: c?.handle || '', niche: c?.niche || '',
    ig: c?.platforms?.find((p) => p.name === 'Instagram')?.followers || '', yt: c?.platforms?.find((p) => p.name === 'YouTube')?.followers || '', x: c?.platforms?.find((p) => p.name === 'X')?.followers || '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ok = f.name.trim().length >= 2;
  const save = (e) => {
    e.preventDefault();
    if (!ok) return;
    const platforms = [['Instagram', f.ig], ['YouTube', f.yt], ['X', f.x]].filter(([, n]) => Number(n) > 0).map(([name, n]) => ({ name, followers: Number(n) }));
    dispatch({ type: 'SET_CREATOR', creator: { name: f.name.trim(), handle: f.handle.trim(), niche: f.niche.trim(), platforms: platforms.length ? platforms : state.creator.platforms } });
    dispatch({ type: 'NAV', patch: { view: 'creator', creatorPage: 'dashboard' } });
  };
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <button onClick={() => auth.logout()} className="text-sm text-muted hover:text-ink">Log out</button>
      </header>
      <main className="mx-auto max-w-xl px-6 pb-16 pt-4">
        <form onSubmit={save} className="animate-fade-up">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Creator profile</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Set up your community</h1>
          <p className="mt-2 text-ink-2">This is what your followers see when they join. Sample community activity is pre-loaded so your dashboard isn’t empty — real members appear as they sign up.</p>
          <div className="card mt-6 space-y-4 p-6">
            <Field id="c-name" label="Name *" icon={User} value={f.name} onChange={set('name')} maxLength={60} required />
            <Field id="c-handle" label="Handle" icon={AtSign} value={f.handle} onChange={set('handle')} maxLength={40} placeholder="@yourhandle" />
            <Field id="c-niche" label="Niche" icon={Sparkles} value={f.niche} onChange={set('niche')} maxLength={80} placeholder="AI, startups & building in public" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="c-ig" label="Instagram followers" icon={Camera} type="number" min="0" value={f.ig} onChange={set('ig')} />
              <Field id="c-yt" label="YouTube subscribers" icon={PlaySquare} type="number" min="0" value={f.yt} onChange={set('yt')} />
              <Field id="c-x" label="X followers" icon={AtSign} type="number" min="0" value={f.x} onChange={set('x')} />
            </div>
          </div>
          <Button type="submit" variant="accent" size="lg" className="mt-6" disabled={!ok}>Save & open dashboard</Button>
        </form>
      </main>
    </div>
  );
}
