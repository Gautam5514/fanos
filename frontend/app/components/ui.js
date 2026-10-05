'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

export function cx(...a) { return a.filter(Boolean).join(' '); }

// Scroll-reveal: fades/rises children into view once, respects prefers-reduced-motion.
export function Reveal({ children, as: Tag = 'div', delay = 0, className, ...props }) {
  const ref = useRef(null);
  // If IntersectionObserver is unavailable (older/SSR), start visible so content is never hidden.
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={cx('reveal', shown && 'is-visible', className)} style={{ transitionDelay: `${delay}ms` }} {...props}>
      {children}
    </Tag>
  );
}

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
  default: 'bg-line-2 text-ink-2 ring-1 ring-inset ring-black/[0.03]',
  accent: 'bg-accent-soft text-accent ring-1 ring-inset ring-accent/10',
  coral: 'bg-coral-soft text-coral ring-1 ring-inset ring-coral/10',
  mint: 'bg-mint-soft text-mint ring-1 ring-inset ring-mint/10',
  amber: 'bg-amber-soft text-amber ring-1 ring-inset ring-amber/10',
  sky: 'bg-sky-soft text-sky ring-1 ring-inset ring-sky/10',
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
  primary: 'bg-ink text-white shadow-[0_1px_2px_rgba(20,18,25,0.3),0_6px_16px_-6px_rgba(20,18,25,0.4)] hover:bg-ink/90 hover:shadow-[0_2px_4px_rgba(20,18,25,0.3),0_10px_24px_-6px_rgba(20,18,25,0.45)] hover:-translate-y-px',
  accent: 'text-white bg-gradient-to-br from-accent to-[#7a3df0] shadow-[0_1px_2px_rgba(91,61,245,0.3),0_8px_20px_-6px_rgba(91,61,245,0.5)] hover:brightness-110 hover:shadow-[0_2px_6px_rgba(91,61,245,0.35),0_12px_28px_-6px_rgba(91,61,245,0.55)] hover:-translate-y-px',
  secondary: 'bg-white text-ink border border-line shadow-sm hover:border-ink/20 hover:bg-paper hover:shadow-md hover:-translate-y-px',
  ghost: 'text-ink-2 hover:bg-line-2 hover:text-ink',
  soft: 'bg-accent-soft text-accent hover:bg-accent/15',
  danger: 'text-coral hover:bg-coral-soft',
};
// All buttons are pills, matching the landing page. `arrow` adds the trailing gradient ↗ circle.
// (`pill` is still accepted for older call sites; it is now the default.)
export function Button({ variant = 'secondary', size = 'md', icon: Icon, pill: _pill, arrow = false, children, className, ...props }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : size === 'lg' ? 'h-12 px-6 text-[15px] gap-2' : 'h-10 px-4 text-sm gap-2';
  const arrowPad = size === 'sm' ? 'pr-1' : 'pr-1.5';
  const circle = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7';
  return (
    <button type="button" className={cx('group/btn inline-flex items-center justify-center font-medium transition-all duration-200 ease-out active:scale-[.98] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none', 'rounded-full', sz, arrow && arrowPad, BTN[variant], className)} {...props}>
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />}
      {children}
      {arrow && (
        <span className={cx('ml-1 flex shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover/btn:rotate-45', circle, variant === 'accent' ? 'bg-white/20' : 'bg-gradient-to-br from-accent to-coral')}>
          <ArrowUpRight className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        </span>
      )}
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
    <div className={cx('fixed inset-0 z-50 flex animate-fade-in bg-ink/45 backdrop-blur-[6px]', side ? 'justify-end' : 'items-start justify-center overflow-y-auto p-4 sm:p-8')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
    <div className="relative flex w-full animate-fade-up flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-white/70 px-6 py-14 text-center backdrop-blur">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent/15 to-coral/15 blur-3xl" />
      {Icon && (
        <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-coral text-white shadow-[0_14px_34px_-12px_rgba(91,61,245,.6)]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="relative font-display text-lg font-semibold text-ink">{title}</p>
      {text && <p className="relative mt-1.5 max-w-md text-sm text-ink-2">{text}</p>}
      {action && <div className="relative mt-5">{action}</div>}
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

export function Logo({ dark = false, size = 28, iconOnly = false }) {
  // Unique gradient id: a hidden copy of the logo (e.g. in a display:none panel) must not own the gradient.
  const gid = `fanos-g-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b3df5" />
            <stop offset="1" stopColor="#ff5a36" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
        <circle cx="16" cy="16" r="4.2" fill="#fff" />
        <ellipse cx="16" cy="16" rx="11" ry="5.2" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" transform="rotate(-28 16 16)" />
        <circle cx="25.3" cy="11" r="1.9" fill="#fff" />
      </svg>
      <span className={cx('font-display text-[19px] font-bold tracking-tight', iconOnly && 'hidden', dark ? 'text-white' : 'text-ink')}>Fan<span className="ai-gradient-text">OS</span></span>
    </span>
  );
}
