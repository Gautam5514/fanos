'use client';

// "What needs your attention" list, shared by the Dashboard and the Community Brief.
// Items come from buildBrief(); their emoji marker is mapped to a proper icon here.
import { ArrowRight, Briefcase, Flame, Gem, Handshake, Layers, Lightbulb, TriangleAlert } from 'lucide-react';
import { cx } from '../ui';

export const ICON = { '🔥': [Flame, 'bg-coral-soft text-coral'], '🧩': [Layers, 'bg-accent-soft text-accent'], '💡': [Lightbulb, 'bg-amber-soft text-amber'], '🤝': [Handshake, 'bg-mint-soft text-mint'], '💼': [Briefcase, 'bg-sky-soft text-sky'], '🌟': [Gem, 'bg-accent-soft text-accent'], '⚠️': [TriangleAlert, 'bg-coral-soft text-coral'] };

export default function PriorityList({ items, onAction, limit, empty = 'Nothing needs your attention right now.' }) {
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line-2">
      {list.map((t, i) => {
        const [Icon, tone] = ICON[t.icon] || [Lightbulb, 'bg-line-2 text-ink-2'];
        return (
          <li key={i} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
            <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-ink">{t.title}</p>
              {t.detail && <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{t.detail}</p>}
            </div>
            {t.action && (
              <button type="button" onClick={() => onAction(t.action)} className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/40 hover:text-accent">
                {t.action.label}<ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
