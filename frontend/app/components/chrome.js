'use client';

// Shared page chrome so every screen carries the landing page's look:
// an aurora backdrop, a dark animated brand panel for split-screen flows,
// a glass top bar for standalone pages, and a consistent page header.
import { PanelLeftOpen } from 'lucide-react';
import { Logo, cx } from './ui';

// Collapsed sidebar: the logo IS the expand button. On hover/focus it swaps to the "expand" icon.
// Small label that slides out to the right of a collapsed-sidebar icon. Parent needs `group relative`.
export function RailTip({ children }) {
  return (
    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-ink opacity-0 shadow-pop transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

export function CollapsedLogoToggle({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Expand sidebar"
      className="group group/logo relative flex h-11 w-11 items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40">
      <span className="transition duration-200 group-hover/logo:scale-75 group-hover/logo:opacity-0 group-focus-visible/logo:scale-75 group-focus-visible/logo:opacity-0"><Logo dark iconOnly size={34} /></span>
      <span aria-hidden="true" className="absolute inset-0 flex scale-90 items-center justify-center rounded-2xl bg-white/10 text-white opacity-0 transition duration-200 group-hover/logo:scale-100 group-hover/logo:opacity-100 group-focus-visible/logo:scale-100 group-focus-visible/logo:opacity-100">
        <PanelLeftOpen className="h-5 w-5" />
      </span>
      <RailTip>Expand sidebar</RailTip>
    </button>
  );
}

// Grid + slowly drifting color blobs. Place inside a `relative` parent.
export function Aurora({ className, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}
      // On the light page backdrop, fade the bottom edge out so the colour never ends in a hard line.
      style={dark ? undefined : { WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 30%, transparent 100%)' }}>
      <div className={cx('absolute inset-0', dark ? 'bg-grid-dark' : 'bg-grid')} />
      <div className={cx('hero-blob absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full blur-3xl', dark ? 'bg-accent/45' : 'bg-accent/15')} />
      <div className={cx('hero-blob absolute -top-20 right-[6%] h-[360px] w-[360px] rounded-full blur-3xl [animation-delay:-6s]', dark ? 'bg-coral/35' : 'bg-coral/12')} />
      <div className={cx('hero-blob absolute bottom-[-120px] left-1/3 h-[320px] w-[520px] rounded-full blur-3xl [animation-delay:-12s]', dark ? 'bg-[#c06bff]/30' : 'bg-[#c06bff]/10')} />
    </div>
  );
}

// Split-screen flow: dark brand panel (desktop) + content column with its own top bar.
export function SplitShell({ eyebrow, panelTitle, panel, panelFooter, topRight, children, wide }) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-night lg:sticky lg:top-0 lg:block lg:h-screen">
        <Aurora tone="dark" />
        {/* The panel content scrolls on its own, so tall previews are never cut off on short screens. */}
        <div className="scroll-thin relative flex h-full flex-col justify-between gap-8 overflow-y-auto p-10 xl:p-12">
          <div><Logo dark /></div>
          <div>
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/50">{eyebrow}</p>}
            {panelTitle && <h2 className="mt-2 text-balance font-display text-3xl font-semibold leading-tight text-white xl:text-4xl">{panelTitle}</h2>}
            {panel && <div className="mt-6">{panel}</div>}
          </div>
          <div className="text-sm text-white/45">{panelFooter ?? 'Followers → Communities → Ideas → AI Signals → Action'}</div>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <Aurora className="lg:hidden" />
        <header className="relative z-10 mx-auto flex w-full items-center justify-between px-6 py-5" style={{ maxWidth: wide ? '44rem' : '36rem' }}>
          <div className="lg:invisible"><Logo /></div>
          <div className="flex items-center gap-3 text-sm text-muted">{topRight}</div>
        </header>
        <main className="relative z-10 mx-auto flex w-full flex-1 flex-col justify-center px-6 pb-16" style={{ maxWidth: wide ? '44rem' : '36rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Glass top bar for standalone (non-app) pages.
export function TopBar({ right, max = 'max-w-6xl' }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-line/70">
      <div className={cx('mx-auto flex h-16 items-center justify-between px-4 sm:px-6', max)}>
        <Logo />
        <div className="flex items-center gap-2 text-sm">{right}</div>
      </div>
    </header>
  );
}

// Page title block used across the creator and member apps.
// `title` may include a <Grad> span for the gradient accent word.
export function PageHeader({ eyebrow, icon: Icon, title, description, actions, className }) {
  return (
    <div className={cx('relative mb-6 flex animate-fade-up flex-col justify-between gap-4 md:flex-row md:items-end', className)}>
      {/* Soft premium glow behind the heading. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-6 -top-8 -z-10 h-28 w-72 rounded-full bg-gradient-to-r from-accent/15 via-[#c06bff]/10 to-transparent blur-2xl" />
      <div className="relative min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-accent shadow-sm shadow-accent/5">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[34px]">{title}</h1>
        {description && <p className="mt-2 text-pretty text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Grad({ children }) {
  return <span className="ai-gradient-animated">{children}</span>;
}

// Stepper for the dark brand panel. `compact` renders a single horizontal row (saves height).
export function PanelSteps({ steps, current, compact = false }) {
  if (compact) {
    return (
      <ol className="flex items-center gap-2" aria-label="Progress">
        {steps.map((s, i) => {
          const done = i < current, on = i === current;
          return (
            <li key={s} className="flex min-w-0 flex-1 items-center gap-2" aria-current={on ? 'step' : undefined}>
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition', done ? 'bg-gradient-to-br from-accent to-coral text-white' : on ? 'bg-white text-night' : 'bg-white/10 text-white/50')}>{done ? '✓' : i + 1}</span>
              <span className={cx('truncate text-xs', on ? 'font-semibold text-white' : done ? 'text-white/80' : 'text-white/45')}>{s}</span>
              {i < steps.length - 1 && <span aria-hidden="true" className={cx('h-px flex-1', done ? 'bg-white/40' : 'bg-white/10')} />}
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = i < current, on = i === current;
        return (
          <li key={s} className={cx('flex items-center gap-3 rounded-xl px-3 py-2 transition', on && 'bg-white/10 ring-1 ring-white/15')}>
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition', done ? 'bg-gradient-to-br from-accent to-coral text-white' : on ? 'bg-white text-night' : 'bg-white/10 text-white/50')}>
              {done ? '✓' : i + 1}
            </span>
            <span className={cx('text-sm', on ? 'font-semibold text-white' : done ? 'text-white/80' : 'text-white/45')}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
