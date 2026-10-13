'use client';

// The fan-side AI assistant: ask anything about the community's ideas, people and projects in your own
// words (English or Hinglish). Answers stream in from the server-side agent and cite what they used.
import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { CREATOR } from '../lib/seed';
import { AI_SUGGESTIONS, aiStream } from '../lib/aiClient';
import { Button } from './ui';
import { RichText, SourceChips } from './AiParts';
import { AiIcon } from './icons';
import { useOpen } from './shared';

export default function AiAssistant({ open, onClose, go, initialQuestion }) {
  const { state } = useStore();
  const openM = useOpen();
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sent = useRef(false);
  const abort = useRef(null);

  const send = (q) => {
    const question = q.trim().slice(0, 400);
    if (!question || thinking) return;
    setInput('');
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setThinking(true);
    let acc = ''; let shown = false;
    const upsert = (patch) => {
      const first = !shown; shown = true;
      setMessages((m) => (first ? [...m, { role: 'ai', text: '', ...patch }] : m.map((x, i) => (i === m.length - 1 ? { ...x, ...patch } : x))));
    };
    abort.current = new AbortController();
    aiStream({ question, history, creator: CREATOR.name }, {
      onToken: (t) => { acc += t; upsert({ text: acc, streaming: true }); setStatus(''); setThinking(false); },
      onStatus: setStatus,
      onReset: () => { acc = ''; if (shown) upsert({ text: '' }); },
    }, abort.current.signal).then((r) => {
      if (r.aborted) return;
      if (r.ok) upsert({ text: acc, streaming: false, meta: r.meta, sources: r.sources });
      else if (shown) upsert({ text: acc, streaming: false });
      else setMessages((m) => [...m, { role: 'ai', text: r.error || 'The AI is unavailable right now. Please try again in a moment.', error: true }]);
    }).finally(() => { setThinking(false); setStatus(''); });
  };

  // A question handed in from elsewhere (the search box, the home page) is asked once on open.
  useEffect(() => {
    if (!open) { sent.current = false; return undefined; }
    if (initialQuestion && !sent.current) { sent.current = true; const t = setTimeout(() => send(initialQuestion), 80); return () => clearTimeout(t); }
    return undefined;
  }, [open, initialQuestion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60); }, [open]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking, status]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  useEffect(() => () => abort.current?.abort(), []);
  if (!open) return null;

  const openSource = (s) => {
    if (s.type === 'idea') openM.idea(s.id);
    else if (s.type === 'member') openM.member(s.id);
    else if (s.type === 'project') { go('projects', { memberProjectId: s.id }); onClose(); }
    else if (s.type === 'space') { go('communities', { communityId: s.id, communityTab: 'feed' }); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label="Ask AI" className="flex h-full w-full max-w-lg animate-slide-in flex-col bg-white shadow-pop">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-coral text-white"><AiIcon className="h-[18px] w-[18px]" /></span>
          <div className="flex-1">
            <p className="font-display font-semibold text-ink">Ask AI</p>
            <p className="text-xs text-muted">Ask about ideas, people and projects in this community</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-line-2"><X className="h-5 w-5" /></button>
        </header>
        <div ref={listRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="animate-fade-up">
              <p className="font-display text-xl font-semibold text-ink">Ask me <span className="ai-gradient-text">anything</span> about this community.</p>
              <p className="mt-1 text-sm text-muted">Type it the way you’d say it — English or Hinglish both work.</p>
              <div className="mt-5 grid gap-2">
                {AI_SUGGESTIONS.member.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-ink-2 transition hover:border-accent/40 hover:bg-accent-soft/40 hover:text-ink">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => m.role === 'user' ? (
            <div key={i} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">{m.text}</p></div>
          ) : (
            <div key={i} className="animate-fade-up">
              <RichText text={m.text} className={m.error ? 'text-ink-2' : undefined} />{m.streaming && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-accent" />}
              {!m.streaming && !m.error && <SourceChips sources={m.sources} onOpen={openSource} />}
            </div>
          ))}
          {thinking && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> {status || 'Thinking…'}</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-4">
          {messages.length > 0 && (
            <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
              {AI_SUGGESTIONS.member.slice(0, 5).map((s) => <button type="button" key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-accent/40">{s}</button>)}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="assistant-input" className="sr-only">Ask AI</label>
            <input id="assistant-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={400} autoComplete="off" placeholder="Ask in your own words…" className="h-11 flex-1 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
            <Button type="submit" variant="accent" icon={Send} aria-label="Send" disabled={!input.trim() || thinking} />
          </div>
        </form>
      </section>
    </div>
  );
}
