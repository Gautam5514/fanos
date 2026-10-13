'use client';

// Global search / command palette. Opens with ⌘K (or Ctrl+K, or "/"), searches ideas, people,
// spaces, projects (and opportunities for creators) through /api/search, and also jumps to pages
// and runs quick actions. Fully keyboard driven: ↑ ↓ to move, ↵ to open, Esc to close.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, FolderKanban, History, Inbox, Lightbulb, Loader2, Search, SearchX, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, cx } from './ui';
import { AiIcon, SpaceIcon } from './icons';
import { useOpen } from './shared';

const RECENT_KEY = 'fanos_recent_searches';
const readRecent = () => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5) : []; } catch { return []; } };
const writeRecent = (list) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* private mode */ } };

const GROUP_LABEL = { pages: 'Go to', actions: 'Quick actions', ideas: 'Ideas', people: 'People', communities: 'Spaces', projects: 'Projects', opportunities: 'Opportunities', ai: 'Ask AI' };

function Hl({ text, q }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="rounded bg-accent-soft px-0.5 text-accent">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

// The trigger that sits in the top bar.
export function SearchTrigger({ onClick, placeholder = 'Search ideas, people, spaces…' }) {
  return (
    <button type="button" onClick={onClick} aria-label="Search" aria-keyshortcuts="Control+K Meta+K"
      className="group flex h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-line bg-white/80 pl-3.5 pr-2 text-left text-[13px] text-muted shadow-sm transition hover:border-ink/15 hover:bg-white hover:shadow-md focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10">
      <Search className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{placeholder}</span>
      <kbd className="hidden shrink-0 rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">⌘K</kbd>
    </button>
  );
}

export default function SearchPalette({ open, setOpen, mode, pages, actions = [], onAsk }) {
  // ⌘K / Ctrl+K toggles from anywhere; "/" opens when you're not typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); return; }
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
  if (!open) return null;
  return <Palette close={() => setOpen(false)} mode={mode} pages={pages} actions={actions} onAsk={onAsk} />;
}

function Palette({ close, mode, pages, actions, onAsk }) {
  const { state, dispatch } = useStore();
  const openEntity = useOpen();
  const [query, setQuery] = useState('');
  const [res, setRes] = useState({ q: '', groups: [], error: false });
  const [nav, setNav] = useState({ q: '', i: 0 });
  const [recent, setRecent] = useState(readRecent);
  const listRef = useRef(null);
  const q = query.trim();
  const ready = q.length >= 2;

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Debounced server search; stale answers are cancelled.
  useEffect(() => {
    if (!ready) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'same-origin', signal: ctrl.signal });
        if (!r.ok) throw new Error('search failed');
        const d = await r.json();
        setRes({ q, groups: Array.isArray(d.groups) ? d.groups : [], error: false });
      } catch (e) { if (e.name !== 'AbortError') setRes({ q, groups: [], error: true }); }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, ready]);

  const loading = ready && res.q !== q;
  const groups = ready && res.q === q ? res.groups : [];
  const failed = ready && res.q === q && res.error;

  const remember = (text) => {
    const t = text.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    setRecent(next); writeRecent(next);
  };
  const run = (fn, remembers = true) => () => { if (remembers) remember(q); close(); fn(); };

  // Build one flat, keyboard-navigable list of rows.
  const rows = useMemo(() => {
    const out = [];
    const add = (group, row) => out.push({ group, ...row });
    const matches = (label) => !ready || label.toLowerCase().includes(q.toLowerCase());
    // Server results first when searching.
    groups.forEach((g) => g.items.forEach((it) => {
      if (g.type === 'ideas') add('ideas', { key: `i${it.id}`, label: it.label, meta: it.meta, icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber"><Lightbulb className="h-4 w-4" aria-hidden="true" /></span>, run: run(() => openEntity.idea(it.id)) });
      if (g.type === 'people') add('people', { key: `m${it.id}`, label: it.label, meta: it.meta, icon: <Avatar name={it.label} size={32} />, run: run(() => openEntity.member(it.id)) });
      if (g.type === 'communities') add('communities', { key: `c${it.id}`, label: it.label, meta: it.meta, icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><SpaceIcon name={it.label} className="h-4 w-4" /></span>, run: run(() => pages.find((p) => p.id === 'communities')?.open?.({ communityId: it.id, communityTab: 'feed' })) });
      if (g.type === 'projects') add('projects', { key: `p${it.id}`, label: it.label, meta: it.meta, icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-mint"><FolderKanban className="h-4 w-4" aria-hidden="true" /></span>, run: run(() => pages.find((p) => p.id === 'projects')?.open?.(mode === 'creator' ? { openProjectId: it.id } : { memberProjectId: it.id })) });
      if (g.type === 'opportunities') add('opportunities', { key: `o${it.id}`, label: it.label, meta: it.meta, icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-coral"><Inbox className="h-4 w-4" aria-hidden="true" /></span>, run: run(() => pages.find((p) => p.id === 'opportunities')?.open?.({ openOppId: it.id })) });
    }));
    pages.filter((p) => matches(p.label)).forEach((p) => add('pages', { key: `pg${p.id}`, label: p.label, meta: '', icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-line-2 text-ink-2"><p.icon className="h-4 w-4" aria-hidden="true" /></span>, run: run(() => p.open(), false) }));
    if (!ready) actions.forEach((a) => add('actions', { key: `a${a.id}`, label: a.label, meta: a.hint || '', icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><a.icon className="h-4 w-4" aria-hidden="true" /></span>, run: run(a.run, false) }));
    if (ready && onAsk) add('ai', { key: 'ask', label: `Ask FanOS AI: “${q}”`, meta: 'Get an answer from your community data', icon: <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#9b4bf0] text-white"><AiIcon className="h-4 w-4" /></span>, run: run(() => onAsk(q)) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, ready, q, pages, actions, mode, onAsk]);

  const active = nav.q === q ? Math.min(nav.i, Math.max(0, rows.length - 1)) : 0;
  const setActive = (i) => setNav({ q, i });
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, rows.length]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(rows.length ? (active + 1) % rows.length : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(rows.length ? (active - 1 + rows.length) % rows.length : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); rows[active]?.run(); }
  };

  const noResults = ready && !loading && !failed && !groups.length;
  let last = '';
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/45 px-3 pt-[10vh] backdrop-blur-[6px] animate-fade-in sm:pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKeyDown} className="flex max-h-[72vh] w-full max-w-xl animate-pop flex-col overflow-hidden rounded-3xl bg-white shadow-pop ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-line px-4">
          {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" aria-hidden="true" /> : <Search className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />}
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80} autoComplete="off" spellCheck={false}
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={rows[active] ? `palette-${active}` : undefined} aria-label="Search"
            placeholder={mode === 'creator' ? 'Search ideas, people, spaces, projects…' : 'Search ideas, people, spaces…'}
            className="h-14 min-w-0 flex-1 rounded-none bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70 focus-visible:!outline-none" />
          {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-1.5 text-muted transition hover:bg-line-2 hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
            : <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-medium text-muted">esc</kbd>}
        </div>

        <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          {!ready && recent.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Recent</p>
                <button type="button" onClick={() => { setRecent([]); writeRecent([]); }} className="text-[11px] font-medium text-muted transition hover:text-ink">Clear</button>
              </div>
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQuery(r)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-ink-2 transition hover:bg-paper">
                  <History className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{r}
                </button>
              ))}
            </div>
          )}

          {rows.map((r, idx) => {
            const head = r.group !== last; last = r.group;
            return (
              <div key={r.key}>
                {head && <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted first:pt-2">{GROUP_LABEL[r.group]}</p>}
                <button type="button" role="option" id={`palette-${idx}`} aria-selected={idx === active} data-idx={idx} onClick={r.run} onMouseMove={() => idx !== active && setActive(idx)}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors', idx === active ? 'bg-accent-soft/70' : 'hover:bg-paper')}>
                  {r.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink"><Hl text={r.label} q={r.group === 'ai' ? '' : q} /></span>
                    {r.meta && <span className="block truncate text-xs text-muted">{r.meta}</span>}
                  </span>
                  {idx === active && <CornerDownLeft className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              </div>
            );
          })}

          {loading && !rows.some((r) => r.group !== 'pages' && r.group !== 'ai') && <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>}
          {failed && <p role="alert" className="mx-2 my-3 rounded-xl bg-coral-soft px-3 py-2.5 text-sm text-coral">Search is unavailable right now. You can still jump to a page or ask AI.</p>}
          {noResults && !rows.some((r) => r.group === 'pages') && (
            <div className="px-3 py-8 text-center">
              <SearchX className="mx-auto h-8 w-8 text-muted/60" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-ink">No matches for “{q}”</p>
              <p className="mt-0.5 text-xs text-muted">Try a different word, a skill, a name or a city.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-paper/60 px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><kbd className="rounded border border-line bg-white px-1 font-sans">↑</kbd><kbd className="rounded border border-line bg-white px-1 font-sans">↓</kbd> navigate</span>
            <span className="inline-flex items-center gap-1"><kbd className="rounded border border-line bg-white px-1 font-sans">↵</kbd> open</span>
          </span>
          <span className="hidden sm:inline">Tip: press <kbd className="rounded border border-line bg-white px-1 font-sans">/</kbd> to search anywhere</span>
        </div>
      </div>
    </div>
  );
}
