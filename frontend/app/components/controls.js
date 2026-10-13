'use client';

// Shared page controls: a premium dropdown (instead of a plain <select>), segmented tabs, a compact
// search field and a stat tile. Used on every creator page so filters look and behave the same.
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cx } from './ui';
import { Boxes } from 'lucide-react';
import { SpaceIcon } from './icons';

// options: [{ value, label, icon?: Component, node?: ReactNode, count?: number, hint?: string }]
export function Dropdown({ label, value, options, onChange, icon: Icon, align = 'left', className, menuWidth = 'w-64', showLabel = false }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const listId = useId();
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[idx];
  const isFiltered = idx > 0; // the first option is always the "everything" default

  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  useEffect(() => { if (open) ref.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [open, hi]);

  const openMenu = () => { setHi(idx); setOpen(true); };
  const pick = (o) => { onChange(o.value); setOpen(false); ref.current?.querySelector('button')?.focus(); };
  const onKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(); } return; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi]); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={ref} className={cx('relative', className)} onKeyDown={onKeyDown}>
      <button type="button" onClick={() => (open ? setOpen(false) : openMenu())} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`${label}: ${current?.label}`}
        className={cx('inline-flex h-10 max-w-full items-center gap-2 rounded-full border pl-3.5 pr-2.5 text-sm shadow-sm transition', open ? 'border-accent/50 bg-white ring-4 ring-accent/10' : isFiltered ? 'border-accent/40 bg-accent-soft/60 hover:border-accent/60' : 'border-line bg-white hover:border-ink/20')}>
        {Icon && <Icon className={cx('h-4 w-4 shrink-0', isFiltered ? 'text-accent' : 'text-muted')} aria-hidden="true" />}
        {showLabel && <span className="hidden text-muted sm:inline">{label}</span>}
        <span className={cx('truncate font-medium', isFiltered ? 'text-accent' : 'text-ink')}>{current?.label}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className={cx('scroll-thin absolute top-[calc(100%+8px)] z-40 max-h-72 origin-top animate-pop overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-pop', menuWidth, align === 'right' ? 'right-0' : 'left-0')}>
          {options.map((o, i) => {
            const on = o.value === value;
            const OIcon = o.icon;
            return (
              <li key={String(o.value)} role="option" aria-selected={on} data-i={i}>
                <button type="button" onClick={() => pick(o)} onMouseMove={() => setHi(i)}
                  className={cx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors', hi === i ? 'bg-paper' : '', on ? 'font-semibold text-accent' : 'text-ink')}>
                  {o.node ?? (OIcon && <OIcon className={cx('h-4 w-4 shrink-0', on ? 'text-accent' : 'text-muted')} aria-hidden="true" />)}
                  <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.hint && <span className="block truncate text-xs font-normal text-muted">{o.hint}</span>}</span>
                  {o.count != null && <span className="shrink-0 text-xs font-normal text-muted tabular-nums">{o.count}</span>}
                  {on && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// options: [{ value, label, icon?, count? }]
export function Segmented({ value, onChange, options, label, className }) {
  return (
    <div role="tablist" aria-label={label} className={cx('no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-line-2 p-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button key={o.value} role="tab" aria-selected={on} type="button" onClick={() => onChange(o.value)}
            className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition', on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{o.label}
            {o.count != null && <span className={cx('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', on ? 'bg-accent-soft text-accent' : 'bg-white/70 text-muted')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search…', label = 'Search', className }) {
  return (
    <label className={cx('relative block', className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={80} autoComplete="off"
        className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-9 text-sm shadow-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10" />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:bg-line-2 hover:text-ink"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
    </label>
  );
}

// Wrapper for a page's filters: one tidy wrapping row.
export function Toolbar({ children, className }) {
  return <div className={cx('mb-5 flex flex-wrap items-center gap-2.5', className)}>{children}</div>;
}

export function ClearFilters({ show, onClick }) {
  if (!show) return null;
  return <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-line-2 hover:text-ink"><X className="h-3.5 w-3.5" aria-hidden="true" /> Clear</button>;
}

export function StatTile({ icon: Icon, label, value, sub, tone = 'accent', onClick }) {
  const TONE = { accent: 'bg-accent-soft text-accent', sky: 'bg-sky-soft text-sky', mint: 'bg-mint-soft text-mint', coral: 'bg-coral-soft text-coral', amber: 'bg-amber-soft text-amber' };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cx('card group flex items-start gap-3.5 p-4 text-left', onClick && 'card-hover')}>
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105', TONE[tone])}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="block font-display text-[28px] font-semibold leading-none text-ink tabular-nums">{value}</span>
        <span className="mt-1.5 block text-sm font-medium text-ink-2">{label}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
    </Tag>
  );
}

// Options for a "Space" dropdown: everything first, then each space with its icon.
export const spaceOptions = (communities, allLabel = 'All spaces') => [
  { value: 'all', label: allLabel, icon: Boxes },
  ...communities.map((c) => ({ value: c.id, label: c.name, node: <SpaceIcon name={c.name} className="h-4 w-4 shrink-0 text-muted" /> })),
];
