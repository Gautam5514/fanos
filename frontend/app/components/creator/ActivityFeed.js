'use client';

// "What's happening" list for the dashboard and the brief. Every update is one row with an icon,
// a short plain heading, the details, and how long ago it happened — easy to scan at a glance.
import { Bell, CheckCircle2, Flag, Handshake, Lightbulb, Rocket, UserPlus } from 'lucide-react';
import { cx } from '../ui';
import { useOpen } from '../shared';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const Q = '[“"]([^”"]+)[”"]';

// [pattern, icon, tone, heading(match), details(match)]
const KINDS = [
  [new RegExp(`^New idea:\\s*${Q}`), Lightbulb, 'bg-amber-soft text-amber', () => 'New idea shared', (m) => m[1]],
  [new RegExp(`^(.+?) offered to help on ${Q}`), Handshake, 'bg-mint-soft text-mint', (m) => `${m[1].replace(/\s*\(.*\)$/, '')} wants to help`, (m) => `On the idea: ${m[2]}`],
  [new RegExp(`^${Q} was selected for a pilot`), Flag, 'bg-accent-soft text-accent', () => 'Idea picked to build', (m) => m[1]],
  [new RegExp(`^Project ${Q} was completed`), CheckCircle2, 'bg-mint-soft text-mint', () => 'Project finished', (m) => m[1]],
  [new RegExp(`^Project ${Q}`), Rocket, 'bg-sky-soft text-sky', () => 'Project started', (m) => m[1]],
  [/^(.+?) joined as an? (.+)$/, UserPlus, 'bg-sky-soft text-sky', (m) => `${m[1]} joined`, (m) => `As a ${m[2]}`],
];

function describe(text) {
  const t = String(text || '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  for (const [re, Icon, tone, head, detail] of KINDS) {
    const m = t.match(re);
    if (m) return { Icon, tone, head: head(m), detail: detail ? detail(m) : '' };
  }
  return { Icon: Bell, tone: 'bg-line-2 text-ink-2', head: 'Update', detail: t };
}

export function timeAgo(at) {
  if (!at) return '';
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
}

export default function ActivityFeed({ items }) {
  const open = useOpen();
  if (!items.length) return <p className="py-4 text-center text-sm text-muted">Nothing yet. New ideas, members and projects will show up here.</p>;
  return (
    <ul className="divide-y divide-line-2">
      {items.map((a) => {
        const { Icon, tone, head, detail } = describe(a.text);
        const onClick = a.ideaId ? () => open.idea(a.ideaId) : a.memberId ? () => open.member(a.memberId) : null;
        const Row = onClick ? 'button' : 'div';
        return (
          <li key={a.id}>
            <Row type={onClick ? 'button' : undefined} onClick={onClick || undefined} className={cx('flex w-full items-start gap-3 py-3 text-left', onClick && 'rounded-xl px-2 -mx-2 transition hover:bg-paper')}>
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{head}</span>
                {detail && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-2">{detail}</span>}
              </span>
              <span className="shrink-0 pt-0.5 text-[11px] text-muted">{timeAgo(a.at)}</span>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
