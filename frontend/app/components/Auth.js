'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Crown, UserPlus, Mail, Lock, User, KeyRound, ArrowLeft, Camera, PlaySquare, AtSign, Sparkles, Check, Zap, Users2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { CREATOR } from '../lib/seed';
import { Avatar, Button, Logo, cx } from './ui';
import { Aurora, SplitShell } from './chrome';

const field = 'h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const COMMON_PW = new Set(['password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'iloveyou', 'letmein1', 'admin123', 'welcome1', 'passw0rd', 'abc12345']);

// Mirrors the backend passwordWeakness() rules so the user never gets a surprise 400.
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', reason: 'Enter a password', ok: false, tone: 'bg-line-2' };
  if (pw.length < 8) return { score: 1, label: 'Too short', reason: 'At least 8 characters', ok: false, tone: 'bg-coral' };
  if (COMMON_PW.has(pw.toLowerCase())) return { score: 1, label: 'Too common', reason: 'Pick something harder to guess', ok: false, tone: 'bg-coral' };
  if (/^(.)\1+$/.test(pw)) return { score: 1, label: 'Too weak', reason: 'Not a single repeated character', ok: false, tone: 'bg-coral' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 2) return { score: 1, label: 'Too weak', reason: 'Mix letters, numbers or symbols', ok: false, tone: 'bg-coral' };
  let s = 2;
  if (pw.length >= 12) s++;
  if (classes >= 3) s++;
  const map = { 2: { label: 'Fair', tone: 'bg-amber' }, 3: { label: 'Good', tone: 'bg-sky' }, 4: { label: 'Strong', tone: 'bg-mint' } };
  return { score: s, ok: true, reason: '', label: map[s]?.label || 'Good', tone: map[s]?.tone || 'bg-mint' };
}

function Field({ id, label, icon: Icon, trailing, invalid, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id={id} aria-invalid={invalid || undefined} className={cx(field, trailing && 'pr-11', invalid && 'border-coral/60 focus:border-coral focus:ring-coral/10')} {...props} />
        {trailing}
      </div>
    </div>
  );
}

// Shown on signup when a follower arrives through the creator's invite link (/join):
// who they're joining, loaded from the public community endpoint (no sign-in needed).
function InvitePreviewCard() {
  const [c, setC] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/public/community').then((r) => (r.ok ? r.json() : null)).then((d) => alive && setC(d)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!c) return <div className="mt-6 h-[92px] max-w-md animate-pulse rounded-2xl bg-line-2" aria-hidden="true" />;
  const name = c.creator?.name || 'the creator';
  const fmtN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
  return (
    <div className="relative mt-6 max-w-md overflow-hidden rounded-2xl border border-accent/20 bg-white p-4 shadow-card">
      <div aria-hidden="true" className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-accent/20 to-coral/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <Avatar name={name} size={44} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-accent">You’re invited to join</p>
          <p className="truncate font-display text-lg font-semibold text-ink">{c.creator ? `${name.split(' ')[0]}’s community` : 'This community'}</p>
          <p className="truncate text-xs text-muted">
            {[c.creator?.handle, c.creator?.niche, ...(c.creator?.platforms || []).map((p) => `${fmtN(p.followers)} on ${p.name}`)].filter(Boolean).join(' · ') || 'Share ideas, build projects and find collaborators'}
          </p>
        </div>
      </div>
      <p className="relative mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
        <span><b className="font-semibold text-ink">{c.members}</b> member{c.members === 1 ? '' : 's'}</span>
        <span><b className="font-semibold text-ink">{c.ideas}</b> idea{c.ideas === 1 ? '' : 's'}</span>
        {c.communities.length > 0 && <span className="truncate">{c.communities.slice(0, 3).map((x) => `${x.emoji} ${x.name}`).join('  ')}</span>}
      </p>
      {!c.ready && <p className="relative mt-2 text-xs text-amber">The creator is still setting things up — you can already create your account.</p>}
    </div>
  );
}

export function AuthScreen() {
  const { state, dispatch, auth } = useStore();
  // The tab lives in the store so the URL (/auth/login ↔ /auth/signup) and Back button stay in sync.
  const tab = state.authTab === 'signup' ? 'signup' : 'login';
  const [role, setRole] = useState(state.authRole || 'member');
  const [f, setF] = useState({ name: '', email: '', password: '', creatorCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const isSignup = tab === 'signup';
  const pw = useMemo(() => scorePassword(f.password), [f.password]);
  const emailValid = EMAIL_RE.test(f.email.trim());
  const nameValid = f.name.trim().length >= 2;
  // Signup needs every field valid; login just needs non-empty values.
  const canSubmit = isSignup
    ? nameValid && emailValid && pw.ok
    : f.email.trim().length > 0 && f.password.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!canSubmit) return;
    setError(''); setBusy(true);
    try {
      if (isSignup) await auth.signup({ ...f, email: f.email.trim(), role });
      else await auth.login({ email: f.email.trim(), password: f.password });
    } catch (err) {
      setError(err.status ? err.message : 'Cannot reach the FanOS server. Please try again in a moment.');
    } finally { setBusy(false); }
  };

  const switchTab = (next) => { dispatch({ type: 'NAV', patch: { authTab: next } }); setError(''); setTouched({}); };

  const glimpse = [
    ['🔥', 'See what your audience asks for most', 'Trends'],
    ['💡', 'Every idea gets an AI Signal Score', 'Ideas'],
    ['🤝', 'Find who can help, by real skills', 'Talent'],
  ];
  const perks = [
    { icon: Zap, text: 'AI surfaces your best ideas' },
    { icon: Users2, text: 'Followers become collaborators' },
    { icon: Sparkles, text: 'Launch projects together' },
  ];

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,520px)_1fr]">
      {/* ───────── Form side (left) ───────── */}
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <Aurora className="opacity-60 lg:hidden" />
        <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
          <Logo />
          <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-[13px] text-ink-2 backdrop-blur transition hover:border-ink/20 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </button>
        </header>

        <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 pb-10 sm:px-10">
          {state.serverError && <p role="alert" className="mb-5 rounded-2xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm text-ink">⚠️ {state.serverError}</p>}

          <div key={tab} className="animate-fade-up">
            <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] text-ink">{isSignup ? <>Create <span className="ai-gradient-animated">account</span></> : <>Welcome <span className="ai-gradient-animated">back</span></>}</h1>
            <p className="mt-2 max-w-sm text-[15px] text-ink-2">{isSignup ? 'Step into a community that builds with you — ideas, talent and projects in one place.' : 'Log in to your FanOS community and pick up where you left off.'}</p>
          </div>

          {state.viaInvite && isSignup && <InvitePreviewCard />}

          {/* Segmented control with sliding thumb */}
          <div role="tablist" aria-label="Sign up or log in" className="relative mt-7 grid grid-cols-2 rounded-full bg-line-2 p-1">
            <span aria-hidden="true" className={cx('absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]', isSignup ? 'translate-x-0' : 'translate-x-full')} />
            {[['signup', 'Create account'], ['login', 'Log in']].map(([id, l]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} className={cx('relative rounded-full py-2 text-sm font-medium transition-colors', tab === id ? 'text-ink' : 'text-muted hover:text-ink')}>{l}</button>
            ))}
          </div>

          {isSignup && !state.viaInvite && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-ink">I am a…</legend>
              <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
                {[['member', 'Fan / Member', UserPlus], ['creator', 'Creator', Crown]].map(([id, l, Icon]) => {
                  const on = role === id;
                  return (
                    <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setRole(id)}
                      className={cx('flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition', on ? 'border-accent bg-accent-soft text-accent ring-2 ring-accent/15' : 'border-line bg-white text-ink-2 hover:border-ink/20 hover:text-ink')}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{l}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <form onSubmit={submit} noValidate className="mt-6 max-w-md space-y-4">
            {isSignup && (
              <Field id="a-name" label="Your name" icon={User} value={f.name} onChange={set('name')} onBlur={blur('name')} invalid={touched.name && !nameValid} maxLength={60} autoComplete="name" placeholder="e.g. Aditi Rao" required />
            )}
            {isSignup && touched.name && !nameValid && <p className="-mt-2 text-xs text-coral">Enter your name (at least 2 characters).</p>}

            <Field id="a-email" label="Email" icon={Mail} type="email" value={f.email} onChange={set('email')} onBlur={blur('email')} invalid={touched.email && f.email.length > 0 && !emailValid} maxLength={254} autoComplete="email" placeholder="you@example.com" required />
            {touched.email && f.email.length > 0 && !emailValid && <p className="-mt-2 text-xs text-coral">Enter a valid email address.</p>}

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="a-pass" className="text-sm font-medium text-ink">Password</label>
                {!isSignup && <button type="button" onClick={() => dispatch({ type: 'TOAST', toast: { text: 'Password reset is coming soon.' } })} className="text-xs font-medium text-accent hover:underline">Forgot password?</button>}
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="a-pass" type={showPw ? 'text' : 'password'}
                  value={f.password} onChange={set('password')} onBlur={blur('password')}
                  aria-invalid={isSignup && touched.password && !pw.ok || undefined}
                  maxLength={200} autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'} required
                  className={cx(field, 'pr-11', isSignup && touched.password && !pw.ok && 'border-coral/60 focus:border-coral focus:ring-coral/10')}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:bg-line-2 hover:text-ink">
                  {showPw ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {isSignup && f.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => <span key={n} className={cx('h-1.5 flex-1 rounded-full transition-colors', n <= pw.score ? pw.tone : 'bg-line-2')} />)}
                  </div>
                  <p className={cx('mt-1 text-xs', pw.ok ? 'text-muted' : 'text-coral')}>
                    {pw.ok ? <span className="inline-flex items-center gap-1 text-mint"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {pw.label} password</span> : pw.reason}
                  </p>
                </div>
              )}
            </div>

            {isSignup && role === 'creator' && (
              <div>
                <Field id="a-code" label="Creator access code" icon={KeyRound} value={f.creatorCode} onChange={set('creatorCode')} maxLength={100} placeholder="Only if a creator already exists" />
                <p className="mt-1 text-xs text-muted">The first creator account claims this community — no code needed.</p>
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}
            <Button type="submit" variant="primary" size="lg" arrow className="w-full" disabled={busy || !canSubmit}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</Button>
          </form>

          <p className="mt-5 max-w-md text-sm text-muted">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <button type="button" onClick={() => switchTab(isSignup ? 'login' : 'signup')} className="font-medium text-accent hover:underline">
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </main>

        <footer className="relative z-10 flex flex-col gap-3 px-6 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {new Date().getFullYear()} FanOS — the operating system for your audience.</span>
          <SocialLinks />
        </footer>
      </div>

      {/* ───────── Visual side (right) ───────── */}
      <aside className="relative hidden overflow-hidden bg-night lg:block">
        <Aurora tone="dark" />
        {/* Signature glowing orb */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2">
          <div className="float-slow absolute inset-0 rounded-full bg-gradient-to-br from-accent/60 via-[#9b4bf0]/40 to-coral/50 blur-[90px]" />
          <div className="absolute inset-10 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-white/10" />
          <div className="absolute inset-[9.5rem] rounded-full border border-white/10" />
        </div>
        <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div />
          <div className="max-w-md">
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.1] text-white xl:text-5xl">
              {isSignup ? <>Turn followers into <span className="ai-gradient-animated">collaborators.</span></> : <>Your community, <span className="ai-gradient-animated">organized by AI.</span></>}
            </h2>
            <div className="mt-8 rounded-3xl border border-white/15 bg-white/[.07] p-5 backdrop-blur-xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-[#b9a8ff]" aria-hidden="true" /> What FanOS surfaces for you</p>
              <ul className="mt-4 space-y-2">
                {glimpse.map(([e, t, tag], i) => (
                  <li key={t} className="flex animate-fade-up items-center gap-3 rounded-2xl bg-white/[.08] px-3.5 py-2.5 ring-1 ring-white/10" style={{ animationDelay: `${200 + i * 120}ms` }}>
                    <span aria-hidden="true">{e}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/90">{t}</span>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">{tag}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-2 rounded-full bg-white/[.07] px-3 py-1.5 text-[13px] text-white/80 ring-1 ring-white/10">
                  <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />{text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/45">Followers → Communities → Ideas → AI Signals → Action</p>
        </div>
      </aside>
    </div>
  );
}

// Footer social links. Brand marks are inline SVG (lucide v1 dropped brand icons).
const SOCIALS = [
  {
    name: 'LinkedIn', href: 'https://www.linkedin.com/in/gautam-pandit-4b185224b/',
    path: 'M4.98 3.5A2.5 2.5 0 1 1 2.49 6 2.5 2.5 0 0 1 4.98 3.5zM2.75 8.75h4.5V21h-4.5zM9.75 8.75h4.31v1.67h.06a4.72 4.72 0 0 1 4.25-2.33c4.54 0 5.38 2.99 5.38 6.88V21h-4.5v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.69V21h-4.5z',
  },
  {
    name: 'GitHub', href: 'https://github.com/Gautam5514',
    path: 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z',
  },
  {
    name: 'X', href: 'https://x.com/Gautamp5514',
    path: 'M18.9 2.5h3.3l-7.2 8.24L23.5 21.5h-6.63l-5.2-6.8-5.95 6.8H2.4l7.7-8.8L2.1 2.5h6.8l4.7 6.2zm-1.16 17h1.83L7.3 4.4H5.33z',
  },
  {
    name: 'YouTube', href: 'https://www.youtube.com/@Gopoworkspace',
    path: 'M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.4.52A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.12c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52a3 3 0 0 0 2.1-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5zM9.6 15.5v-7l6.2 3.5z',
  },
];

function SocialLinks() {
  return (
    <nav aria-label="Social links" className="flex items-center gap-1.5">
      {SOCIALS.map(({ name, href, path }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/70 text-muted transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-sm">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
        </a>
      ))}
    </nav>
  );
}

const PLATFORM_META = [
  ['ig', 'Instagram', Camera, 'from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]'],
  ['yt', 'YouTube', PlaySquare, 'from-[#ff4e45] to-[#c4302b]'],
  ['x', 'X', AtSign, 'from-[#2b2b2b] to-[#000]'],
];
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

// Live preview of the invite card followers see when they open the join link.
function InvitePreview({ f }) {
  const name = f.name.trim() || 'Your name';
  const first = name.split(' ')[0];
  const platforms = PLATFORM_META.map(([k, label, Icon, grad]) => [label, Icon, grad, Number(f[k]) || 0]).filter((p) => p[3] > 0);
  const reach = platforms.reduce((s, p) => s + p[3], 0);
  return (
    <div>
      <div className="rounded-3xl bg-white p-6 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/20">
        <div className="flex items-center gap-3">
          <Avatar name={name} size={48} />
          <div className="min-w-0">
            <p className="text-xs text-muted">You’re invited by</p>
            <p className="truncate font-semibold text-ink">{name} {f.handle.trim() && <span className="font-normal text-muted">{f.handle.trim()}</span>}</p>
          </div>
        </div>
        <p className="mt-5 font-display text-2xl font-semibold leading-tight text-ink">{f.name.trim() ? `Join ${first}’s community` : 'Join the community'}</p>
        <p className="mt-1 text-sm text-ink-2">{f.niche.trim() || 'Share ideas, build projects and find collaborators.'}</p>
        {platforms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {platforms.map(([label, Icon, grad, n]) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-line-2 py-1 pl-1 pr-2.5 text-xs font-medium text-ink-2">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-white', grad)}><Icon className="h-3 w-3" aria-hidden="true" /></span>
                {compact(n)}
              </span>
            ))}
          </div>
        )}
        <span className="mt-5 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-medium text-white">Join community</span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
        <span className="live-dot h-2 w-2 rounded-full bg-mint" /> Live preview{reach > 0 ? ` · ${compact(reach)} total reach` : ''}
      </p>
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
    <SplitShell
      eyebrow="What your followers see"
      panelTitle={<>Your community, <span className="ai-gradient-animated">your brand.</span></>}
      panel={<InvitePreview f={f} />}
      topRight={(
        <>
          {c && <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'creator', creatorPage: 'dashboard' } })} className="inline-flex items-center gap-1 transition hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard</button>}
          <button onClick={() => auth.logout()} className="transition hover:text-ink">Log out</button>
        </>
      )}
    >
      <form onSubmit={save} className="animate-fade-up">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Creator profile</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">Set up your <span className="ai-gradient-animated">community</span></h1>
        <p className="mt-2 text-ink-2">Takes a minute. Your community starts empty — real members, ideas and activity appear as people join through your invite link.</p>

        <div className="card mt-7 p-6">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Profile</p>
          <div className="mt-4 space-y-4">
            <Field id="c-name" label="Name *" icon={User} value={f.name} onChange={set('name')} maxLength={60} required placeholder="e.g. gautam Kumar" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="c-handle" label="Handle" icon={AtSign} value={f.handle} onChange={set('handle')} maxLength={40} placeholder="@yourhandle" />
              <Field id="c-niche" label="Niche" icon={Sparkles} value={f.niche} onChange={set('niche')} maxLength={80} placeholder="AI, startups & building in public" />
            </div>
          </div>
        </div>

        <div className="card mt-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Audience <span className="font-normal normal-case tracking-normal">(optional)</span></p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {PLATFORM_META.map(([k, label, Icon, grad]) => (
              <label key={k} htmlFor={`c-${k}`} className="group rounded-2xl border border-line bg-white p-3 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10 hover:border-ink/20">
                <span className="flex items-center gap-2 text-xs font-medium text-ink-2">
                  <span className={cx('flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-white', grad)}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  {label}
                </span>
                <input id={`c-${k}`} type="number" min="0" inputMode="numeric" value={f[k]} onChange={set(k)} placeholder="0" className="mt-2 w-full bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-line" />
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" variant="accent" size="lg" className="mt-6 w-full" icon={Check} disabled={!ok}>Save & open dashboard</Button>
        <p className="mt-3 text-center text-xs text-muted">You can edit this anytime from your profile menu (top right).</p>
      </form>

      {c && (
        <section aria-labelledby="danger-title" className="mt-8 rounded-2xl border border-coral/25 bg-coral-soft/40 p-5">
          <h2 id="danger-title" className="text-sm font-semibold text-coral">Danger zone</h2>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">Clear all ideas, projects, communities and activity. Member accounts are kept. This cannot be undone.</p>
            <button type="button"
              onClick={() => { if (confirm('Clear all community content (ideas, projects, communities, activity)? Member accounts are kept. This cannot be undone.')) { dispatch({ type: 'RESET' }); dispatch({ type: 'NAV', patch: { view: 'creator', creatorPage: 'dashboard' } }); } }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-coral/40 bg-white px-4 py-2 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear content
            </button>
          </div>
        </section>
      )}
    </SplitShell>
  );
}
