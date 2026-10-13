'use client';

// Account menu for the app top bar: avatar + name button that opens a dropdown with the
// user's details and account actions. Shared by the creator and member apps.
import { useEffect, useId, useRef, useState } from 'react';
import { Avatar, cx } from './ui';

// sections: [[{ icon, label, onClick, danger? }, ...], ...] — rendered with dividers between.
export default function ProfileMenu({ name, email, sections, avatar }) {
  const [open, setOpen] = useState(false);
  const viaKeyboard = useRef(false); // focus the first item only when opened from the keyboard
  const ref = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...ref.current.querySelectorAll('[role="menuitem"]')];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { if (viaKeyboard.current) ref.current?.querySelector('[role="menuitem"]')?.focus(); }, 0);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn?.(); };
  const display = name || 'Your account';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={(e) => { viaKeyboard.current = e.detail === 0; setOpen((o) => !o); }} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`Account menu — ${display}`} title={display}
        className={cx('rounded-full p-[3px] outline-none ring-2 transition-all duration-200 focus-visible:ring-accent', open ? 'bg-white ring-accent shadow-md' : 'bg-white/80 ring-line shadow-sm hover:ring-accent/60 hover:shadow-md')}>
        <Avatar name={display} size={34} src={avatar} />
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Account" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 origin-top-right animate-pop overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-4 py-3.5">
            <Avatar name={display} size={44} src={avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{display}</p>
              {email && <p className="truncate text-xs text-muted">{email}</p>}
            </div>
          </div>
          {sections.map((items, si) => (
            <div key={si} className={cx('p-1', si > 0 && 'border-t border-line')}>
              {items.map(({ icon: Icon, label, onClick, danger }) => (
                <button key={label} type="button" role="menuitem" onClick={run(onClick)}
                  className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none transition focus-visible:outline-none', danger ? 'text-coral hover:bg-coral-soft focus-visible:bg-coral-soft' : 'text-ink hover:bg-line-2 focus-visible:bg-line-2')}>
                  <Icon className={cx('h-4 w-4 shrink-0', danger ? 'text-coral' : 'text-muted')} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
