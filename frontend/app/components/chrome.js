'use client';

// Shared page chrome so every screen carries the landing page's look:
// an aurora backdrop, a dark animated brand panel for split-screen flows,
// a glass top bar for standalone pages, and a consistent page header.
import { Logo, cx } from './ui';

// Grid + slowly drifting color blobs. Place inside a `relative` parent.
export function Aurora({ className, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
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
      <aside className="relative hidden overflow-hidden bg-night lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12">
        <Aurora tone="dark" />
        <div className="relative"><Logo dark /></div>
        <div className="relative">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/50">{eyebrow}</p>}
          {panelTitle && <h2 className="mt-2 text-balance font-display text-3xl font-semibold leading-tight text-white xl:text-4xl">{panelTitle}</h2>}
          {panel && <div className="mt-8">{panel}</div>}
        </div>
        <div className="relative text-sm text-white/45">{panelFooter ?? 'Followers → Communities → Ideas → AI Signals → Action'}</div>
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
      <div className="relative min-w-0 max-w-3xl pl-4">
        {/* Accent bar runs down the left edge of the header. */}
        <span aria-hidden="true" className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-1 rounded-full bg-gradient-to-b from-accent via-[#9b4bf0] to-coral" />
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

// Vertical stepper for the dark brand panel.
export function PanelSteps({ steps, current }) {
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
