'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function cx(...a) { return a.filter(Boolean).join(' '); }

const GRADS = [
  ['#5b3df5', '#9f7bff'], ['#ff5a36', '#ffa26b'], ['#0e9f63', '#5ad19a'], ['#2577e8', '#73b4ff'],
  ['#d63384', '#ff8fc4'], ['#d98a00', '#ffc94d'], ['#14131a', '#5a5868'], ['#7a2ff0', '#ff6fb1'],
];
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

export function Avatar({ name = '?', size = 36, ring, className }) {
  const [a, b] = GRADS[hash(name) % GRADS.length];
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38), background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ names = [], size = 26, max = 4, extra = 0 }) {
  const shown = names.slice(0, max);
  const more = extra || Math.max(0, names.length - max);
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span key={n + i} className={i ? '-ml-2' : ''}><Avatar name={n} size={size} ring /></span>
      ))}
      {more > 0 && (
        <span className="-ml-2 inline-flex items-center justify-center rounded-full bg-line-2 text-[10px] font-semibold text-ink-2 ring-2 ring-white" style={{ width: size, height: size }}>
          +{more}
        </span>
      )}
    </span>
  );
}

export function ScoreRing({ score, size = 52, stroke = 5, label = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#5b3df5' : score >= 72 ? '#0e9f63' : score >= 55 ? '#d98a00' : '#7c7a88';
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Signal score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efedf3" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-display font-semibold text-ink" style={{ fontSize: size * 0.32 }}>{score}</span>
      )}
    </span>
  );
}

export function Sparkline({ data, width = 96, height = 28, color = '#5b3df5' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * width, height - 3 - ((d - min) / (max - min || 1)) * (height - 6)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = `g${hash(color + data.join())}`;
  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1)[0] - 1} cy={pts.at(-1)[1]} r="2.6" fill={color} />
    </svg>
  );
}

const CHIP = {
  default: 'bg-line-2 text-ink-2',
  accent: 'bg-accent-soft text-accent',
  coral: 'bg-coral-soft text-coral',
  mint: 'bg-mint-soft text-mint',
  amber: 'bg-amber-soft text-amber',
  sky: 'bg-sky-soft text-sky',
  dark: 'bg-ink text-white',
  outline: 'border border-line text-ink-2 bg-white',
};
export function Chip({ tone = 'default', children, className, icon: Icon }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', CHIP[tone], className)}>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

const BTN = {
  primary: 'bg-ink text-white hover:bg-ink/90 shadow-sm',
  accent: 'bg-accent text-white hover:bg-accent-600 shadow-sm shadow-accent/30',
  secondary: 'bg-white text-ink border border-line hover:border-ink/25 hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-line-2 hover:text-ink',
  soft: 'bg-accent-soft text-accent hover:bg-accent/15',
  danger: 'text-coral hover:bg-coral-soft',
};
export function Button({ variant = 'secondary', size = 'md', icon: Icon, children, className, ...props }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : size === 'lg' ? 'h-12 px-6 text-[15px] gap-2' : 'h-10 px-4 text-sm gap-2';
  return (
    <button type="button" className={cx('inline-flex items-center justify-center rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50', sz, BTN[variant], className)} {...props}>
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Modal({ open, onClose, children, width = 'max-w-2xl', labelledBy, side = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector('input,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={cx('fixed inset-0 z-50 flex animate-fade-in bg-ink/40 backdrop-blur-[2px]', side ? 'justify-end' : 'items-start justify-center overflow-y-auto p-4 sm:p-8')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className={cx('relative w-full bg-white shadow-pop', side ? 'h-full max-w-md animate-slide-in overflow-y-auto scroll-thin' : cx('animate-pop rounded-3xl', width))}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-1.5 text-muted shadow-sm transition hover:bg-line-2 hover:text-ink">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action, icon: Icon }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{eyebrow}
          </p>
        )}
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Bar({ value, color = 'bg-accent' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-2">
      <div className={cx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted" aria-hidden="true" />}
      <p className="font-display font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-pop">
      {toast.text}
    </div>
  );
}

export function Logo({ dark = false, size = 28 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="fanos-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b3df5" />
            <stop offset="1" stopColor="#ff5a36" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#fanos-g)" />
        <circle cx="16" cy="16" r="4.2" fill="#fff" />
        <ellipse cx="16" cy="16" rx="11" ry="5.2" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" transform="rotate(-28 16 16)" />
        <circle cx="25.3" cy="11" r="1.9" fill="#fff" />
      </svg>
      <span className={cx('font-display text-[19px] font-bold tracking-tight', dark ? 'text-white' : 'text-ink')}>Fan<span className="ai-gradient-text">OS</span></span>
    </span>
  );
}
