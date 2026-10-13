'use client';

// The creator's profile, inside the dashboard: basics + connect social accounts. Plain words, one
// task per card, a live preview of what followers see, and one clear Save bar.
import { useEffect, useState } from 'react';
import { AtSign, Check, ExternalLink, Globe, Link2, Loader2, Music, Pencil, PlaySquare, Camera, Plus, Send, Trash2, User, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Avatar, Button, cx } from '../ui';
import { CopyInviteButton, useInviteLink } from './GettingStarted';
import { PageHeader } from './Pages';
import { NETWORKS, cleanHandle, compactCount, parseCount, socialUrl } from '../../lib/social';

const field = 'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10';

function NetTile({ k, size = 40 }) {
  const n = NETWORKS.find((x) => x.key === k);
  const inner = { yt: <PlaySquare className="h-5 w-5" />, ig: <Camera className="h-5 w-5" />, x: <AtSign className="h-5 w-5" />, tt: <Music className="h-5 w-5" />, tg: <Send className="h-5 w-5" />, fb: <span className="font-display text-xl font-bold leading-none">f</span>, li: <span className="font-display text-base font-bold leading-none">in</span> }[k];
  return <span className={cx('flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', n.tile)} style={{ width: size, height: size }} aria-hidden="true">{inner}</span>;
}

const initialForm = (c, user) => ({
  name: c.name || user?.name || '', handle: (c.handle || '').replace(/^@+/, ''), niche: c.niche || '', bio: c.bio || '', website: c.website || '',
  nets: Object.fromEntries(NETWORKS.map((n) => { const p = (c.platforms || []).find((x) => x.name === n.name); return [n.key, { handle: p?.handle || '', count: p?.followers ? String(p.followers) : '' }]; })),
});

export default function ProfilePage() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(() => initialForm(state.creator || {}, state.user));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form)); // the last saved version
  const [editing, setEditing] = useState(null);
  const [touched, setTouched] = useState(false);
  const [yt, setYt] = useState({ enabled: false, busy: false, note: '' });
  const link = useInviteLink();

  useEffect(() => {
    let alive = true;
    fetch('/api/integrations/youtube').then((r) => (r.ok ? r.json() : null)).then((d) => alive && setYt((y) => ({ ...y, enabled: !!d?.enabled }))).catch(() => {});
    return () => { alive = false; };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNet = (k, patch) => setForm((f) => ({ ...f, nets: { ...f.nets, [k]: { ...f.nets[k], ...patch } } }));
  const dirty = JSON.stringify(form) !== baseline;
  const nameOk = form.name.trim().length >= 2;
  const site = form.website.trim();
  const siteOk = !site || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(site);
  const netErr = (k) => parseCount(form.nets[k].count) === null;
  const valid = nameOk && siteOk && NETWORKS.every((n) => !netErr(n.key));
  const connected = (k) => !!cleanHandle(form.nets[k].handle) || (parseCount(form.nets[k].count) || 0) > 0;
  const mainHandle = cleanHandle(form.handle);

  const preview = NETWORKS.filter((n) => connected(n.key)).map((n) => ({ ...n, handle: cleanHandle(form.nets[n.key].handle), followers: parseCount(form.nets[n.key].count) || 0 }));

  const save = () => {
    if (!valid) { setTouched(true); return; }
    dispatch({ type: 'SET_CREATOR', creator: {
      name: form.name.trim().replace(/\s+/g, ' ').slice(0, 60), handle: mainHandle ? `@${mainHandle}` : '', niche: form.niche.trim().slice(0, 80), bio: form.bio.trim().slice(0, 200), website: site,
      platforms: preview.map((p) => ({ name: p.name, handle: p.handle, followers: p.followers })),
    } });
    setBaseline(JSON.stringify(form));
    setEditing(null); setTouched(false);
  };
  const discard = () => { setForm(JSON.parse(baseline)); setEditing(null); setTouched(false); };

  const detectYouTube = async () => {
    const h = cleanHandle(form.nets.yt.handle) || mainHandle;
    if (!h) { setYt((y) => ({ ...y, note: 'Type your YouTube name first.' })); return; }
    setYt((y) => ({ ...y, busy: true, note: '' }));
    try {
      const r = await fetch(`/api/integrations/youtube?handle=${encodeURIComponent(h)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setYt((y) => ({ ...y, busy: false, note: r.status === 404 ? 'We could not find that channel.' : d.error || 'Could not check right now.' })); return; }
      const ch = d.channel || {};
      setNet('yt', { ...(ch.handle ? { handle: cleanHandle(ch.handle) } : {}), ...(ch.subscribers != null ? { count: String(ch.subscribers) } : {}) });
      setYt((y) => ({ ...y, busy: false, note: ch.subscribers != null ? `Found ${ch.title || 'your channel'} — ${ch.subscribers.toLocaleString('en-US')} subscribers.` : 'Channel found. Please type the number yourself.' }));
    } catch { setYt((y) => ({ ...y, busy: false, note: 'Could not check right now.' })); }
  };

  const clearContent = () => {
    if (confirm('Delete all ideas, projects, communities and activity? Member accounts are kept. This cannot be undone.')) dispatch({ type: 'RESET' });
  };

  const display = form.name.trim() || 'Your name';
  return (
    <div>
      <PageHeader title="Your profile" sub="This is what your followers see. Add your accounts so they can find you everywhere." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* 1. About you */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">1. About you</h2>
            <div className="mt-4 flex items-center gap-4">
              <Avatar name={display} size={64} src={state.user?.avatar} ring />
              <p className="text-sm text-ink-2">{state.user?.avatar ? 'Your photo comes from your Google account.' : 'Sign in with Google to show your photo here.'}</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">Your name</span>
                <span className="relative mt-1.5 block"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={form.name} onChange={set('name')} maxLength={60} autoComplete="name" className={cx(field, 'pl-10', touched && !nameOk && 'border-coral/60')} /></span>
                {touched && !nameOk && <span className="mt-1 block text-xs text-coral">Please type your name.</span>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Your username <span className="font-normal text-muted">(no @ needed)</span></span>
                <span className="relative mt-1.5 block"><AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={form.handle} onChange={set('handle')} maxLength={60} autoCapitalize="none" spellCheck={false} placeholder="yourname" className={cx(field, 'pl-10')} /></span>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-ink">What is your channel about?</span>
              <input value={form.niche} onChange={set('niche')} maxLength={80} placeholder="Example: AI, startups and building in public" className={cx(field, 'mt-1.5')} />
            </label>
            <label className="mt-4 block">
              <span className="flex items-baseline justify-between"><span className="text-sm font-medium text-ink">A short line about you</span><span className="text-[11px] text-muted tabular-nums">{form.bio.length}/200</span></span>
              <textarea value={form.bio} onChange={set('bio')} maxLength={200} rows={3} placeholder="Tell your followers who you are and why they should join." className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10" />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-ink">Your website <span className="font-normal text-muted">(if you have one)</span></span>
              <span className="relative mt-1.5 block"><Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={form.website} onChange={set('website')} onBlur={() => { const w = form.website.trim(); if (w && !/^https?:\/\//i.test(w)) setForm((f) => ({ ...f, website: `https://${w}` })); }} maxLength={200} inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="https://yourwebsite.com" className={cx(field, 'pl-10', touched && !siteOk && 'border-coral/60')} /></span>
              {touched && !siteOk && <span className="mt-1 block text-xs text-coral">Please type a full web address, like https://yourwebsite.com</span>}
            </label>
          </section>

          {/* 2. Connect accounts */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">2. Connect your accounts</h2>
            <p className="mt-1 text-sm text-ink-2">Tap <b className="font-semibold text-ink">Connect</b> next to a network and type your name on it. Followers will see these on your invite page.</p>
            <ul className="mt-4 divide-y divide-line-2">
              {NETWORKS.map((n) => {
                const on = connected(n.key); const open = editing === n.key; const v = form.nets[n.key];
                const url = on ? socialUrl(n.name, v.handle) : null; const count = parseCount(v.count) || 0;
                return (
                  <li key={n.key} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3.5">
                      <NetTile k={n.key} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{n.name}</p>
                        <p className="truncate text-xs text-muted">
                          {on ? <>{cleanHandle(v.handle) ? `@${cleanHandle(v.handle)}` : 'Connected'}{count > 0 ? ` · ${compactCount(count)} ${n.unit.toLowerCase()}` : ''}</> : 'Not connected'}
                        </p>
                      </div>
                      {on && url && !open && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${n.name}`} className="rounded-full p-2 text-muted transition hover:bg-line-2 hover:text-accent"><ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
                      {!open && (on
                        ? <><Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(n.key)}>Edit</Button><button type="button" aria-label={`Remove ${n.name}`} onClick={() => { setNet(n.key, { handle: '', count: '' }); setEditing(null); }} className="rounded-full p-2 text-muted transition hover:bg-coral-soft hover:text-coral"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></>
                        : <Button size="sm" variant="soft" icon={Plus} onClick={() => setEditing(n.key)}>Connect</Button>)}
                    </div>
                    {open && (
                      <div className="mt-3 animate-fade-up rounded-2xl bg-paper p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
                          <label className="block">
                            <span className="text-xs font-medium text-ink">Your {n.name} username or link</span>
                            <span className="relative mt-1 block"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">@</span><input autoFocus value={v.handle} onChange={(e) => setNet(n.key, { handle: e.target.value })} onBlur={(e) => { const h = cleanHandle(e.target.value); if (h !== e.target.value.trim()) setNet(n.key, { handle: h }); }} maxLength={120} autoCapitalize="none" spellCheck={false} placeholder={n.placeholder} className={cx(field, 'pl-8')} /></span>
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-ink">{n.unit} <span className="font-normal text-muted">(optional)</span></span>
                            <input value={v.count} onChange={(e) => setNet(n.key, { count: e.target.value })} inputMode="text" autoComplete="off" placeholder="Example: 100k" aria-invalid={netErr(n.key) || undefined} className={cx(field, 'mt-1 text-right font-semibold', netErr(n.key) && 'border-coral/60')} />
                          </label>
                        </div>
                        {netErr(n.key) && <p className="mt-2 text-xs text-coral">Type a number like 5000, 100k or 1.2M.</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="primary" icon={Check} onClick={() => setEditing(null)} disabled={netErr(n.key)}>Done</Button>
                          {n.key === 'yt' && yt.enabled && <Button size="sm" variant="soft" icon={yt.busy ? Loader2 : Zap} onClick={detectYouTube} disabled={yt.busy}>{yt.busy ? 'Checking…' : 'Find my subscribers'}</Button>}
                          {n.key === 'yt' && yt.note && <span className="text-xs text-ink-2">{yt.note}</span>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 3. Invite link */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">3. Your invite link</h2>
            <p className="mt-1 text-sm text-ink-2">Share this link anywhere. Anyone who opens it can join your community.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} className={cx(field, 'min-w-0 flex-1 bg-paper')} />
              <CopyInviteButton label="Copy link" variant="accent" />
            </div>
          </section>

          {/* Danger zone */}
          <section aria-labelledby="danger-title" className="rounded-2xl border border-coral/25 bg-coral-soft/40 p-5">
            <h2 id="danger-title" className="text-sm font-semibold text-coral">Danger zone</h2>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">Delete all ideas, projects, communities and activity. Member accounts stay. You cannot undo this.</p>
              <button type="button" onClick={clearContent} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-coral/40 bg-white px-4 py-2 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white"><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete content</button>
            </div>
          </section>

          {/* Save bar */}
          <div className={cx('sticky bottom-4 z-10 transition-all duration-300', dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0')} aria-hidden={!dirty}>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 pl-4 shadow-pop backdrop-blur">
              <p className="text-sm font-medium text-ink">You have changes to save</p>
              <div className="flex gap-2"><Button variant="ghost" onClick={discard} tabIndex={dirty ? 0 : -1}>Undo</Button><Button variant="accent" icon={Check} onClick={save} tabIndex={dirty ? 0 : -1}>Save changes</Button></div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">What followers see</p>
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
            <div className="flex items-center gap-3">
              <Avatar name={display} size={48} src={state.user?.avatar} />
              <div className="min-w-0"><p className="text-xs text-muted">You’re invited by</p><p className="truncate font-semibold text-ink">{display} {mainHandle && <span className="font-normal text-muted">@{mainHandle}</span>}</p></div>
            </div>
            <p className="mt-4 font-display text-xl font-semibold leading-tight text-ink">Join {display.split(' ')[0]}’s community</p>
            <p className="mt-1 line-clamp-3 text-sm text-ink-2">{form.bio.trim() || form.niche.trim() || 'Share ideas, build projects and find collaborators.'}</p>
            {preview.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {preview.map((p) => (
                  <span key={p.key} className="inline-flex items-center gap-1.5 rounded-full bg-line-2 py-1 pl-1 pr-2.5 text-xs font-medium text-ink-2"><NetTile k={p.key} size={20} />{p.followers > 0 ? compactCount(p.followers) : `@${p.handle}`}</span>
                ))}
              </div>
            )}
            {site && siteOk && <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-accent"><Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{site.replace(/^https?:\/\//, '')}</p>}
            <span className="mt-4 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-medium text-white">Join community</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> This updates as you type.</p>
        </aside>
      </div>
    </div>
  );
}
