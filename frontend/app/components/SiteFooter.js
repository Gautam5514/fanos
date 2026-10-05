'use client';

// Landing footer: brand + link columns, then an oversized gradient "FanOS" wordmark
// that fades into the page edge (the large-type footer look).
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { Logo } from './ui';

// Footer social links (inline brand SVG — lucide v1 dropped brand icons).
const SOCIALS = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/gautam-pandit-4b185224b/', path: 'M4.98 3.5A2.5 2.5 0 1 1 2.49 6 2.5 2.5 0 0 1 4.98 3.5zM2.75 8.75h4.5V21h-4.5zM9.75 8.75h4.31v1.67h.06a4.72 4.72 0 0 1 4.25-2.33c4.54 0 5.38 2.99 5.38 6.88V21h-4.5v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.69V21h-4.5z' },
  { name: 'GitHub', href: 'https://github.com/Gautam5514', path: 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z' },
  { name: 'X', href: 'https://x.com/Gautamp5514', path: 'M18.9 2.5h3.3l-7.2 8.24L23.5 21.5h-6.63l-5.2-6.8-5.95 6.8H2.4l7.7-8.8L2.1 2.5h6.8l4.7 6.2zm-1.16 17h1.83L7.3 4.4H5.33z' },
  { name: 'YouTube', href: 'https://www.youtube.com/@Gopoworkspace', path: 'M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.4.52A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.12c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52a3 3 0 0 0 2.1-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5zM9.6 15.5v-7l6.2 3.5z' },
];

function SocialLinks() {
  return (
    <nav aria-label="Social links" className="flex items-center gap-1.5">
      {SOCIALS.map(({ name, href, path }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-sm">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
        </a>
      ))}
    </nav>
  );
}

function Column({ title, links }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, onClick]) => (
          <li key={label}>
            <button onClick={onClick} className="group inline-flex items-center gap-1 text-[15px] text-ink-2 transition hover:text-ink">
              {label}
              <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter({ onSignup, onLogin, scrollTo }) {
  return (
    <footer className="relative mt-8 overflow-hidden border-t border-line bg-white/50">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[min(1100px,100%)] -translate-x-1/2 rounded-full bg-gradient-to-r from-accent/20 via-[#c06bff]/15 to-coral/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12">
          <div className="col-span-2 max-w-md md:col-span-1">
            <Logo size={30} />
            <p className="mt-4 text-pretty text-[15px] leading-relaxed text-ink-2">
              Discord organizes conversations. FanOS organizes the value hidden inside an audience.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <button onClick={() => onSignup('creator')} className="group inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-4 pr-2 text-sm font-medium text-white transition hover:bg-ink/90">
                Create my community
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-coral transition group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
              </button>
              <SocialLinks />
            </div>
          </div>
          <Column title="Product" links={[['How it works', () => scrollTo('how')], ['Why FanOS', () => scrollTo('problem')], ['Features', () => scrollTo('features')]]} />
          <Column title="Creators" links={[['Create a community', () => onSignup('creator')], ['Log in', onLogin]]} />
          <Column title="Fans" links={[['Join a community', () => onSignup('member')], ['Log in', onLogin]]} />
        </div>

        <div className="mt-14 flex flex-col-reverse items-center justify-between gap-4 border-t border-line py-6 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} FanOS. Built for creators and the people who follow them.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-ink-2 transition hover:border-ink/20 hover:text-ink">
            Back to top <ArrowUp className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the page bottom */}
      <div aria-hidden="true" className="footer-wordmark relative select-none text-center font-display font-bold leading-[0.78] tracking-[-0.06em]">
        FanOS
      </div>
    </footer>
  );
}
