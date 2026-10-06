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
  // A hand-drawn swoosh that dips then rises into a bold arrowhead pointing right —
  // modelled on the reference image's organic curved arrow.
  wave: {
    viewBox: '0 0 72 34',
    line: 'M3 11 C16 4 24 24 36 24 C47 24 52 12 61 11',
    head: 'M69 10.5 L58 7 C60.5 11 60.5 15.5 57.5 19.5 Z',
  },
};

export default function DrawnArrow({ variant = 'wave', className, delay = 0, tone = 'gradient', style }) {
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
    <svg ref={ref} viewBox={shape.viewBox} className={cx('squiggle overflow-visible', className)} style={{ '--d': `${delay}s`, ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`da${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3df5" /><stop offset=".55" stopColor="#b03ff0" /><stop offset="1" stopColor="#ff5a36" />
        </linearGradient>
      </defs>
      <path id={`dp${uid}`} className="squiggle-line" d={shape.line} pathLength="1" fill="none" stroke={stroke} strokeOpacity={tone === 'light' ? 0.8 : 1} strokeWidth={variant === 'wave' ? 3 : 3.4} strokeLinecap="round" strokeLinejoin="round" />
      <path className="squiggle-head" d={shape.head} fill={tone === 'light' ? '#ffffff' : '#ff5a36'} fillOpacity={tone === 'light' ? 0.9 : 1} />
      <circle className="squiggle-dot" r={variant === 'wave' ? 2.4 : 3.4} fill="#fff" stroke="#5b3df5" strokeWidth="1.6">
        <animateMotion dur={variant === 'wave' ? '2s' : '2.6s'} repeatCount="indefinite"><mpath href={`#dp${uid}`} /></animateMotion>
      </circle>
    </svg>
  );
}
