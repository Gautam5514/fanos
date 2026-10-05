'use client';

// Decision-ready "Action Brief" shown on every idea: problem, community evidence,
// who can help, what's missing and the next practical step (see lib/ai.js → actionBrief).
import { AlertTriangle, CheckCircle2, Lightbulb, MessageSquareQuote, Sparkles, UserPlus, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { actionBrief, summarizeIdea } from '../lib/ai';
import { Avatar, Button, cx } from './ui';
import { StageTrack } from './shared';

const NEXT_LABEL = { select: 'Select for pilot', workspace: 'Create workspace', 'open-project': 'Open project', promote: 'Promote', invite: 'Invite', restore: 'Restore idea' };

function Block({ icon: Icon, title, tone = 'text-muted', className, children }) {
  return (
    <div className={cx('min-w-0', className)}>
      <p className={cx('mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em]', tone)}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{title}</p>
      {children}
    </div>
  );
}

export default function ActionBrief({ idea, isCreator, onAction }) {
  const { state, intel } = useStore();
  const brief = useMemo(() => actionBrief(idea, state, intel), [idea, state, intel]);
  const summary = idea.aiSummary || summarizeIdea(idea);

  return (
    <section aria-labelledby={`brief-${idea.id}`} className="mt-5 overflow-hidden rounded-2xl border border-accent/20 bg-white shadow-card">
      <div className="ai-glow border-b border-line px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h3 id={`brief-${idea.id}`} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Action Brief</h3>
          <span className="text-[11px] text-muted">Built from community activity</span>
        </div>
        <div className="mt-3"><StageTrack stage={brief.stage} /></div>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
        <Block icon={Lightbulb} title="Problem" className="sm:col-span-2">
          <p className="text-[15px] font-medium leading-snug text-ink">{brief.problem}</p>
          <p className="mt-1 text-sm text-ink-2">{summary}</p>
        </Block>

        <Block icon={CheckCircle2} title="Evidence" tone="text-mint">
          <ul className="space-y-1">
            {brief.evidence.map((e) => <li key={e} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint" />{e}</li>)}
          </ul>
        </Block>

        <Block icon={Users} title="Who can help" tone="text-accent">
          {brief.helpers.length ? (
            <ul className="space-y-1.5">
              {brief.helpers.map(({ member, note }) => (
                <li key={member.id} className="flex items-center gap-2">
                  <Avatar name={member.name} size={24} />
                  <span className="min-w-0 text-sm"><span className="font-medium text-ink">{member.name}</span> <span className="text-muted">· {member.role}</span>{note && <span className="block truncate text-xs text-muted">“{note}”</span>}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nobody has offered to help yet.</p>}
        </Block>

        <Block icon={AlertTriangle} title="What's missing" tone="text-coral" className={brief.quotes.length ? '' : 'sm:col-span-2'}>
          {brief.missing.length ? (
            <ul className="space-y-1">
              {brief.missing.map((m) => <li key={m} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-coral" />{m}</li>)}
            </ul>
          ) : <p className="text-sm text-ink-2">Nothing critical — the needed skills are covered.</p>}
          {brief.candidates.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <p className="text-xs text-muted">Members who match:</p>
              {brief.candidates.map(({ member, need }) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar name={member.name} size={22} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{member.name} <span className="text-muted">· {need}</span></span>
                  {isCreator && <button onClick={() => onAction('invite', member.id)} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent hover:bg-accent-soft"><UserPlus className="h-3 w-3" aria-hidden="true" />Invite</button>}
                </div>
              ))}
            </div>
          )}
        </Block>

        {brief.quotes.length > 0 && (
          <Block icon={MessageSquareQuote} title="What people said">
            <ul className="space-y-2">
              {brief.quotes.map((q, i) => <li key={i} className="rounded-xl bg-paper px-3 py-2 text-sm text-ink-2">“{q.text}” <span className="text-xs text-muted">— {q.by}</span></li>)}
            </ul>
          </Block>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-paper/70 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
        <p className="flex-1 text-sm text-ink"><span className="mr-1.5 font-semibold text-accent">Next step:</span>{brief.next.text}</p>
        {isCreator && NEXT_LABEL[brief.next.action] && (
          <Button size="sm" variant="primary" arrow className="shrink-0" onClick={() => onAction(brief.next.action, brief.next.member)}>{NEXT_LABEL[brief.next.action]}</Button>
        )}
      </div>
    </section>
  );
}

