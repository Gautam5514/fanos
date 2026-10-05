'use client';

// "How it works" flow for the landing page: six steps laid out as a snake
// (1 → 2 → 3, down, 4 ← 5 ← 6 visually reversed on the second row) joined by
// hand-drawn looping arrows that draw themselves when scrolled into view.
import { useEffect, useId, useRef } from 'react';
import { Users, Layers, Lightbulb, Sparkles, Handshake, Rocket } from 'lucide-react';
import { cx } from './ui';

const STEPS = [
  ['Followers', Users, 'An unstructured crowd across every platform.', 'DMs, comments & mentions'],
  ['Communities', Layers, 'Organized by interest, skill and goals.', 'Interest-based spaces'],
  ['Ideas', Lightbulb, 'Structured contributions instead of random DMs.', 'Title, need, help wanted'],
  ['AI Signals', Sparkles, 'Noise in, what actually matters out.', 'Scored 0–100'],
  ['Collaboration', Handshake, 'The right people matched to the right idea.', 'AI-picked teams'],
  ['Action', Rocket, 'Real projects, shipped and promoted.', 'Build • launch • promote'],
];

// Hand-drawn arrow with a loop (viewBox 0 0 160 80), pointing right.
const LINE = 'M6 46 C26 18 50 14 62 34 C72 52 98 60 104 40 C110 20 84 16 82 36 C80 56 110 62 150 46';
const HEAD = 'M152 45 Q141 44 132 39 Q138 49 139 60 Q145 51 152 45 Z';
const HATCH = 'M137 44 L140 50 M141 45 L143 51 M136 49 L139 55';

const STAGGER = 0.3; // seconds between consecutive pieces on desktop

function Squiggle({ delay = 0, className }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg data-reveal viewBox="0 0 160 80" className={cx('squiggle overflow-visible', className)} style={{ '--d': `${delay}s` }} aria-hidden="true">
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5b3df5" />
          <stop offset="0.55" stopColor="#b03ff0" />
          <stop offset="1" stopColor="#ff5a36" />
        </linearGradient>
      </defs>
      <path id={`sp${uid}`} className="squiggle-line" d={LINE} pathLength="1" fill="none" stroke={`url(#sg${uid})`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <g className="squiggle-head">
        <path d={HEAD} fill="#ff5a36" stroke="#ff5a36" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={HATCH} stroke="#fff" strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle className="squiggle-dot" r="3.6" fill="#fff" stroke="#5b3df5" strokeWidth="2">
        <animateMotion dur="2.8s" repeatCount="indefinite" calcMode="linear"><mpath href={`#sp${uid}`} /></animateMotion>
      </circle>
    </svg>
  );
}

function Step({ i, delay = 0 }) {
  const [label, Icon, sub, chip] = STEPS[i];
  const ai = i === 3, dark = i === 5;
  return (
    <div data-reveal className={cx('how-step group relative h-full overflow-hidden rounded-[20px] p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-pop', dark ? 'bg-gradient-to-br from-[#5b3df5] via-[#9b3ff0] to-[#ff5a36] shadow-[0_18px_50px_-14px_rgba(255,90,54,.55)]' : ai ? 'ai-border ai-glow shadow-card' : 'card')} style={{ '--d': `${delay}s` }}>
      <span aria-hidden="true" className={cx('pointer-events-none absolute -right-1 -top-4 select-none font-display text-[5.5rem] font-bold leading-none', dark ? 'text-white/15' : ai ? 'text-accent/10' : 'text-ink/[.04]')}>0{i + 1}</span>
      <div className="relative flex items-center gap-3">
        <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110', dark ? 'bg-white/20 text-white ring-1 ring-white/30' : ai ? 'bg-gradient-to-br from-accent to-coral text-white shadow-lg shadow-accent/30' : 'bg-accent-soft text-accent')}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={cx('text-[11px] font-semibold uppercase tracking-[.14em]', dark ? 'text-white/75' : ai ? 'text-accent' : 'text-muted')}>Step 0{i + 1}</p>
          <p className={cx('font-display text-lg font-semibold', dark ? 'text-white' : 'text-ink')}>{label}</p>
        </div>
      </div>
      <p className={cx('relative mt-3 text-sm leading-relaxed', dark ? 'text-white/85' : 'text-ink-2')}>{sub}</p>
      <span className={cx('relative mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium', dark ? 'bg-white/20 text-white' : ai ? 'bg-accent-soft text-accent' : 'bg-line-2 text-ink-2')}>
        <span className={cx('h-1.5 w-1.5 rounded-full', dark ? 'bg-white' : 'bg-accent')} />{chip}
      </span>
    </div>
  );
}

export default function HowItWorks() {
  const ref = useRef(null);

  // Reveal each piece as it scrolls into view (CSS handles the staggered animation).
  useEffect(() => {
    const els = ref.current?.querySelectorAll('[data-reveal]') || [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const d = (k) => k * STAGGER;
  const ROW = 'grid grid-cols-[1fr_7.5rem_1fr_7.5rem_1fr] items-center';

  return (
    <div ref={ref} className="mt-14">
      {/* Desktop: snake layout */}
      <div className="hidden lg:block" aria-hidden="true">
        <div className={ROW}>
          <Step i={0} delay={d(0)} />
          <Squiggle delay={d(1)} className="w-full px-2" />
          <Step i={1} delay={d(2)} />
          <Squiggle delay={d(3)} className="w-full -scale-y-100 px-2" />
          <Step i={2} delay={d(4)} />
        </div>
        <div className={ROW}>
          <div className="col-start-5 flex h-36 items-center justify-center">
            <Squiggle delay={d(5)} className="w-36 rotate-90" />
          </div>
        </div>
        <div className={ROW}>
          <Step i={5} delay={d(10)} />
          <Squiggle delay={d(9)} className="w-full -scale-x-100 px-2" />
          <Step i={4} delay={d(8)} />
          <Squiggle delay={d(7)} className="w-full -scale-100 px-2" />
          <Step i={3} delay={d(6)} />
        </div>
      </div>

      {/* Mobile / tablet: vertical flow (also the accessible list) */}
      <ol className="mx-auto max-w-md lg:sr-only" aria-label="How FanOS works">
        {STEPS.map(([label], i) => (
          <li key={label}>
            <Step i={i} />
            {i < STEPS.length - 1 && (
              <div className="flex h-24 items-center justify-center" aria-hidden="true">
                <Squiggle delay={0.15} className={cx('w-24 rotate-90', i % 2 && '-scale-y-100')} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
