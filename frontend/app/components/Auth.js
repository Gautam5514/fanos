'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Crown, BadgeCheck, Lightbulb, Rocket, RefreshCw, UserPlus, Mail, Lock, User, ArrowLeft, Camera, PlaySquare, AtSign, Sparkles, Check, Zap, Users2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { CREATOR } from '../lib/seed';
import { Avatar, Button, Logo, cx } from './ui';
import { Aurora, SplitShell } from './chrome';
import CreatorOnboarding from './creator/CreatorOnboarding';
import { SpaceIcon } from './icons';
import { googleConfigured, googlePopup } from '../lib/firebase';

const field = 'h-11 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10';
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

const fmtN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K` : String(n));

// Loads the public invite preview for a community id. status: idle | loading | ok | invalid | error.
// "invalid" (404) and "error" (network/server) are different: only the second is worth retrying.
export function useInvite(communityId, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState({ key: '', status: 'idle', data: null });
  const key = `${communityId}:${attempt}`;
  useEffect(() => {
    if (!enabled || !communityId) return undefined;
    let alive = true;
    const done = (status, data = null) => alive && setRes({ key, status, data });
    fetch(`/api/public/community/${encodeURIComponent(communityId)}`)
      .then(async (r) => {
        if (r.status === 404) done('invalid');
        else if (!r.ok) done('error');
        else done('ok', await r.json());
      })
      .catch(() => done('error'));
    return () => { alive = false; };
  }, [communityId, enabled, attempt, key]);
  const retry = () => setAttempt((n) => n + 1);
  if (!enabled) return { status: 'idle', data: null, retry };
  if (!communityId) return { status: 'invalid', data: null, retry };
  if (res.key !== key) return { status: 'loading', data: null, retry }; // result is for an older link
  return { status: res.status, data: res.data, retry };
}

// Shown on signup when a follower arrives through a creator's invite link (/join/:creatorId):
// who they're joining, loaded from the public community endpoint (no sign-in needed).
export function InvitePreviewCard({ invite }) {
  const { status, data: c, retry } = invite;
  if (status === 'idle') return null;
  if (status === 'loading') return <div className="mt-6 h-[104px] max-w-md animate-pulse rounded-2xl bg-line-2" aria-hidden="true" />;
  if (status === 'invalid') return (
    <div role="alert" className="mt-6 max-w-md rounded-2xl border border-amber/30 bg-amber-soft/60 p-4 text-sm text-ink">
      <p className="font-medium">This invite link isn’t valid.</p>
      <p className="mt-0.5 text-ink-2">It may be mistyped or expired. Ask the creator for their current link — you can still create an account and paste it afterwards.</p>
    </div>
  );
  if (status === 'error') return (
    <div role="alert" className="mt-6 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink-2">
      <span>Couldn’t load this invite right now.</span>
      <button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/40 hover:text-accent"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again</button>
    </div>
  );
  const name = c.creator?.name || 'the creator';
  return (
    <div className="relative mt-6 max-w-md overflow-hidden rounded-2xl border border-accent/20 bg-white p-4 shadow-card">
      <div aria-hidden="true" className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-accent/20 to-coral/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <Avatar name={name} size={44} src={c.creator?.avatar} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-accent">You’re invited to join</p>
          <p className="truncate font-display text-lg font-semibold text-ink">{c.creator?.name ? `${name.split(' ')[0]}’s community` : 'This community'}</p>
          <p className="truncate text-xs text-muted">
            {[c.creator?.handle, c.creator?.niche, ...(c.creator?.platforms || []).filter((p) => p.followers > 0).slice(0, 1).map((p) => `${fmtN(p.followers)} on ${p.name}`)].filter(Boolean).join(' · ') || 'Share ideas, build projects and find collaborators'}
          </p>
        </div>
      </div>
      {!c.ready && <p className="relative mt-3 text-xs text-amber">The creator is still setting things up — you can already create your account.</p>}
    </div>
  );
}

// Right-hand panel on /join/:id — the creator's brand, social proof and what joining gets you.
function InvitePanel({ invite }) {
  const { status, data: c } = invite;
  const name = c?.creator?.name || '';
  const first = name.split(' ')[0];
  const platforms = (c?.creator?.platforms || []).filter((p) => p.followers > 0);
  const reach = platforms.reduce((s, p) => s + p.followers, 0);
  const spaces = c?.communities || [];
  const stats = [[c?.members ?? 0, 'Members'], [c?.ideas ?? 0, 'Ideas shared'], [spaces.length, 'Spaces']];
  const gets = [
    [Lightbulb, 'Pitch ideas', first ? `Share what you want ${first} to build or cover.` : 'Share what you want built or covered.'],
    [Users2, 'Find collaborators', 'Get matched by skills, not follower count.'],
    [Rocket, 'Build real projects', 'Ideas that rise to the top become shipped work.'],
  ];
  if (status === 'loading' || status === 'idle') return <div className="mx-auto w-full max-w-md animate-pulse space-y-4" aria-hidden="true"><div className="h-40 rounded-3xl bg-white/10" /><div className="h-32 rounded-3xl bg-white/10" /></div>;
  if (status !== 'ok') return null;
  return (
    <div className="max-w-md">
      <div className="rounded-3xl border border-white/15 bg-white/[.07] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Avatar name={name || 'Creator'} size={64} src={c.creator?.avatar} className="ring-4 ring-white/15" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-white/55">{c.ready ? <><BadgeCheck className="h-3.5 w-3.5 text-[#b9a8ff]" aria-hidden="true" /> Creator community</> : 'Community'}</p>
            <p className="truncate font-display text-2xl font-semibold text-white">{name || 'A FanOS creator'}</p>
            <p className="truncate text-sm text-white/60">{[c.creator?.handle, c.creator?.niche].filter(Boolean).join(' · ') || 'Opening soon'}</p>
          </div>
        </div>
        {platforms.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {platforms.map((p) => <span key={p.name} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/10"><b className="font-semibold text-white">{fmtN(p.followers)}</b> on {p.name}</span>)}
            {platforms.length > 1 && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{fmtN(reach)} total reach</span>}
          </div>
        )}
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {stats.map(([n, l]) => (
            <div key={l} className="rounded-2xl bg-white/[.08] px-3 py-3 text-center ring-1 ring-white/10">
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-2xl font-semibold text-white">{n.toLocaleString('en-US')}</dd>
              <p className="text-[11px] text-white/55" aria-hidden="true">{l}</p>
            </div>
          ))}
        </dl>
        {spaces.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/50">Spaces you can join</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {spaces.slice(0, 6).map((s) => <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85"><SpaceIcon name={s.name} className="h-3.5 w-3.5" />{s.name}</span>)}
              {spaces.length > 6 && <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/55">+{spaces.length - 6} more</span>}
            </div>
          </div>
        )}
      </div>
      <ul className="mt-5 space-y-2">
        {gets.map(([Icon, t, d]) => (
          <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/[.06] px-4 py-3 ring-1 ring-white/10">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#b9a8ff]" aria-hidden="true" />
            <span className="text-sm text-white/90"><b className="font-semibold text-white">{t}</b><span className="block text-xs text-white/55">{d}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthScreen() {
  const { state, dispatch, auth } = useStore();
  // The tab lives in the store so the URL (/auth/login ↔ /auth/signup) and Back button stay in sync.
  const tab = state.authTab === 'signup' ? 'signup' : 'login';
  const [role, setRole] = useState(state.authRole || 'creator');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const isSignup = tab === 'signup';
  // "Continue with Google" shows only when both the web app (Firebase config) and the server support it.
  const [serverGoogle, setServerGoogle] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false); // step 2: the email + password form
  const [gPending, setGPending] = useState(null); // verified Google token waiting for the role choice (new accounts)
  const lastTok = useRef(null); // the verified Google token of the attempt in flight
  useEffect(() => {
    if (!googleConfigured) return undefined;
    let alive = true;
    fetch('/api/auth/providers').then((r) => (r.ok ? r.json() : null)).then((d) => alive && setServerGoogle(!!d?.google)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const googleOn = googleConfigured && serverGoogle;
  // Without Google there is nothing to choose between, so go straight to the email form.
  const showEmail = emailOpen || !googleOn;
  const invited = !!state.viaInvite && isSignup;
  const invite = useInvite(state.inviteCommunity, invited);
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
      if (isSignup) await auth.signup({ ...f, email: f.email.trim(), role, ...(role === 'member' && state.inviteCommunity ? { community: state.inviteCommunity } : {}) });
      else await auth.login({ email: f.email.trim(), password: f.password });
    } catch (err) {
      setError(err.status ? err.message : 'Cannot reach the FanOS server. Please try again in a moment.');
    } finally { setBusy(false); }
  };

  // Google: existing accounts just sign in. A NEW account needs a role first — we use the invite link
  // (fan), the role the person explicitly picked, or else ask them (never guess).
  const googleGo = async (chosenRole) => {
    if (gBusy || busy) return;
    setError(''); setGBusy(true);
    try {
      let tok = gPending;
      if (!tok) { tok = await googlePopup(); if (!tok) return; } // popup closed — not an error
      lastTok.current = tok;
      const invitedFan = !!state.inviteCommunity && state.viaInvite;
      const newRole = chosenRole || (invitedFan ? 'member' : isSignup ? role : null); // sign-up tab: creator unless the person picked Fan
      await auth.google({ idToken: tok.idToken, mode: newRole ? 'signup' : 'login', ...(newRole ? { role: newRole } : {}), ...(newRole === 'member' && state.inviteCommunity ? { community: state.inviteCommunity } : {}) });
    } catch (err) {
      if (err.code === 'no-account') { setGPending((p) => p || lastTok.current); return; }
      if (err.status === 401) setGPending(null); // token expired → start over
      setError(err.status || err.message ? err.message : 'Google sign-in failed. Please try again.');
    } finally { setGBusy(false); }
  };

  const switchTab = (next) => { dispatch({ type: 'NAV', patch: { authTab: next } }); setError(''); setTouched({}); setEmailOpen(false); };

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
    <div className="min-h-screen bg-paper lg:grid lg:h-screen lg:grid-cols-[minmax(0,560px)_1fr] lg:overflow-hidden">
      {/* ───────── Form side (left) ───────── */}
      <div className="relative flex min-h-screen flex-col overflow-x-clip lg:h-screen lg:min-h-0">
        <Aurora className="opacity-60 lg:hidden" />
        <header className="relative z-10 flex shrink-0 items-center justify-between px-6 py-4 sm:px-10">
          <Logo />
          <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-[13px] text-ink-2 backdrop-blur transition hover:border-ink/20 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </button>
        </header>

        <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-6 pb-4 sm:px-10">
          <div className="my-auto w-full py-2">
          {state.serverError && <p role="alert" className="mb-4 rounded-2xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm text-ink">⚠️ {state.serverError}</p>}

          <div key={tab} className="animate-fade-up mb-1">
            <h1 className="font-display text-[2.1rem] font-semibold leading-[1.05] text-ink sm:text-[2.35rem]">{isSignup ? <>Create <span className="ai-gradient-animated">account</span></> : <>Welcome <span className="ai-gradient-animated">back</span></>}</h1>
            <p className="mt-1.5 max-w-sm text-sm text-ink-2 [@media(max-height:700px)]:hidden">{isSignup ? 'Ideas, talent and projects — one community that builds with you.' : 'Log in to pick up where you left off.'}</p>
          </div>

          {invited && <InvitePreviewCard invite={invite} />}

          {isSignup && !state.viaInvite && (
            <div role="radiogroup" aria-label="I am a…" className="relative mt-4 grid max-w-md grid-cols-2 rounded-full bg-line-2 p-1">
              <span aria-hidden="true" className={cx('absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]', role === 'creator' ? 'translate-x-0' : 'translate-x-full')} />
              {[['creator', 'I’m a Creator', Crown], ['member', 'I’m a Fan', UserPlus]].map(([id, l, Icon]) => (
                <button key={id} type="button" role="radio" aria-checked={role === id} onClick={() => setRole(id)}
                  className={cx('relative flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors', role === id ? 'text-ink' : 'text-muted hover:text-ink')}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{l}
                </button>
              ))}
            </div>
          )}

          {googleOn && gPending && (
            <div role="group" aria-label="Choose your account type" className="mt-6 max-w-md animate-fade-up">
              {/* Primary: creator */}
              <button type="button" disabled={gBusy} onClick={() => googleGo('creator')}
                className="group relative w-full overflow-hidden rounded-3xl bg-night p-6 text-left text-white shadow-pop ring-1 ring-white/10 transition hover:-translate-y-0.5 disabled:opacity-70">
                <Aurora tone="dark" />
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white/85"><Crown className="h-3.5 w-3.5" aria-hidden="true" /> For creators</span>
                <span className="relative mt-3 block font-display text-2xl font-semibold leading-tight">Build your <span className="ai-gradient-animated">community</span></span>
                <span className="relative mt-1.5 block text-sm text-white/70">Turn your audience into collaborators — your own space, your own invite link.</span>
                <ul className="relative mt-4 space-y-1.5 text-[13px] text-white/85">
                  {['Set up in about 2 minutes', 'AI surfaces your audience’s best ideas', 'One link to invite every follower'].map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#b9a8ff]" aria-hidden="true" />{t}</li>)}
                </ul>
                <span className="relative mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-ink transition group-hover:bg-white/90">{gBusy ? 'Please wait…' : 'Continue as creator'}<ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" /></span>
              </button>

              {/* Secondary: fan / member */}
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white/80 p-3.5 backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-line-2 text-ink-2"><UserPlus className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1 text-sm"><span className="font-semibold text-ink">Joining as a fan?</span><span className="block text-xs text-muted">Best with your creator’s invite link.</span></span>
                <button type="button" disabled={gBusy} onClick={() => googleGo('member')} className="shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/40 hover:text-accent disabled:opacity-60">Continue as fan</button>
              </div>
              <button type="button" onClick={() => { setGPending(null); setError(''); }} className="mt-3 text-xs text-muted transition hover:text-ink">Use a different Google account</button>
            </div>
          )}
          {googleOn && !gPending && !emailOpen && (
            <div className="mt-6 max-w-md space-y-3">
              <button type="button" onClick={() => googleGo()} disabled={gBusy || busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-[15px] font-medium text-ink shadow-sm transition hover:-translate-y-px hover:border-ink/20 hover:shadow-md active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">
                <GoogleLogo />{gBusy ? 'Please wait…' : isSignup ? 'Sign up with Google' : 'Continue with Google'}
              </button>
              <Button variant="primary" size="lg" icon={Mail} className="w-full" onClick={() => { setEmailOpen(true); setError(''); }}>{isSignup ? 'Sign up with email' : 'Log in with email'}</Button>
              {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}
            </div>
          )}

          {googleOn && !gPending && emailOpen && (
            <button type="button" onClick={() => { setEmailOpen(false); setError(''); }} className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Other ways to {isSignup ? 'sign up' : 'log in'}</button>
          )}

          {showEmail && !gPending && (
          <form onSubmit={submit} noValidate className="mt-4 max-w-md space-y-3">
            {isSignup && (
              <Field id="a-name" label="Your name" icon={User} value={f.name} onChange={set('name')} onBlur={blur('name')} invalid={touched.name && !nameValid} maxLength={60} autoComplete="name" placeholder="e.g. Aditi Rao" required />
            )}
            {isSignup && touched.name && !nameValid && <p className="-mt-1.5 text-xs text-coral">Enter your name (at least 2 characters).</p>}

            <Field id="a-email" label="Email" icon={Mail} type="email" value={f.email} onChange={set('email')} onBlur={blur('email')} invalid={touched.email && f.email.length > 0 && !emailValid} maxLength={254} autoComplete="email" placeholder="you@example.com" required />
            {touched.email && f.email.length > 0 && !emailValid && <p className="-mt-1.5 text-xs text-coral">Enter a valid email address.</p>}

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
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex flex-1 gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => <span key={n} className={cx('h-1 flex-1 rounded-full transition-colors', n <= pw.score ? pw.tone : 'bg-line-2')} />)}
                  </div>
                  <p className={cx('shrink-0 text-xs', pw.ok ? 'text-mint' : 'text-coral')}>{pw.ok ? `${pw.label} password` : pw.reason}</p>
                </div>
              )}
            </div>

            {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}
            <Button type="submit" variant="primary" size="lg" arrow className="h-11 w-full" disabled={busy || !canSubmit}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</Button>
          </form>
          )}

          <p className="mt-4 max-w-md border-t border-line pt-4 text-sm text-muted">
            {isSignup ? 'Already have an account? ' : 'New to FanOS? '}
            <button type="button" onClick={() => switchTab(isSignup ? 'login' : 'signup')} className="font-semibold text-accent underline-offset-4 hover:underline">
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
          </div>
        </main>

        <footer className="relative z-10 flex shrink-0 flex-col gap-2 px-6 py-3 [@media(max-height:700px)]:hidden text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
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

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <div />
          {invited && (invite.status === 'ok' || invite.status === 'loading') ? (
            <div>
              <h2 className="mb-7 max-w-md text-balance font-display text-4xl font-semibold leading-[1.1] text-white xl:text-5xl">
                {invite.data?.creator?.name ? <>Build with <span className="ai-gradient-animated">{invite.data.creator.name.split(' ')[0]}.</span></> : <>Become more than <span className="ai-gradient-animated">a follower.</span></>}
              </h2>
              <InvitePanel invite={invite} />
            </div>
          ) : (
          <div className="max-w-md">
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.1] text-white xl:text-5xl">
              {isSignup ? <>Turn followers into <span className="ai-gradient-animated">collaborators.</span></> : <>Your community, <span className="ai-gradient-animated">organized by AI.</span></>}
            </h2>
            <div className="mt-6 rounded-3xl border border-white/15 bg-white/[.07] p-5 backdrop-blur-xl [@media(max-height:640px)]:hidden">
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
            <ul className="mt-5 flex flex-wrap gap-2 [@media(max-height:820px)]:hidden">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-2 rounded-full bg-white/[.07] px-3 py-1.5 text-[13px] text-white/80 ring-1 ring-white/10">
                  <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />{text}
                </li>
              ))}
            </ul>
          </div>
          )}
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
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/70 text-muted transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-sm">
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
function InvitePreview({ f, avatar }) {
  const name = f.name.trim() || 'Your name';
  const first = name.split(' ')[0];
  const bare = (h) => String(h || '').trim().replace(/^@+/, '').replace(/\s+/g, '');
  const mainHandle = bare(f.handle);
  // Each platform's effective handle follows the main username unless overridden per row.
  const handleFor = (key) => bare(f[`${key}h`]) || mainHandle;
  const platforms = PLATFORM_META.map(([k, label, Icon, grad]) => ({ label, Icon, grad, n: Number(f[k]) || 0, handle: handleFor(k) }))
    .filter((p) => p.n > 0 || p.handle);
  const reach = platforms.reduce((s, p) => s + p.n, 0);
  return (
    <div>
      <div className="rounded-3xl bg-white p-6 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/20">
        <div className="flex items-center gap-3">
          <Avatar name={name} size={48} src={avatar} />
          <div className="min-w-0">
            <p className="text-xs text-muted">You’re invited by</p>
            <p className="truncate font-semibold text-ink">{name} {mainHandle && <span className="font-normal text-muted">@{mainHandle}</span>}</p>
          </div>
        </div>
        <p className="mt-5 font-display text-2xl font-semibold leading-tight text-ink">{f.name.trim() ? `Join ${first}’s community` : 'Join the community'}</p>
        <p className="mt-1 text-sm text-ink-2">{f.niche.trim() || 'Share ideas, build projects and find collaborators.'}</p>
        {platforms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {platforms.map(({ label, Icon, grad, n, handle }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-line-2 py-1 pl-1 pr-2.5 text-xs font-medium text-ink-2">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-white', grad)}><Icon className="h-3 w-3" aria-hidden="true" /></span>
                {n > 0 ? compact(n) : (handle ? `@${handle}` : label)}
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

// Creator setup is the guided wizard. (Creators who are already set up edit their profile inside the
// dashboard — see creator/ProfilePage.js — and AppRoot sends them there if they open /setup.)
export function CreatorSetup() {
  return <CreatorOnboarding />;
}
