'use client';

// Landing hero: word-by-word headline reveal, a rotating verb, a hand-drawn underline,
// and a cursor spotlight. The sides stay empty on purpose: the headline and product carry the hero.
import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { cx } from './ui';

const VERBS = ['builds', 'ships', 'grows', 'creates'];
const LEAD = 'Turn your audience into a community that'.split(' ');
const TRUST = ['Free to start', 'Built-in AI — no API key needed', 'Followers join with one link'];

function RotatingVerb() {
  const [i, setI] = useState(0);
  const [width, setWidth] = useState(null);
  const refs = useRef([]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % VERBS.length), 2600);
    return () => clearInterval(t);
  }, []);
  // The slot animates to the active word's width, so the sentence closes up around short verbs.
  useEffect(() => {
    const measure = () => setWidth(refs.current[i]?.offsetWidth || null);
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [i]);
  return (
    <span className="hero-verb-slot inline-grid align-baseline transition-[width] duration-500 ease-[cubic-bezier(.16,1,.3,1)]" style={width ? { width } : undefined}>
      {VERBS.map((v, n) => (
        <span key={v} ref={(el) => { refs.current[n] = el; }} className={cx('hero-verb ai-gradient-animated col-start-1 row-start-1 justify-self-start whitespace-nowrap pb-[0.12em] pr-[0.04em]', n === i ? 'is-on' : n === (i + VERBS.length - 1) % VERBS.length ? 'is-off' : 'is-wait')}>{v}</span>
      ))}
    </span>
  );
}

export default function Hero({ primaryCta, onSecondary, onBadge }) {
  const ref = useRef(null);

  // Cursor spotlight: write the pointer position into CSS vars (no re-render).
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div ref={ref} onPointerMove={onMove} className="hero-spot relative">
      {/* Background: grid, drifting aurora blobs, cursor spotlight */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="hero-blob absolute -top-24 left-[12%] h-[380px] w-[380px] rounded-full bg-accent/25 blur-3xl" />
        <div className="hero-blob absolute -top-10 right-[10%] h-[340px] w-[340px] rounded-full bg-coral/20 blur-3xl [animation-delay:-6s]" />
        <div className="hero-blob absolute left-1/2 top-40 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#c06bff]/15 blur-3xl [animation-delay:-12s]" />
        <div className="hero-spotlight absolute inset-0" />
      </div>

      {/* Badge — kept exactly as before */}
      <button onClick={onBadge} className="group mx-auto inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-white/80 py-1 pl-1 pr-3 text-xs font-medium text-ink-2 shadow-sm backdrop-blur transition hover:border-accent/30">
        <span className="rounded-full bg-gradient-to-r from-accent to-coral px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">New</span>
        AI Signal Score for every idea
        <ArrowRight className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
      </button>

      <h1 className="mx-auto mt-7 max-w-5xl text-balance font-display text-[2.6rem] font-semibold leading-[1.06] text-ink sm:text-6xl lg:text-7xl">
        <span className="sr-only">Turn your audience into a community that builds with you.</span>
        <span aria-hidden="true">
          {LEAD.map((w, i) => <Fragment key={i}><span className="hero-word" style={{ '--d': `${i * 0.06}s` }}>{w}</span>{' '}</Fragment>)}
          <span className="hero-word" style={{ '--d': `${LEAD.length * 0.06}s` }}><RotatingVerb /></span>{' '}
          <span className="hero-word relative inline-block whitespace-nowrap" style={{ '--d': `${(LEAD.length + 1) * 0.06}s` }}>
            <span className="ai-gradient-animated">with you.</span>
            <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="hero-underline absolute -bottom-[0.12em] left-0 h-[0.28em] w-full overflow-visible">
              <path d="M4 16 C 60 6, 130 4, 200 9 S 280 18, 296 8" pathLength="1" fill="none" stroke="url(#hero-ul)" strokeWidth="5" strokeLinecap="round" />
              <defs><linearGradient id="hero-ul" x1="0" x2="1"><stop offset="0" stopColor="#5b3df5" /><stop offset="1" stopColor="#ff5a36" /></linearGradient></defs>
            </svg>
          </span>
        </span>
      </h1>

      <p className="mx-auto mt-7 max-w-2xl animate-fade-up text-pretty text-lg text-ink-2 [animation-delay:600ms] sm:text-xl">
        FanOS organizes your followers, surfaces the ideas worth building, finds the right people - and turns it all into real projects.
      </p>

      <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:700ms] sm:flex-row">
        <span className="hero-cta relative inline-flex rounded-full p-[2px]">{primaryCta}</span>
        <button type="button" onClick={onSecondary} className="group inline-flex h-12 items-center gap-2.5 rounded-full border border-line bg-white/80 py-1.5 pl-1.5 pr-5 text-[15px] font-medium text-ink shadow-sm backdrop-blur transition hover:border-ink/20 hover:bg-white hover:shadow-md active:scale-[.98]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-coral text-white shadow-sm shadow-accent/30 ring-1 ring-white/60 transition group-hover:shadow-md group-hover:shadow-accent/40">
            <ArrowDown className="h-4 w-4 transition group-hover:translate-y-0.5" aria-hidden="true" />
          </span>
          See how it works
        </button>
      </div>

      <ul className="mx-auto mt-8 flex max-w-2xl animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted [animation-delay:800ms]">
        {TRUST.map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
            <span className="whitespace-nowrap">{t}</span>
          </li>
        ))}
      </ul>

    </div>
  );
}

// Product preview that starts tilted back in 3D and rises flat as the page scrolls.
// Scroll progress is written into a CSS variable, so scrolling never re-renders React.
export function TiltOnScroll({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.setProperty('--p', '1'); return undefined; }
    let raf = 0;
    const update = () => { raf = 0; el.style.setProperty('--p', Math.min(1, window.scrollY / 520).toFixed(3)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={ref} className="hero-tilt">
      <div className="hero-tilt-inner">{children}</div>
    </div>
  );
}
