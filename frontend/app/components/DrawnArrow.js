'use client';

// Hand-drawn arrow that draws itself when it scrolls into view, then a dot travels along it.
// Reuses the `.squiggle` animation styles from globals.css (also used by HowItWorks).
//   variant "curl-down": hook at the top-right, S-curve, arrowhead pointing down-left.
//   variant "wave":      short wavy arrow pointing right (between cards).
import { useEffect, useId, useRef } from 'react';
import { cx } from './ui';

const SHAPES = {
  'curl-down': {
    viewBox: '0 0 120 110',
    line: 'M80 6 C62 12 62 28 84 32 C114 38 118 52 92 65 C70 77 46 87 24 98',
    head: 'M15 102 L25.5 87.5 Q27 95.5 33 101.5 Z',
  },
  wave: {
    viewBox: '0 0 60 30',
    line: 'M4 18 C14 6 24 6 30 15 C36 24 44 24 50 15',
    head: 'M57 10 L48.5 9 Q50.5 13.5 49 19.5 Z',
  },
};

export default function DrawnArrow({ variant = 'wave', className, delay = 0, tone = 'gradient' }) {
  const ref = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const shape = SHAPES[variant];

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stroke = tone === 'light' ? '#ffffff' : `url(#da${uid})`;
  return (
    <svg ref={ref} viewBox={shape.viewBox} className={cx('squiggle overflow-visible', className)} style={{ '--d': `${delay}s` }} aria-hidden="true">
      <defs>
        <linearGradient id={`da${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3df5" /><stop offset=".55" stopColor="#b03ff0" /><stop offset="1" stopColor="#ff5a36" />
        </linearGradient>
      </defs>
      <path id={`dp${uid}`} className="squiggle-line" d={shape.line} pathLength="1" fill="none" stroke={stroke} strokeOpacity={tone === 'light' ? 0.75 : 1} strokeWidth={variant === 'wave' ? 2.4 : 3.4} strokeLinecap="round" strokeLinejoin="round" />
      <path className="squiggle-head" d={shape.head} fill={tone === 'light' ? '#ffffff' : '#ff5a36'} fillOpacity={tone === 'light' ? 0.85 : 1} />
      <circle className="squiggle-dot" r={variant === 'wave' ? 2.2 : 3.4} fill="#fff" stroke="#5b3df5" strokeWidth="1.6">
        <animateMotion dur={variant === 'wave' ? '1.8s' : '2.6s'} repeatCount="indefinite"><mpath href={`#dp${uid}`} /></animateMotion>
      </circle>
    </svg>
  );
}
