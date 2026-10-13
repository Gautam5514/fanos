'use client';

// Small building blocks shared by the creator copilot and the fan assistant.
import { FolderKanban, Inbox, Lightbulb, UserRound, Zap } from 'lucide-react';
import { cx } from './ui';
import { Avatar } from './ui';
import { AiIcon, SpaceIcon } from './icons';
import { prettyModel } from '../lib/aiClient';

// Renders the model's plain text: keeps line breaks and bullets, and turns **bold** into bold.
export function RichText({ text, className }) {
  return (
    <p className={cx('whitespace-pre-line text-sm leading-relaxed text-ink', className)}>
      {text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => (/^\*\*[^*\n]+\*\*$/.test(part) ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : part))}
    </p>
  );
}

// "Based on" chips under an answer — each opens the thing the answer was built from.
export function SourceChips({ sources, onOpen }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Based on</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <button key={`${s.type}:${s.id}`} type="button" onClick={() => onOpen(s)} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1.5 pr-2.5 text-xs text-ink-2 transition hover:border-accent/40 hover:text-accent">
            {s.type === 'member' ? <Avatar name={s.label} size={18} />
              : <span className={cx('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full', s.type === 'idea' ? 'bg-amber-soft text-amber' : s.type === 'project' ? 'bg-mint-soft text-mint' : s.type === 'opportunity' ? 'bg-coral-soft text-coral' : 'bg-accent-soft text-accent')}>
                {s.type === 'idea' ? <Lightbulb className="h-3 w-3" aria-hidden="true" /> : s.type === 'project' ? <FolderKanban className="h-3 w-3" aria-hidden="true" /> : s.type === 'opportunity' ? <Inbox className="h-3 w-3" aria-hidden="true" /> : s.type === 'space' ? <SpaceIcon name={s.label} className="h-3 w-3" /> : <UserRound className="h-3 w-3" aria-hidden="true" />}
              </span>}
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiMeta({ meta }) {
  if (!meta) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted"><Zap className="h-3 w-3 text-accent" aria-hidden="true" /> Groq · {prettyModel(meta.model)}{meta.tps ? ` · ${meta.tps} tok/s` : ''} · {(meta.ms / 1000).toFixed(1)}s</p>
  );
}

// The "Ask AI" button for the top bar (creator and fan). Icon-only on phones, with a label on larger screens.
export function AskAiButton({ onClick, className }) {
  return (
    <button type="button" onClick={onClick} aria-label="Ask AI" title="Ask AI"
      className={cx('group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full pl-1.5 pr-1.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(91,61,245,.75)] ring-1 ring-white/20 transition hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(91,61,245,.85)] active:scale-95 sm:pr-4', className)}>
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-accent via-[#9b4bf0] to-coral" />
      <span aria-hidden="true" className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition duration-700 group-hover:translate-x-[420%] group-hover:opacity-100" />
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30"><AiIcon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
      <span className="relative hidden sm:inline">Ask AI</span>
    </button>
  );
}
