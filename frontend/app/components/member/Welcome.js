'use client';

// One-time "you're in" moment shown right after a member finishes onboarding.
// Onboarding sets the flag; this clears it on first view so refreshes never re-show it.
import { useState } from 'react';
import { BadgeCheck, Lightbulb, PartyPopper, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { CREATOR } from '../../lib/seed';
import { Avatar, Button, Modal } from '../ui';
import { SpaceIcon } from '../icons';

export const WELCOME_KEY = 'fanos_welcome_member';

export function flagWelcome() { try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch { /* private mode */ } }

function consumeFlag() {
  try { const v = sessionStorage.getItem(WELCOME_KEY) === '1'; if (v) sessionStorage.removeItem(WELCOME_KEY); return v; } catch { return false; }
}

export default function Welcome({ me, go, onShare }) {
  const { state } = useStore();
  const [open, setOpen] = useState(consumeFlag);
  if (!open) return null;
  const close = () => setOpen(false);
  const first = me.name.split(' ')[0];
  const spaces = state.communities.filter((c) => me.communities.includes(c.id));
  const actions = [
    [Lightbulb, 'Share your first idea', `Tell ${CREATOR.firstName} what you'd love to see or build.`, () => { close(); onShare(); }],
    [Users, 'Meet the community', 'See who else is here and what they can do.', () => { close(); go('people'); }],
  ];
  return (
    <Modal open onClose={close} width="max-w-lg" labelledBy="welcome-title">
      <div className="p-7 sm:p-9">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-coral text-white shadow-[0_14px_34px_-12px_rgba(91,61,245,.6)]"><PartyPopper className="h-7 w-7" aria-hidden="true" /></span>
        <h2 id="welcome-title" className="mt-5 font-display text-3xl font-semibold text-ink">Welcome, <span className="ai-gradient-animated">{first}</span>!</h2>
        <p className="mt-2 text-ink-2">You&rsquo;re now part of {CREATOR.name ? `${CREATOR.firstName}’s` : 'the'} community. Here&rsquo;s the best way to start.</p>

        {CREATOR.name && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-line-2 px-4 py-3">
            <Avatar name={CREATOR.name} size={36} src={CREATOR.avatar} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{CREATOR.name}</p>
            <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-label="Creator" />
          </div>
        )}
        {spaces.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {spaces.slice(0, 5).map((c) => <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent"><SpaceIcon name={c.name} className="h-3.5 w-3.5" />{c.name}</span>)}
            {spaces.length > 5 && <span className="rounded-full bg-line-2 px-2.5 py-1 text-muted">+{spaces.length - 5} more</span>}
          </p>
        )}

        <ul className="mt-6 space-y-2">
          {actions.map(([Icon, t, d, fn]) => (
            <li key={t}>
              <button type="button" onClick={fn} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="text-sm"><span className="font-semibold text-ink">{t}</span><span className="block text-xs text-muted">{d}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={close}>Explore the community</Button>
      </div>
    </Modal>
  );
}
