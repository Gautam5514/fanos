'use client';

// First-run creator onboarding: Profile → Channel → Spaces → Launch.
// Nothing is written to the server until "Create my community" (step 3), so a creator can
// go back, change their mind or refresh without leaving half-saved data behind. Progress is
// kept in sessionStorage for refreshes/accidental tab closes and cleared on launch.
import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import {
  ArrowLeft, ArrowRight, AtSign, BadgeCheck, Camera, Check, Copy, Lightbulb, Link2, Mail, Megaphone, MessageCircle,
  Download, PartyPopper, PlaySquare, QrCode, Plus, Rocket, Send, Share2, Sparkles, User, Users, X, Zap,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Avatar, Button, cx } from '../ui';
import { PanelSteps, SplitShell } from '../chrome';
import { SpaceIcon } from '../icons';

const DRAFT_KEY = 'fanos_creator_draft_v1';
const STEPS = ['Profile', 'Channel', 'Spaces', 'Launch'];
const MAX_SPACES = 8;

const PLATFORMS = [
  { key: 'yt', name: 'YouTube', unit: 'Subscribers', Icon: PlaySquare, grad: 'from-[#ff4e45] to-[#c4302b]' },
  { key: 'ig', name: 'Instagram', unit: 'Followers', Icon: Camera, grad: 'from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
  { key: 'x', name: 'X', unit: 'Followers', Icon: AtSign, grad: 'from-[#2b2b2b] to-[#000]' },
];

const NICHES = ['AI & tech', 'Startups', 'Education', 'Design', 'Finance', 'Fitness', 'Gaming', 'Lifestyle', 'Entertainment'];

const SPACES = [
  { id: 'general', emoji: '💬', name: 'General Hangout', desc: 'Intros, wins and everything in between.', kw: [], always: true },
  { id: 'ai', emoji: '🤖', name: 'AI & Automation', desc: 'Agents, tools and workflows people are building.', kw: ['ai', 'automation', 'llm', 'agent', 'tech', 'machine'] },
  { id: 'startups', emoji: '🚀', name: 'Startups & Founders', desc: 'Ideas, launches and lessons from builders.', kw: ['startup', 'founder', 'business', 'build', 'entrepreneur'] },
  { id: 'dev', emoji: '💻', name: 'Developers', desc: 'Code, stacks and open-source collaborations.', kw: ['dev', 'code', 'coding', 'programming', 'software', 'tech', 'engineer'] },
  { id: 'design', emoji: '🎨', name: 'Design & Creative', desc: 'Brand, UI and visual storytelling.', kw: ['design', 'art', 'creative', 'ui', 'ux'] },
  { id: 'content', emoji: '🎥', name: 'Content Creators', desc: 'Scripts, edits and audience growth.', kw: ['content', 'video', 'youtube', 'creator', 'edit', 'vlog', 'entertain'] },
  { id: 'marketing', emoji: '📈', name: 'Marketing & Growth', desc: 'Distribution, audience and campaigns.', kw: ['market', 'growth', 'brand', 'seo', 'sales'] },
  { id: 'finance', emoji: '💰', name: 'Finance & Investing', desc: 'Money, markets and smarter decisions.', kw: ['financ', 'invest', 'money', 'stock', 'crypto', 'trading'] },
  { id: 'fitness', emoji: '💪', name: 'Fitness & Health', desc: 'Training, habits and wellbeing.', kw: ['fitness', 'health', 'gym', 'workout', 'yoga', 'diet'] },
  { id: 'productivity', emoji: '🗂️', name: 'Productivity', desc: 'Systems for focus and getting things done.', kw: ['product', 'focus', 'habit', 'notion'] },
  { id: 'learning', emoji: '🎓', name: 'Learning & Study', desc: 'Courses, notes and study groups.', kw: ['educat', 'study', 'learn', 'exam', 'student', 'teach', 'course'] },
  { id: 'gaming', emoji: '🎮', name: 'Gaming', desc: 'Games, clips and squads.', kw: ['gam', 'esport', 'stream', 'minecraft'] },
];

// ── helpers ──────────────────────────────────────────────────────────────────

// "100k" / "1.2M" / "100,000" → 100000. Returns null when it can't be understood.
export function parseCount(raw) {
  const s = String(raw ?? '').trim().replace(/[,\s_]/g, '').toLowerCase();
  if (!s) return 0;
  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1));
  return Number.isFinite(n) ? Math.min(n, 1e10) : null;
}
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K` : String(n));
const tierFor = (n) => (n >= 1e6 ? 'Mega channel' : n >= 1e5 ? 'Established channel' : n >= 1e4 ? 'Growing channel' : n >= 1e3 ? 'Rising channel' : n > 0 ? 'Just getting started' : '');

// Username → bare, safe handle (accepts "@name" or a pasted profile URL).
const bareHandle = (h) => String(h || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/.*\//, '').replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);

const normName = (s) => s.trim().replace(/\s+/g, ' ');

function recommend(niche) {
  const text = niche.toLowerCase();
  const hits = SPACES.filter((s) => !s.always && s.kw.some((k) => text.includes(k))).slice(0, 4).map((s) => s.id);
  return ['general', ...hits];
}

function readDraft() {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); return d && typeof d === 'object' ? d : null; } catch { return null; }
}
function writeDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode / quota */ } }
function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

const input = 'h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10';

function TextField({ id, label, icon: Icon, hint, error, optional, counter, ...props }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</label>
        {counter && <span className="text-[11px] tabular-nums text-muted">{counter}</span>}
      </div>
      <div className="relative mt-1.5">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />}
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-note` : undefined}
          className={cx(input, Icon && 'pl-11', error && 'border-coral/60 focus:border-coral focus:ring-coral/10')} {...props} />
      </div>
      {(error || hint) && <p id={`${id}-note`} className={cx('mt-1.5 text-xs', error ? 'text-coral' : 'text-muted')}>{error || hint}</p>}
    </div>
  );
}

// ── live preview (dark panel) ────────────────────────────────────────────────

function Preview({ name, handle, niche, platforms, spaces, avatar }) {
  const display = name.trim() || 'Your name';
  const first = display.split(' ')[0];
  const reach = platforms.reduce((s, p) => s + p.followers, 0);
  return (
    <div>
      <div className="rounded-3xl bg-white p-6 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/20">
        <div className="flex items-center gap-3">
          <Avatar name={display} size={48} src={avatar} />
          <div className="min-w-0">
            <p className="text-xs text-muted">You’re invited by</p>
            <p className="flex items-center gap-1 truncate font-semibold text-ink">
              <span className="truncate">{display}</span>
              {handle && <span className="shrink-0 font-normal text-muted">@{handle}</span>}
            </p>
          </div>
        </div>
        <p className="mt-5 font-display text-2xl font-semibold leading-tight text-ink">{name.trim() ? `Join ${first}’s community` : 'Join the community'}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-2">{niche.trim() || 'Share ideas, build projects and find collaborators.'}</p>
        {platforms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {platforms.map(({ name: pn, Icon, grad, followers, handle: ph }) => (
              <span key={pn} className="inline-flex items-center gap-1.5 rounded-full bg-line-2 py-1 pl-1 pr-2.5 text-xs font-medium text-ink-2">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-white', grad)}><Icon className="h-3 w-3" aria-hidden="true" /></span>
                {followers > 0 ? compact(followers) : ph ? `@${ph}` : pn}
              </span>
            ))}
          </div>
        )}
        {spaces.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Spaces to join</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {spaces.slice(0, 5).map((s) => <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"><SpaceIcon name={s.name} className="h-3.5 w-3.5" />{s.name}</span>)}
              {spaces.length > 5 && <span className="rounded-full bg-line-2 px-2.5 py-1 text-xs font-medium text-muted">+{spaces.length - 5} more</span>}
            </div>
          </div>
        )}
        <span className="mt-5 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-medium text-white">Join community</span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
        <span className="live-dot h-2 w-2 rounded-full bg-mint" /> Live preview of your invite page{reach > 0 ? ` · ${compact(reach)} total reach` : ''}
      </p>
    </div>
  );
}

// ── main wizard ──────────────────────────────────────────────────────────────

export default function CreatorOnboarding() {
  const { state, dispatch, auth } = useStore();
  const draft = useMemo(() => readDraft(), []);
  // Tell the app a wizard is running, so finishing it (profile saved) doesn't bounce the creator away.
  useEffect(() => { dispatch({ type: 'NAV', patch: { wizard: true } }); return () => dispatch({ type: 'NAV', patch: { wizard: false } }); }, [dispatch]);
  const [step, setStep] = useState(Math.min(2, Math.max(0, Number(draft?.step) || 0)));
  const [name, setName] = useState(draft?.name ?? state.user?.name ?? '');
  const [handle, setHandle] = useState(draft?.handle ?? '');
  const [niche, setNiche] = useState(draft?.niche ?? '');
  const [picked, setPicked] = useState(Array.isArray(draft?.picked) && draft.picked.length ? draft.picked.filter((k) => PLATFORMS.some((p) => p.key === k)) : ['yt']);
  const [rows, setRows] = useState(draft?.rows ?? {}); // { yt: { handle, count } }
  const [spaceIds, setSpaceIds] = useState(Array.isArray(draft?.spaceIds) ? draft.spaceIds : null); // null = not chosen yet → recommendations
  const [custom, setCustom] = useState(Array.isArray(draft?.custom) ? draft.custom : []);
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState('');
  const [touched, setTouched] = useState({});
  const [launched, setLaunched] = useState(false);
  const launching = useRef(false);
  const stage = useRef(null);

  const mainHandle = bareHandle(handle);
  const rowOf = (k) => rows[k] || {};
  const handleFor = (k) => bareHandle(rowOf(k).handle) || mainHandle;
  const setRow = (k, patch) => setRows((r) => ({ ...r, [k]: { ...r[k], ...patch } }));
  const nameOk = normName(name).length >= 2;
  const handleBad = handle.trim().length > 0 && mainHandle.length === 0;

  const platforms = picked.map((k) => {
    const meta = PLATFORMS.find((p) => p.key === k);
    const n = parseCount(rowOf(k).count);
    return { ...meta, handle: handleFor(k), followers: n ?? 0, bad: n === null };
  });
  const countsOk = platforms.every((p) => !p.bad);

  // Spaces: recommendations follow the niche until the creator starts choosing by hand.
  const recommended = useMemo(() => recommend(niche), [niche]);
  const selectedIds = spaceIds ?? recommended;
  const allSpaces = useMemo(() => [...SPACES, ...custom], [custom]);
  const chosenSpaces = allSpaces.filter((s) => selectedIds.includes(s.id));
  const toggleSpace = (id) => setSpaceIds((cur) => {
    const base = cur ?? recommended;
    if (base.includes(id)) return base.filter((x) => x !== id);
    return base.length >= MAX_SPACES ? base : [...base, id];
  });
  const atLimit = selectedIds.length >= MAX_SPACES;

  const addCustom = () => {
    const n = normName(customText);
    if (n.length < 2) { setCustomError('Give your space a name (at least 2 characters).'); return; }
    if (allSpaces.some((s) => s.name.toLowerCase() === n.toLowerCase())) { setCustomError('You already have a space with that name.'); return; }
    if (atLimit) { setCustomError(`You can start with up to ${MAX_SPACES} spaces. Add more later from the dashboard.`); return; }
    const id = `custom_${Date.now().toString(36)}${custom.length}`;
    setCustom((c) => [...c, { id, emoji: '✨', name: n.slice(0, 40), desc: 'A space made by your community.', custom: true }]);
    setSpaceIds((cur) => [...(cur ?? recommended), id]);
    setCustomText(''); setCustomError('');
  };
  const removeCustom = (id) => { setCustom((c) => c.filter((s) => s.id !== id)); setSpaceIds((cur) => (cur ?? recommended).filter((x) => x !== id)); };

  // ── YouTube auto-fetch (only when the server has a Data API key) ──
  const [ytEnabled, setYtEnabled] = useState(false);
  const [yt, setYt] = useState({ busy: false, note: '', ok: false, title: '' });
  const ytReq = useRef(0);       // ignores answers that arrive after the input changed
  const ytDone = useRef('');     // last input we already looked up (no duplicate requests)
  // What to look up: the YouTube row's own link/handle, else the main username from step 1.
  const ytInput = (rowOf('yt').handle ?? '').trim() || handle.trim();
  const lookupYouTube = async (raw) => {
    const id = ++ytReq.current;
    ytDone.current = raw;
    setYt((y) => ({ ...y, busy: true, note: '' }));
    try {
      const r = await fetch(`/api/integrations/youtube?handle=${encodeURIComponent(raw)}`);
      const d = await r.json().catch(() => ({}));
      if (id !== ytReq.current) return;
      if (!r.ok) { setYt({ busy: false, ok: false, title: '', note: r.status === 404 ? 'We couldn’t find that channel — check the handle or paste the full channel link.' : d.error || 'Could not fetch — enter it manually.' }); return; }
      const ch = d.channel || {};
      setRow('yt', { ...(ch.subscribers != null ? { count: String(ch.subscribers) } : {}), ...(ch.handle ? { handle: bareHandle(ch.handle) } : {}) });
      ytDone.current = bareHandle(ch.handle) || raw;
      setYt({ busy: false, ok: ch.subscribers != null, title: ch.title || '', note: ch.subscribers == null ? `${ch.title || 'Channel'} found — this channel hides its subscriber count, enter it manually.` : '' });
    } catch { if (id === ytReq.current) setYt({ busy: false, ok: false, title: '', note: 'Could not reach the server — enter it manually.' }); }
  };
  // Auto-detect: as soon as a YouTube link/handle is entered (and on arriving at the Channel step).
  useEffect(() => {
    if (!ytEnabled || !picked.includes('yt') || step !== 1 || ytInput.length < 3 || ytInput === ytDone.current) return undefined;
    const t = setTimeout(() => lookupYouTube(ytInput), 700);
    return () => clearTimeout(t);
  });

  // Persist progress (not once launched) and keep focus/scroll sensible between steps.
  useEffect(() => {
    if (launched) return;
    writeDraft({ step, name, handle, niche, picked, rows, spaceIds, custom });
  }, [launched, step, name, handle, niche, picked, rows, spaceIds, custom]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const t = setTimeout(() => stage.current?.querySelector('input:not([type=hidden])')?.focus({ preventScroll: true }), 120);
    return () => clearTimeout(t);
  }, [step]);

  const togglePlatform = (k) => setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const canNext = [nameOk && !handleBad, countsOk, true][step];
  const next = (e) => {
    e?.preventDefault();
    if (!canNext) { setTouched({ name: true, handle: true, counts: true }); return; }
    setStep((s) => Math.min(2, s + 1));
  };

  const launch = () => {
    if (launching.current || !nameOk) return;
    launching.current = true;
    const rowsOut = platforms
      .map((p) => ({ name: p.name, handle: p.handle, followers: p.followers }))
      .filter((p) => p.handle || p.followers > 0);
    dispatch({ type: 'SET_CREATOR', creator: { name: normName(name).slice(0, 60), handle: mainHandle ? `@${mainHandle}` : '', niche: niche.trim().slice(0, 80), platforms: rowsOut } });
    chosenSpaces.forEach((s) => dispatch({ type: 'CREATE_COMMUNITY', community: { name: s.name, emoji: s.emoji, description: s.desc } }));
    clearDraft();
    setLaunched(true);
    setStep(3);
  };

  const first = normName(name).split(' ')[0];
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${encodeURIComponent(state.user?.id || '')}` : '';

  return (
    <SplitShell
      wide
      eyebrow={step === 3 ? 'You’re live' : `Step ${step + 1} of ${STEPS.length}`}
      panelTitle={step === 3 ? <>Your community is <span className="ai-gradient-animated">open.</span></> : <>Your community, <span className="ai-gradient-animated">your brand.</span></>}
      panel={<div className="space-y-6"><PanelSteps steps={STEPS} current={step} compact /><Preview avatar={state.user?.avatar} name={name} handle={mainHandle} niche={niche} platforms={platforms.filter((p) => p.handle || p.followers > 0)} spaces={chosenSpaces} /></div>}
      panelFooter="Followers → Communities → Ideas → AI Signals → Action"
      topRight={launched ? null : <button onClick={() => auth.logout()} className="transition hover:text-ink">Log out</button>}
    >
      <div ref={stage}>
        <div className="mb-8 lg:hidden">
          <ol className="flex gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => <li key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-gradient-to-r from-accent to-coral' : 'bg-line')} aria-current={i === step ? 'step' : undefined}><span className="sr-only">{s}</span></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        </div>

        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <form onSubmit={next} noValidate>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Creator setup</p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">Let’s build your <span className="ai-gradient-animated">community</span></h1>
              <p className="mt-2 text-ink-2">Turn the people who watch you into people who build with you. This takes about two minutes.</p>

              <div className="card mt-7 space-y-4 p-6">
                <TextField id="co-name" label="Your name" icon={User} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} maxLength={60} autoComplete="name" placeholder="e.g. Gautam Kumar" required
                  error={touched.name && !nameOk ? 'Enter your name (at least 2 characters).' : ''} hint="Shown to your followers on the invite page." />
                <TextField id="co-handle" label="Username" icon={AtSign} optional value={handle} onChange={(e) => setHandle(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, handle: true }))} maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="yourhandle"
                  error={handleBad ? 'Use letters, numbers, dots, dashes or underscores.' : ''} hint={mainHandle && handle.trim() !== mainHandle ? `We’ll use @${mainHandle}` : 'The same name you use on your channel.'} />
                <div>
                  <TextField id="co-niche" label="What’s your channel about?" icon={Lightbulb} optional value={niche} onChange={(e) => setNiche(e.target.value)} maxLength={80} placeholder="AI, startups & building in public" counter={`${niche.length}/80`} />
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {NICHES.map((n) => {
                      const on = niche.trim().toLowerCase() === n.toLowerCase();
                      return <button key={n} type="button" aria-pressed={on} onClick={() => setNiche(n)} className={cx('rounded-full border px-3 py-1 text-xs font-medium transition', on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-2 hover:border-ink/25 hover:text-ink')}>{n}</button>;
                    })}
                  </div>
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" arrow className="mt-6 w-full" disabled={!canNext}>Continue</Button>
              <p className="mt-3 text-center text-xs text-muted">Free to set up · No code required · Edit anything later</p>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={next} noValidate>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Where does your <span className="ai-gradient-animated">audience</span> live?</h1>
              <p className="mt-2 text-ink-2">Followers see your reach on the invite page. Pick one or several — this step is optional.</p>

              <div role="group" aria-label="Platforms" className="mt-7 grid grid-cols-3 gap-2">
                {PLATFORMS.map(({ key, name: pn, Icon, grad }) => {
                  const on = picked.includes(key);
                  return (
                    <button key={key} type="button" aria-pressed={on} onClick={() => togglePlatform(key)}
                      className={cx('flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition active:scale-[.98]', on ? 'border-accent bg-accent-soft text-accent ring-4 ring-accent/10' : 'border-line bg-white text-ink-2 hover:border-ink/20 hover:text-ink')}>
                      <span className={cx('flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-white', grad)}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                      {pn}
                    </button>
                  );
                })}
              </div>

              {picked.length === 0 && <p className="mt-5 rounded-2xl bg-line-2 px-4 py-3 text-sm text-ink-2">No problem — you can add your platforms any time from your profile.</p>}

              <div className="mt-5 space-y-3">
                {platforms.map((p, idx) => {
                  const isYt = p.key === 'yt';
                  const auto = !bareHandle(rowOf(p.key).handle);
                  const bad = p.bad;
                  return (
                    <div key={p.key} className="card animate-fade-up p-5">
                      <div className="flex items-center gap-2">
                        <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white', p.grad)}><p.Icon className="h-4 w-4" aria-hidden="true" /></span>
                        <p className="text-sm font-semibold text-ink">{p.name}</p>
                        {idx === 0 && picked.length > 1 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Main</span>}
                      </div>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                        <label htmlFor={`co-${p.key}-h`} className="relative min-w-0 flex-1">
                          <span className="mb-1.5 block text-xs font-medium text-ink">{isYt ? 'Channel link or handle' : 'Handle'}</span>
                          <span className="pointer-events-none absolute left-3.5 top-[2.15rem] text-sm text-muted">@</span>
                          <input id={`co-${p.key}-h`} value={rowOf(p.key).handle ?? mainHandle} onChange={(e) => setRow(p.key, { handle: e.target.value })} onBlur={(e) => { if (/[/@\s]/.test(e.target.value)) setRow(p.key, { handle: bareHandle(e.target.value) }); }} maxLength={120} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={isYt ? 'youtube.com/@yourchannel' : mainHandle || 'handle'}
                            className="h-11 w-full rounded-xl border border-line bg-paper/60 pl-8 pr-14 text-sm text-ink outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10" />
                          {auto && p.handle && !isYt && <span className="pointer-events-none absolute right-3 top-[2.35rem] rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">auto</span>}
                        </label>
                        <label htmlFor={`co-${p.key}-n`} className="sm:w-44">
                          <span className="mb-1.5 block text-xs font-medium text-ink">{p.unit}</span>
                          <input id={`co-${p.key}-n`} inputMode="text" autoComplete="off" value={rowOf(p.key).count ?? ''} onChange={(e) => setRow(p.key, { count: e.target.value })} placeholder="e.g. 100k" aria-invalid={bad || undefined}
                            className={cx('h-11 w-full rounded-xl border bg-paper/60 px-3 text-right text-sm font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-muted/60 focus:bg-white focus:ring-4', bad ? 'border-coral/60 focus:border-coral focus:ring-coral/10' : 'border-line focus:border-accent focus:ring-accent/10')} />
                        </label>
                        {isYt && ytEnabled && (
                          <button type="button" onClick={() => lookupYouTube(ytInput)} disabled={yt.busy || ytInput.length < 2}
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 self-end rounded-xl border border-accent/30 bg-accent-soft px-4 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                            {yt.busy ? <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <Zap className="h-4 w-4" aria-hidden="true" />}
                            {yt.busy ? 'Detecting…' : 'Detect again'}
                          </button>
                        )}
                      </div>
                      <div aria-live="polite" className="min-h-4">
                        {bad && <p className="mt-2 text-xs text-coral">Try a number like 100000, 100k or 1.2M.</p>}
                        {!bad && p.followers > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2"><BadgeCheck className="h-3.5 w-3.5 text-mint" aria-hidden="true" /> {p.followers.toLocaleString('en-US')} {p.unit.toLowerCase()} · {tierFor(p.followers)}</p>}
                        {isYt && yt.busy && <p className="mt-2 flex items-center gap-1.5 text-xs text-accent"><Sparkles className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" /> Looking up your channel…</p>}
                        {isYt && !yt.busy && yt.ok && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Auto-detected{yt.title ? `: ${yt.title}` : ''}</p>}
                        {isYt && !yt.busy && yt.note && <p className="mt-2 text-xs text-muted">{yt.note}</p>}
                        {isYt && !ytEnabled && p.followers === 0 && <p className="mt-2 text-xs text-muted">Type your subscriber count — for example 100k.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(0)}>Back</Button>
                <Button type="submit" variant="primary" size="lg" disabled={!canNext}>{picked.length === 0 ? 'Skip for now' : 'Continue'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Open your first <span className="ai-gradient-animated">spaces</span></h1>
              <p className="mt-2 text-ink-2">Spaces group your audience by interest, so ideas reach the right people. We picked a few based on your channel — change anything.</p>

              <div className="mb-2 mt-6 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Starter spaces</p>
                <span className={cx('text-xs tabular-nums', atLimit ? 'font-medium text-amber' : 'text-muted')}>{selectedIds.length}/{MAX_SPACES} selected</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {allSpaces.map((s) => {
                  const on = selectedIds.includes(s.id);
                  const locked = !on && atLimit;
                  return (
                    <div key={s.id} className="relative">
                      <button type="button" aria-pressed={on} disabled={locked} onClick={() => toggleSpace(s.id)}
                        className={cx('flex h-full w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45', s.custom && 'pr-10', on ? 'border-accent bg-accent-soft ring-4 ring-accent/10' : 'border-line bg-white hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-card')}>
                        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', on ? 'bg-white text-accent' : 'bg-line-2 text-ink-2')} aria-hidden="true">{s.custom ? <Sparkles className="h-5 w-5" /> : <SpaceIcon name={s.name} className="h-5 w-5" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">{s.name}{recommended.includes(s.id) && !s.always && <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-accent ring-1 ring-accent/20">Suggested</span>}</span>
                          <span className="mt-0.5 block text-xs text-muted">{s.desc}</span>
                        </span>
                        <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-accent bg-accent text-white' : 'border-line')}>{on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}</span>
                      </button>
                      {s.custom && <button type="button" onClick={() => removeCustom(s.id)} aria-label={`Remove ${s.name}`} className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted transition hover:bg-line-2 hover:text-coral"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <label htmlFor="co-custom" className="text-sm font-medium text-ink">Add your own</label>
                <div className="mt-1.5 flex gap-2">
                  <input id="co-custom" value={customText} onChange={(e) => { setCustomText(e.target.value); setCustomError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} maxLength={40} placeholder="e.g. Weekend Builders"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" />
                  <Button icon={Plus} onClick={addCustom} disabled={!customText.trim()}>Add</Button>
                </div>
                {customError && <p role="alert" className="mt-1.5 text-xs text-coral">{customError}</p>}
              </div>

              {selectedIds.length === 0 && <p className="mt-5 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-ink">No spaces selected — your community will start empty. You can create spaces any time from the dashboard.</p>}

              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)} disabled={launched}>Back</Button>
                <Button variant="accent" size="lg" icon={Rocket} onClick={launch} disabled={!nameOk || launched}>Create my community</Button>
              </div>
            </div>
          )}

          {step === 3 && <Launch first={first} link={inviteLink} count={chosenSpaces.length} claimed={!!state.creator?.claimed} dispatch={dispatch} reach={platforms.reduce((s, p) => s + p.followers, 0)} />}
        </div>
      </div>
    </SplitShell>
  );
}

// Scannable QR for the invite link (inline SVG, so it downloads crisp at any size).
function InviteQr({ link }) {
  const svg = useMemo(() => {
    if (!link) return '';
    try {
      const q = qrcode(0, 'M');
      q.addData(link); q.make();
      return q.createSvgTag({ cellSize: 8, margin: 3, scalable: true });
    } catch { return ''; }
  }, [link]);
  if (!svg) return <p className="mt-3 text-xs text-muted">Couldn’t generate a QR code for this link.</p>;
  const download = () => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'fanos-invite-qr.svg'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="mt-4 flex animate-fade-up flex-col items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:flex-row sm:items-center">
      <div role="img" aria-label="QR code for your invite link" className="h-40 w-40 shrink-0 overflow-hidden rounded-xl [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-ink">Scan to join</p>
        <p className="mt-0.5 text-xs text-muted">Show it in your video, a livestream or a thumbnail end-card — fans scan with their phone camera.</p>
        <Button size="sm" icon={Download} onClick={download} className="mt-3">Download QR (SVG)</Button>
      </div>
    </div>
  );
}

// ── step 4: you're live ──────────────────────────────────────────────────────

function Launch({ first, link, count, claimed, dispatch, reach }) {
  const [copied, setCopied] = useState('');
  const [qr, setQr] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const pitch = `I’m opening a community on FanOS — share your ideas, find collaborators and help build what we make next, together. Join here: ${link}`;
  const flash = (id) => { setCopied(id); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(''), 1800); };
  const copy = async (text, id) => {
    if (await copyText(text)) flash(id);
    else dispatch({ type: 'TOAST', toast: { text: 'Couldn’t copy automatically — select the link and press Ctrl/⌘ + C.' } });
  };
  const share = async () => { try { await navigator.share({ title: 'Join my community', text: pitch, url: link }); } catch { /* cancelled */ } };

  const channels = [
    { name: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(pitch)}` },
    { name: 'Telegram', Icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join my community on FanOS')}` },
    { name: 'X', Icon: Megaphone, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(pitch)}` },
    { name: 'Email', Icon: Mail, href: `mailto:?subject=${encodeURIComponent('Join my community')}&body=${encodeURIComponent(pitch)}` },
  ];

  const openDashboard = () => {
    if (!claimed) { dispatch({ type: 'TOAST', toast: { text: 'Still saving your profile — one moment…' } }); return; }
    dispatch({ type: 'NAV', patch: { view: 'creator', creatorPage: 'dashboard' } });
  };

  const todo = [
    ['Paste the link in your video description', 'Every upload becomes an invitation.'],
    ['Pin it as the top comment', 'Your most engaged viewers read it first.'],
    ['Mention it in your next video', 'A 10-second shout-out beats any banner.'],
  ];

  return (
    <div>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-coral text-white shadow-[0_14px_34px_-12px_rgba(91,61,245,.6)]"><PartyPopper className="h-7 w-7" aria-hidden="true" /></span>
      <h1 className="mt-5 font-display text-3xl font-semibold text-ink sm:text-4xl">You’re live{first ? `, ${first}` : ''}! <span className="ai-gradient-animated">Share your link.</span></h1>
      <p className="mt-2 text-ink-2">
        Your community is ready{count > 0 ? ` with ${count} space${count === 1 ? '' : 's'}` : ''}. {reach >= 1e4 ? 'With an audience your size, the first 100 members set the tone — invite your most engaged viewers first.' : 'Send this link to your followers and they’ll join in seconds.'}
      </p>

      <div className="card ai-glow mt-6 p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-accent"><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Your invite link</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
          <Button variant="accent" size="lg" icon={copied === 'link' ? Check : Copy} onClick={() => copy(link, 'link')} className="shrink-0">{copied === 'link' ? 'Copied!' : 'Copy link'}</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map(({ name, Icon, href }) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink-2 transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-sm">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />{name}
            </a>
          ))}
          <button type="button" aria-pressed={qr} onClick={() => setQr((v) => !v)} className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition hover:-translate-y-0.5 hover:shadow-sm', qr ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-2 hover:border-accent/40 hover:text-accent')}><QrCode className="h-3.5 w-3.5" aria-hidden="true" />QR code</button>
          {canShare && <button type="button" onClick={share} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink-2 transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-sm"><Share2 className="h-3.5 w-3.5" aria-hidden="true" />More…</button>}
        </div>
        {qr && <InviteQr link={link} />}
        <button type="button" onClick={() => copy(pitch, 'pitch')} className="mt-4 flex w-full items-start gap-3 rounded-xl bg-white/80 p-3 text-left ring-1 ring-line transition hover:ring-accent/40">
          <span className="min-w-0 flex-1 text-sm text-ink-2"><span className="mb-0.5 block text-xs font-semibold text-ink">Ready-made message</span>{pitch}</span>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">{copied === 'pitch' ? <><Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied</> : <><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy</>}</span>
        </button>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Get your first members</p>
        <ol className="mt-2 space-y-2">
          {todo.map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
              <span className="text-sm"><span className="font-medium text-ink">{t}</span><span className="block text-xs text-muted">{d}</span></span>
            </li>
          ))}
        </ol>
      </div>

      <Button variant="primary" size="lg" arrow className="mt-7 w-full" onClick={openDashboard}>Open my dashboard</Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted"><Users className="h-3.5 w-3.5" aria-hidden="true" /> New members appear on your dashboard in real time.</p>
    </div>
  );
}
