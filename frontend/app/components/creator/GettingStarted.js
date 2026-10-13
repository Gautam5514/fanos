'use client';

// Simple 5-step checklist for creators. Each step completes by itself from real data, shows one
// button, and the first unfinished step is highlighted as "Next". Hides when done or dismissed.
import { useState } from 'react';
import { Boxes, Check, Copy, Lightbulb, Link2, Rocket, UserCog, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button, cx } from '../ui';

const HIDE_KEY = 'fanos_checklist_hidden';
const COPIED_KEY = 'fanos_invite_copied';
const read = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const write = (k) => { try { localStorage.setItem(k, '1'); } catch { /* private mode */ } };

export function useInviteLink() {
  const { state } = useStore();
  return typeof window !== 'undefined' && state.user?.id ? `${window.location.origin}/join/${encodeURIComponent(state.user.id)}` : '';
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}

// One-tap "copy my invite link" with clear feedback; also records that the step is done.
export function CopyInviteButton({ label = 'Copy invite link', variant = 'secondary', size = 'md', className, onCopied }) {
  const { dispatch } = useStore();
  const link = useInviteLink();
  const [done, setDone] = useState(false);
  const click = async () => {
    if (!link) return;
    if (await copyText(link)) {
      write(COPIED_KEY); onCopied?.(); setDone(true); setTimeout(() => setDone(false), 1800);
    } else dispatch({ type: 'TOAST', toast: { text: 'Couldn’t copy — open Settings → profile menu to copy your link.' } });
  };
  return <Button variant={variant} size={size} className={className} icon={done ? Check : Link2} onClick={click} disabled={!link}>{done ? 'Copied!' : label}</Button>;
}

export default function GettingStarted({ go }) {
  const { state, dispatch } = useStore();
  const [hidden, setHidden] = useState(() => read(HIDE_KEY));
  const [copied, setCopied] = useState(() => read(COPIED_KEY));

  const steps = [
    { id: 'accounts', icon: UserCog, title: 'Connect your accounts', text: 'Add Instagram, Facebook and more so followers can find you.', done: (state.creator?.platforms || []).length >= 2,
      action: <Button size="sm" variant="secondary" onClick={() => go('profile')}>Add accounts</Button> },
    { id: 'space', icon: Boxes, title: 'Create your first space', text: 'A space groups fans by interest, like “AI” or “Design”.', done: state.communities.length > 0,
      action: <Button size="sm" variant="accent" onClick={() => dispatch({ type: 'NAV', patch: { modal: { type: 'community' } } })}>Create space</Button> },
    { id: 'share', icon: Link2, title: 'Share your invite link', text: 'Paste it in your video description or pinned comment.', done: copied || state.members.length > 0,
      action: <CopyInviteButton size="sm" variant="accent" onCopied={() => setCopied(true)} /> },
    { id: 'members', icon: Rocket, title: 'Welcome your first members', text: 'They show up here as soon as they join.', done: state.members.length > 0,
      action: <Button size="sm" variant="secondary" onClick={() => go('people')}>See members</Button> },
    { id: 'ideas', icon: Lightbulb, title: 'Collect your first idea', text: 'Ask your audience what they want you to make next.', done: state.ideas.length > 0,
      action: <Button size="sm" variant="secondary" onClick={() => go('ideas')}>Open ideas</Button> },
    { id: 'project', icon: Rocket, title: 'Start your first project', text: 'Pick a great idea and build it with your community.', done: state.projects.length > 0,
      action: <Button size="sm" variant="secondary" onClick={() => go('ideas')}>Choose an idea</Button> },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (hidden || doneCount === steps.length) return null;
  const nextId = steps.find((s) => !s.done)?.id;

  return (
    <section aria-label="Getting started" className="card animate-fade-up p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">Get started in {steps.length} easy steps</h2>
          <p className="mt-0.5 text-sm text-ink-2">{doneCount} of {steps.length} done{doneCount >= 3 ? ' — almost there.' : ' — one small step at a time.'}</p>
        </div>
        <button type="button" onClick={() => { write(HIDE_KEY); setHidden(true); }} aria-label="Hide checklist" title="Hide checklist" className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-line-2 hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-2" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-coral transition-all duration-700" style={{ width: `${Math.max(4, (doneCount / steps.length) * 100)}%` }} />
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          if (s.done && doneCount >= 3) return null; // once you're well along, show only what's left
          const next = s.id === nextId;
          return (
            <li key={s.id} className={cx('flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition sm:flex-nowrap', next ? 'border-accent/30 bg-accent-soft/60 ring-4 ring-accent/5' : 'border-line bg-white', s.done && 'opacity-60')}>
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', s.done ? 'bg-mint text-white' : next ? 'bg-accent text-white' : 'bg-line-2 text-muted')}>
                {s.done ? <Check className="h-4 w-4" aria-label="Done" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm font-semibold text-ink', s.done && 'line-through decoration-ink/30')}>{s.title}{next && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white no-underline">Next</span>}</span>
                <span className="block text-xs text-muted">{s.text}</span>
              </span>
              {!s.done && <span className="shrink-0">{s.action}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
