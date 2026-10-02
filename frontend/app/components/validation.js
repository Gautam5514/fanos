'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, Clock, Download, Copy, ChevronDown, ChevronUp, Star, ArrowLeft, Video, ShieldCheck, Send, Users, Quote, FlaskConical, CloudOff, Cloud, Link2 } from 'lucide-react';
import { useStore, TEST_TASKS } from '../lib/store';
import { fmt } from '../lib/ai';
import { Avatar, Button, Chip, Empty, Logo, cx } from './ui';

const input = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10';

// ------------------------------------------------------------------ start
export function TestStart() {
  const { dispatch, startDemo } = useStore();
  const [t, setT] = useState({ name: '', handle: '', platform: 'Instagram', followers: '', niche: '', contact: '' });
  const [consent, setConsent] = useState(false);
  const set = (k) => (e) => setT((x) => ({ ...x, [k]: e.target.value }));
  const ok = t.name.trim().length >= 2 && Number(t.followers) > 0 && consent;
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="text-sm text-muted hover:text-ink">Exit</button>
      </header>
      <main className="mx-auto grid max-w-5xl gap-10 px-6 pb-16 pt-4 md:grid-cols-[1fr_360px]">
        <form onSubmit={(e) => { e.preventDefault(); if (ok) { startDemo(); } if (ok) dispatch({ type: 'START_TEST', tester: { ...t, name: t.name.trim(), followers: Number(t.followers) } }); }} className="animate-fade-up">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Creator test session • ~10 minutes</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Help us test FanOS with your audience in mind</h1>
          <p className="mt-2 text-ink-2">You’ll use the creator dashboard as if this were your community, complete 6 small tasks, then tell us honestly what you think.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="t-name" className="text-sm font-medium text-ink">Your name *</label><input id="t-name" value={t.name} onChange={set('name')} maxLength={80} className={input} /></div>
            <div><label htmlFor="t-handle" className="text-sm font-medium text-ink">Handle</label><input id="t-handle" value={t.handle} onChange={set('handle')} maxLength={60} placeholder="@yourhandle" className={input} /></div>
            <div><label htmlFor="t-platform" className="text-sm font-medium text-ink">Main platform</label>
              <select id="t-platform" value={t.platform} onChange={set('platform')} className={input}>{['Instagram', 'YouTube', 'X', 'LinkedIn', 'TikTok', 'Other'].map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><label htmlFor="t-followers" className="text-sm font-medium text-ink">Followers *</label><input id="t-followers" type="number" min="1" inputMode="numeric" value={t.followers} onChange={set('followers')} placeholder="120000" className={input} /></div>
            <div><label htmlFor="t-niche" className="text-sm font-medium text-ink">Niche</label><input id="t-niche" value={t.niche} onChange={set('niche')} maxLength={80} placeholder="Tech, fitness, finance…" className={input} /></div>
            <div><label htmlFor="t-contact" className="text-sm font-medium text-ink">Email / phone <span className="font-normal text-muted">(private)</span></label><input id="t-contact" value={t.contact} onChange={set('contact')} maxLength={120} className={input} /></div>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5b3df5]" />
            <span>I agree that the FanOS team can record my answers from this session. (Publishing my name or quote is a separate choice at the end.)</span>
          </label>
          <Button type="submit" variant="accent" size="lg" className="mt-6" icon={ClipboardCheck} disabled={!ok}>Start test session</Button>
        </form>

        <aside className="card h-fit p-6">
          <p className="font-display font-semibold text-ink">What you’ll do</p>
          <ol className="mt-4 space-y-3">
            {TEST_TASKS.map(([id, label], i) => (
              <li key={id} className="flex gap-3 text-sm text-ink-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>{label}</li>
            ))}
          </ol>
          <p className="mt-5 rounded-xl bg-paper p-3 text-xs text-muted">The dashboard uses sample community data (a creator with ~48K members) so you can see the product at scale. Tasks tick automatically as you go.</p>
        </aside>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ floating checklist
function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.floor((now - (since || now)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function TestBar() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(true);
  const v = state.validation;
  const elapsed = useElapsed(v?.startedAt);
  if (!v?.active) return null;
  const done = TEST_TASKS.filter(([id]) => v.tasks[id]).length;
  return (
    <section aria-label="Test session" className="fixed bottom-4 left-4 z-30 w-[calc(100%-2rem)] max-w-sm animate-fade-up rounded-2xl border border-line bg-white shadow-pop lg:left-[272px]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white"><FlaskConical className="h-4 w-4" aria-hidden="true" /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Test session • {done}/{TEST_TASKS.length} tasks</span>
          <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" aria-hidden="true" /> {elapsed} • {v.tester?.name}</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" /> : <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-line-2 px-4 pb-4 pt-3">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / TEST_TASKS.length) * 100}%` }} /></div>
          <ul className="space-y-1.5">
            {TEST_TASKS.map(([id, label]) => (
              <li key={id} className={cx('flex items-center gap-2 text-sm', v.tasks[id] ? 'text-muted line-through' : 'text-ink')}>
                <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', v.tasks[id] ? 'border-mint bg-mint text-white' : 'border-line')}>{v.tasks[id] && <Check className="h-3 w-3" aria-hidden="true" />}</span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button variant={done === TEST_TASKS.length ? 'accent' : 'primary'} size="sm" className="flex-1" icon={Send} onClick={() => dispatch({ type: 'FINISH_TEST' })}>Finish & give feedback</Button>
            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Cancel this test session?')) dispatch({ type: 'CANCEL_TEST' }); }}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ feedback form
const RATING_Q = [
  ['communities', 'Organizing followers into interest-based communities'],
  ['aiSignals', 'AI finding the important ideas, people & opportunities'],
  ['clustering', 'Grouping & summarizing similar ideas'],
  ['actionFlow', 'Select idea → Create collaboration → Promote'],
  ['overall', 'Overall, how useful would FanOS be for you? *'],
];
const FEATURES = ['AI Community Brief', 'Idea clusters (duplicates merged)', 'Signal Score', 'People / talent search', 'Opportunities inbox', 'Turn into project', 'Promote to audience', 'Ask FanOS AI'];

function Stars({ value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} of 5`} onClick={() => onChange(n)}
          className={cx('flex h-9 w-9 items-center justify-center rounded-lg border transition', value >= n ? 'border-amber/40 bg-amber-soft text-amber' : 'border-line text-muted hover:border-ink/20')}>
          <Star className={cx('h-4 w-4', value >= n && 'fill-amber')} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function FeedbackForm() {
  const { state, dispatch } = useStore();
  // Snapshot the session on mount: saving feedback clears the live session.
  const [v] = useState(() => state.validation);
  const tester = v?.tester;
  const done = TEST_TASKS.filter(([id]) => v?.tasks?.[id]).length;
  // finishedAt is set by FINISH_TEST before this screen renders.
  const minutes = v?.startedAt && v?.finishedAt ? Math.max(1, Math.round((v.finishedAt - v.startedAt) / 60000)) : null;
  const [f, setF] = useState({ ratings: {}, wouldUse: '', hoursOnDms: '', hoursSaved: '', bestFeature: '', improve: '', quote: '', videoUrl: '', consentPublish: false });
  const [status, setStatus] = useState('idle'); // idle | saving | done
  const [saved, setSaved] = useState(null);
  const set = (k, val) => setF((x) => ({ ...x, [k]: val }));

  if (!tester) {
    return <div className="mx-auto max-w-xl p-10"><Empty icon={FlaskConical} title="No active test session" action={<Button variant="primary" onClick={() => dispatch({ type: 'NAV', patch: { view: 'test-start' } })}>Start a session</Button>} /></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!f.ratings.overall) return;
    setStatus('saving');
    const entry = {
      id: `fb_${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
      tester, ...f, hoursOnDms: f.hoursOnDms === '' ? null : Number(f.hoursOnDms), hoursSaved: f.hoursSaved === '' ? null : Number(f.hoursSaved),
      session: { tasksCompleted: done, tasksTotal: TEST_TASKS.length, minutes },
    };
    let synced = false;
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      synced = r.ok;
    } catch { synced = false; }
    const final = { ...entry, synced };
    dispatch({ type: 'SAVE_FEEDBACK', entry: final });
    setSaved(final);
    setStatus('done');
  };

  if (status === 'done' && saved) {
    return (
      <div className="min-h-screen bg-paper">
        <main className="mx-auto max-w-2xl px-6 py-16 text-center animate-fade-up">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-white"><Check className="h-7 w-7" aria-hidden="true" /></span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Thank you, {tester.name.split(' ')[0]}! 🙏</h1>
          <p className="mt-2 text-ink-2">Your feedback was saved{saved.synced ? ' to the FanOS server' : ' in this browser (server unavailable — export it from Validation results)'}.</p>
          {saved.quote && <div className="mt-8 text-left"><TestimonialCard entry={saved} /></div>}
          <div className="mt-8 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => dispatch({ type: 'NAV', patch: { view: 'validation' } })}>See validation results</Button>
            <Button variant="primary" onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })}>Done</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Logo />
        <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'creator' } })} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard</button>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-20">
        <form onSubmit={submit} className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-accent">Feedback</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Be brutally honest, {tester.name.split(' ')[0]}</h1>
          <p className="mt-2 text-ink-2">You completed {done}/{TEST_TASKS.length} tasks{minutes ? ` in ${minutes} min` : ''}. Low scores are just as useful as high ones.</p>

          <section className="card mt-8 space-y-5 p-6">
            {RATING_Q.map(([k, q]) => (
              <div key={k} className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-sm font-medium text-ink">{q}</p>
                <Stars label={q} value={f.ratings[k] || 0} onChange={(n) => set('ratings', { ...f.ratings, [k]: n })} />
              </div>
            ))}
          </section>

          <section className="card mt-5 grid gap-5 p-6 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-ink">Would you use FanOS with your real audience?</legend>
              <div className="mt-2 flex gap-2">
                {['Yes', 'Maybe', 'No'].map((o) => (
                  <button type="button" key={o} aria-pressed={f.wouldUse === o} onClick={() => set('wouldUse', o)} className={cx('h-10 rounded-xl border px-5 text-sm font-medium transition', f.wouldUse === o ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-2')}>{o}</button>
                ))}
              </div>
            </fieldset>
            <div><label htmlFor="fb-dms" className="text-sm font-medium text-ink">Hours/week you spend on DMs & comments today</label><input id="fb-dms" type="number" min="0" max="168" value={f.hoursOnDms} onChange={(e) => set('hoursOnDms', e.target.value)} className={input} /></div>
            <div><label htmlFor="fb-saved" className="text-sm font-medium text-ink">Hours/week FanOS could save you (estimate)</label><input id="fb-saved" type="number" min="0" max="168" value={f.hoursSaved} onChange={(e) => set('hoursSaved', e.target.value)} className={input} /></div>
            <div className="sm:col-span-2"><label htmlFor="fb-best" className="text-sm font-medium text-ink">Most valuable feature</label>
              <select id="fb-best" value={f.bestFeature} onChange={(e) => set('bestFeature', e.target.value)} className={input}><option value="">Choose…</option>{FEATURES.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="sm:col-span-2"><label htmlFor="fb-improve" className="text-sm font-medium text-ink">What’s missing or confusing?</label>
              <textarea id="fb-improve" value={f.improve} onChange={(e) => set('improve', e.target.value)} maxLength={2000} rows={3} className={cx(input, 'h-auto py-2.5')} /></div>
          </section>

          <section className="card mt-5 p-6">
            <label htmlFor="fb-quote" className="flex items-center gap-1.5 text-sm font-medium text-ink"><Quote className="h-4 w-4 text-accent" aria-hidden="true" /> In one or two sentences — what would you tell another creator about FanOS?</label>
            <textarea id="fb-quote" value={f.quote} onChange={(e) => set('quote', e.target.value)} maxLength={1000} rows={3} placeholder="In your own words…" className={cx(input, 'h-auto py-2.5')} />
            <label htmlFor="fb-video" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-ink"><Video className="h-4 w-4 text-accent" aria-hidden="true" /> Video testimonial link <span className="font-normal text-muted">(optional — Drive, YouTube, Loom)</span></label>
            <input id="fb-video" type="url" value={f.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} maxLength={300} placeholder="https://…" className={input} />
            <label className="mt-5 flex items-start gap-3 rounded-xl bg-paper p-4 text-sm text-ink-2">
              <input type="checkbox" checked={f.consentPublish} onChange={(e) => set('consentPublish', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5b3df5]" />
              <span>You may publish my name, handle, follower count and quote as a testimonial (e.g. in the hackathon submission).</span>
            </label>
          </section>

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="accent" size="lg" icon={Send} disabled={!f.ratings.overall || status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Submit feedback'}</Button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ testimonial card
export function TestimonialCard({ entry }) {
  const t = entry.tester;
  return (
    <figure className="card ai-glow p-6">
      <div className="flex gap-0.5" aria-label={`${entry.ratings?.overall} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cx('h-4 w-4', n <= (entry.ratings?.overall || 0) ? 'fill-amber text-amber' : 'text-line')} aria-hidden="true" />)}</div>
      <blockquote className="mt-3 font-display text-lg leading-snug text-ink">“{entry.quote}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <Avatar name={t.name} size={40} />
        <div>
          <p className="text-sm font-semibold text-ink">{t.name} {t.handle && <span className="font-normal text-muted">{t.handle}</span>}</p>
          <p className="text-xs text-muted">{t.followers ? `${fmt(t.followers)} followers` : ''}{t.platform ? ` on ${t.platform}` : ''}{t.niche ? ` • ${t.niche}` : ''}</p>
        </div>
        {entry.videoUrl && <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><Video className="h-3.5 w-3.5" aria-hidden="true" /> Watch</a>}
      </figcaption>
    </figure>
  );
}

// Merge browser-saved entries with public entries from the server (deduplicated).
export function useAllFeedback() {
  const { state } = useStore();
  const [remote, setRemote] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/feedback').then((r) => (r.ok ? r.json() : { entries: [] })).then((d) => { if (alive) setRemote(d.entries || []); }).catch(() => {});
    return () => { alive = false; };
  }, [state.feedback.length]);
  return useMemo(() => {
    const local = state.feedback;
    const seen = new Set(local.map((l) => l.id));
    const extra = remote.filter((r) => !seen.has(r.clientId) && !local.some((l) => l.tester.name === r.tester.name && l.quote === r.quote));
    return [...local, ...extra.map((r) => ({ ...r, synced: true, consentPublish: true, remote: true }))];
  }, [state.feedback, remote]);
}

// ------------------------------------------------------------------ results
const avg = (arr) => (arr.length ? (arr.reduce((s, x) => s + x, 0) / arr.length) : null);

export function ValidationResults() {
  const { dispatch } = useStore();
  const all = useAllFeedback();
  const [copied, setCopied] = useState(false);
  const ratings = (k) => all.map((e) => e.ratings?.[k]).filter(Boolean);
  const totalReach = all.reduce((s, e) => s + (e.tester.followers || 0), 0);
  const yes = all.filter((e) => e.wouldUse === 'Yes').length;
  const saved = avg(all.map((e) => e.hoursSaved).filter((x) => x != null));
  const publishable = all.filter((e) => e.consentPublish && e.quote);

  const download = (name, text, type) => {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const exportCsv = () => {
    const head = ['date', 'name', 'handle', 'platform', 'followers', 'overall', 'communities', 'aiSignals', 'clustering', 'actionFlow', 'wouldUse', 'hoursOnDms', 'hoursSaved', 'bestFeature', 'improve', 'quote', 'videoUrl', 'consentPublish', 'tasks', 'minutes'];
    const rows = all.map((e) => [e.createdAt, e.tester.name, e.tester.handle, e.tester.platform, e.tester.followers, e.ratings?.overall, e.ratings?.communities, e.ratings?.aiSignals, e.ratings?.clustering, e.ratings?.actionFlow, e.wouldUse, e.hoursOnDms, e.hoursSaved, e.bestFeature, e.improve, e.quote, e.videoUrl, e.consentPublish, `${e.session?.tasksCompleted}/${e.session?.tasksTotal}`, e.session?.minutes]);
    download('fanos-creator-feedback.csv', [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  };
  const pitch = () => {
    const lines = [`Tested with ${all.length} real creator${all.length === 1 ? '' : 's'} (combined reach ${fmt(totalReach)})`];
    const o = avg(ratings('overall')); if (o) lines.push(`Average usefulness: ${o.toFixed(1)}/5`);
    if (all.length) lines.push(`${yes}/${all.length} would use it with their real audience`);
    if (saved != null) lines.push(`Estimated time saved: ~${saved.toFixed(1)} hrs/week`);
    publishable.forEach((e) => lines.push(`“${e.quote}” — ${e.tester.name}${e.tester.handle ? ` (${e.tester.handle})` : ''}, ${fmt(e.tester.followers || 0)} followers`));
    return lines.join('\n');
  };
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/?test=1` : '/?test=1';

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Real influencer validation</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Creator test results</h1>
            <p className="mt-1 text-ink-2">Only real submissions appear here — nothing is pre-filled.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Link2} onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); dispatch({ type: 'TOAST', toast: { text: 'Test link copied — send it to a creator' } }); } catch { /* ignore */ } }}>Copy test link</Button>
            <Button variant="primary" icon={FlaskConical} onClick={() => dispatch({ type: 'NAV', patch: { view: 'test-start' } })}>Run a session now</Button>
          </div>
        </div>

        {all.length === 0 ? (
          <div className="mt-8"><Empty icon={Users} title="No creator has tested FanOS yet" text="Send the test link to a creator (or sit with them and click “Run a session now”). Their ratings, quote and video link will appear here." /></div>
        ) : (
          <>
            <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                ['Creators tested', all.length],
                ['Combined reach', fmt(totalReach)],
                ['Avg. usefulness', avg(ratings('overall')) ? `${avg(ratings('overall')).toFixed(1)}/5` : '—'],
                ['Would use it', `${yes}/${all.length}`],
                ['Hrs/week saved (est.)', saved != null ? saved.toFixed(1) : '—'],
              ].map(([l, v]) => <div key={l} className="card p-4"><p className="font-display text-2xl font-semibold text-ink">{v}</p><p className="text-xs text-muted">{l}</p></div>)}
            </section>

            <section className="card mt-5 p-5">
              <p className="mb-3 text-sm font-semibold text-ink">Average rating per requirement</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {RATING_Q.map(([k, q]) => { const a = avg(ratings(k)); return (
                  <div key={k}><div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">{q.replace(' *', '')}</span><span className="font-mono text-muted">{a ? a.toFixed(1) : '—'}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-accent" style={{ width: `${((a || 0) / 5) * 100}%` }} /></div></div>
                ); })}
              </div>
            </section>

            {publishable.length > 0 && (
              <section className="mt-6">
                <p className="mb-3 font-display text-lg font-semibold text-ink">Publishable testimonials</p>
                <div className="grid gap-4 md:grid-cols-2">{publishable.map((e) => <TestimonialCard key={e.id} entry={e} />)}</div>
              </section>
            )}

            <section className="card mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">All feedback</caption>
                <thead className="border-b border-line text-xs text-muted"><tr>{['Creator', 'Reach', 'Overall', 'Would use', 'Best feature', 'Improve', 'Saved to'].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-line-2">
                  {all.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 font-medium text-ink">{e.tester.name}<span className="block text-xs font-normal text-muted">{e.tester.handle}</span></td>
                      <td className="px-4 py-3">{fmt(e.tester.followers || 0)}</td>
                      <td className="px-4 py-3">{e.ratings?.overall}/5</td>
                      <td className="px-4 py-3">{e.wouldUse || '—'}</td>
                      <td className="px-4 py-3">{e.bestFeature || '—'}</td>
                      <td className="max-w-xs px-4 py-3 text-xs text-ink-2">{e.improve || '—'}</td>
                      <td className="px-4 py-3">{e.synced ? <Chip tone="mint" icon={Cloud}>Server</Chip> : <Chip tone="amber" icon={CloudOff}>Browser only</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" icon={copied ? Check : Copy} onClick={async () => { try { await navigator.clipboard.writeText(pitch()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}>{copied ? 'Copied' : 'Copy pitch summary'}</Button>
              <Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>
              <Button variant="secondary" icon={Download} onClick={() => download('fanos-creator-feedback.json', JSON.stringify(all, null, 2), 'application/json')}>Export JSON</Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
