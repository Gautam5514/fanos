'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Newspaper, Lightbulb, Inbox, Users, Boxes, FolderKanban, Sparkles, LogOut, UserCog, Send, Link2, Check, Menu, X, Loader2, ArrowUpRight, TrendingUp, TrendingDown, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { askCopilot, COPILOT_SUGGESTIONS, hoursAgo } from '../../lib/ai';
import { CREATOR } from '../../lib/seed';
import { Avatar, Button, Chip, Logo, ScoreRing, Sparkline, cx } from '../ui';
import { Aurora } from '../chrome';
import ProfileMenu from '../ProfileMenu';
import { PersonRow, useOpen } from '../shared';
import Dashboard from './Dashboard';
import { BriefPage, IdeasPage, OpportunitiesPage, PeoplePage, CommunitiesPage, ProjectsPage } from './Pages';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['brief', 'Community Brief', Newspaper],
  ['ideas', 'Ideas', Lightbulb],
  ['opportunities', 'Opportunities', Inbox],
  ['people', 'People', Users],
  ['communities', 'Communities', Boxes],
  ['projects', 'Projects', FolderKanban],
];
// Group headers shown above these items in the sidebar.
const NAV_SECTION = { dashboard: 'Workspace', ideas: 'Community' };

export default function CreatorApp() {
  const { state, dispatch, intel, auth } = useStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const send = (q) => {
    const question = q.trim().slice(0, 300);
    if (!question) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setThinking(true);
    const local = askCopilot(question, state, intel);
    // With an LLM configured, the model rewrites the answer from the same computed data;
    // the structured cards always come from the deterministic engine.
    if (state.aiEnabled) {
      const context = {
        clusters: intel.clusters.slice(0, 5).map((c) => ({ label: c.label, requests: c.requests, supporters: c.supporters, summary: c.summary })),
        topIdeas: intel.ranked.slice(0, 8).map((i) => ({ title: i.title, score: intel.scored.get(i.id).score, supports: i.supports, volunteers: i.volunteers.length })),
        localAnswer: local.text,
        items: local.blocks?.[0]?.items?.slice(0, 8).map((x) => x.member ? { name: x.member.name, role: x.member.role, skills: x.member.skills, why: x.why } : x.title || x.text || x.topic || x.subject || x.label),
      };
      fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'copilot', question, context }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMessages((m) => [...m, { role: 'ai', ...local, text: d?.text || local.text, llm: !!d?.text }]))
        .catch(() => setMessages((m) => [...m, { role: 'ai', ...local }]))
        .finally(() => setThinking(false));
      return;
    }
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', ...local }]);
      setThinking(false);
    }, 650);
  };
  const [mobileNav, setMobileNav] = useState(false);
  // Collapsible sidebar: full labels ↔ icon-only rail. Persisted per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('fanos_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem('fanos_sidebar_collapsed', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  const page = state.creatorPage;
  const go = (p, extra = {}) => { dispatch({ type: 'NAV', patch: { creatorPage: p, ...(p === 'communities' ? { communityId: null } : {}), ...(p === 'projects' && !('openProjectId' in extra) ? { openProjectId: null } : {}), ...extra } }); setMobileNav(false); window.scrollTo({ top: 0 }); };
  const highOpps = intel.opps.filter((o) => !o.ai.isSpam && o.ai.priority >= 50 && o.status === 'new').length;

  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCopilotOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = (q) => { setCopilotOpen(true); send(q); };
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/?join=1`); dispatch({ type: 'TOAST', toast: { text: 'Invite link copied — share it with your followers' } }); } catch { /* ignore */ }
  };

  const renderSidebar = (mini) => (
    <nav aria-label="Creator navigation" className={cx('flex h-full flex-col bg-night py-4 text-white', mini ? 'px-2' : 'px-2.5')}>
      {/* Brand + collapse toggle */}
      <div className={cx('flex items-center', mini ? 'flex-col gap-2' : 'justify-between px-1.5')}>
        {mini ? <Logo dark iconOnly /> : <Logo dark />}
        <button onClick={toggleCollapsed} aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'} title={mini ? 'Expand' : 'Collapse'}
          className="hidden rounded-lg p-1.5 text-white/50 transition hover:bg-night-2 hover:text-white lg:inline-flex">
          {mini ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Primary nav */}
      <ul className="no-scrollbar -mx-1 mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {NAV.map(([id, label, Icon]) => {
          const active = page === id;
          const badge = id === 'opportunities' ? highOpps : id === 'ideas' ? intel.clusters.length : null;
          return (
            <Fragment key={id}>
            {NAV_SECTION[id] && (mini
              ? <li aria-hidden="true" className="mx-3 my-2 h-px bg-white/10" />
              : <li className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">{NAV_SECTION[id]}</li>)}
            <li>
              <button onClick={() => go(id)} aria-current={active ? 'page' : undefined} title={mini ? label : undefined}
                className={cx('relative flex w-full items-center rounded-full text-[13px] transition', mini ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2', active ? 'bg-white font-semibold text-ink shadow-[0_8px_20px_-10px_rgba(255,255,255,.5)]' : 'text-white/65 hover:bg-white/[.07] hover:text-white')}>
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {!mini && <span className="flex-1 text-left">{label}</span>}
                {badge ? (
                  mini
                    ? <span className={cx('absolute right-1.5 top-1.5 h-2 w-2 rounded-full', active ? 'bg-accent' : 'bg-coral')} />
                    : <span className={cx('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-accent text-white' : 'bg-night-3 text-white/80')}>{badge}</span>
                ) : null}
              </button>
            </li>
            </Fragment>
          );
        })}
      </ul>

      {/* Bottom: AI + invite. Account actions (edit profile, log out…) live in the top-bar profile menu. */}
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <button onClick={() => { setCopilotOpen(true); setMobileNav(false); }} title={mini ? 'Ask FanOS AI (⌘K)' : undefined}
          className={cx('flex w-full items-center rounded-full bg-gradient-to-r from-accent to-[#9b4bf0] text-[13px] font-medium shadow-lg shadow-accent/20 transition hover:brightness-110', mini ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2')}>
          <Sparkles className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {!mini && <><span className="flex-1 text-left">Ask FanOS AI</span><kbd className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">⌘K</kbd></>}
        </button>
        {!mini && <InviteCard />}
      </div>
    </nav>
  );

  const railW = collapsed ? 'lg:w-[72px]' : 'lg:w-64';
  const railPad = collapsed ? 'lg:pl-[72px]' : 'lg:pl-64';
  const auroraLeft = collapsed ? 'lg:left-[72px]' : 'lg:left-64';

  return (
    <div className="min-h-screen">
      <aside className={cx('fixed inset-y-0 left-0 z-30 hidden w-64 transition-[width] duration-300 ease-out lg:block', railW)}>{renderSidebar(collapsed)}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setMobileNav(false)}>
          <aside className="h-full w-72 animate-slide-in" onClick={(e) => e.stopPropagation()}>{renderSidebar(false)}</aside>
        </div>
      )}
      <div className={cx('relative transition-[padding] duration-300 ease-out', railPad)}>
        <Aurora className={cx('h-[560px]', auroraLeft)} />
        <header className="glass sticky top-0 z-20 border-b border-line/70">
          <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
            <div className="flex items-center">
              <button className="rounded-lg p-2 hover:bg-line-2 lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu className="h-5 w-5" /></button>
            </div>
            <form className="relative w-full max-w-md justify-self-center" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q'); if (q) { ask(String(q)); e.currentTarget.reset(); } }}>
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" aria-hidden="true" />
              <label htmlFor="top-ask" className="sr-only">Search your community</label>
              <input id="top-ask" name="q" autoComplete="off" placeholder="Search your community…" className="h-10 w-full rounded-full border border-line bg-white/80 pl-9 pr-14 text-[13px] shadow-sm outline-none transition hover:border-ink/15 focus:border-accent focus:bg-white focus:shadow-md focus:ring-4 focus:ring-accent/10" />
              <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] text-muted sm:block">⌘K</kbd>
            </form>
            <div className="flex items-center justify-end">
              <ProfileMenu
                name={CREATOR.name || state.user?.name}
                email={state.user?.email}
                sections={[
                  [
                    { icon: UserCog, label: 'Edit profile', onClick: () => dispatch({ type: 'NAV', patch: { view: 'creator-setup' } }) },
                    { icon: Link2, label: 'Copy invite link', onClick: copyInvite },
                  ],
                  [{ icon: LogOut, label: 'Log out', onClick: () => auth.logout() }],
                ]}
              />
            </div>
          </div>
        </header>
        <main className="relative mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          {page === 'dashboard' && <Dashboard go={go} ask={ask} />}
          {page === 'brief' && <BriefPage go={go} ask={ask} />}
          {page === 'ideas' && <IdeasPage />}
          {page === 'opportunities' && <OpportunitiesPage />}
          {page === 'people' && <PeoplePage key={state.peopleQuery || 'browse'} />}
          {page === 'communities' && <CommunitiesPage go={go} />}
          {page === 'projects' && <ProjectsPage />}
        </main>
      </div>
      <Copilot open={copilotOpen} messages={messages} thinking={thinking} send={send} onClose={() => setCopilotOpen(false)} go={go} />
    </div>
  );
}

// Live mode: the real link followers use to sign up as members of this community.
// Sidebar row: copy the join link followers use to sign up.
function InviteCard() {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/?join=1`); } catch { /* ignore */ } setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="flex items-center justify-between gap-2 rounded-full bg-white/[.06] py-1.5 pl-3.5 pr-1.5 ring-1 ring-white/10">
      <span className="text-[13px] font-medium text-white/85">Invite fans</span>
      <button onClick={copy} className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-ink transition hover:bg-white/90">
        {copied ? <Check className="h-3.5 w-3.5 text-mint" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Copilot
function Copilot({ open, messages, thinking, send: rawSend, onClose, go }) {
  const { state, intel } = useStore();
  const openM = useOpen();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const send = (q) => { if (thinking) return; rawSend(q); setInput(''); };
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label="FanOS AI copilot" className="flex h-full w-full max-w-lg animate-slide-in flex-col bg-white shadow-pop">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-coral text-white"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div className="flex-1">
            <p className="font-display font-semibold text-ink">FanOS AI</p>
            <p className="text-xs text-muted">Grounded in {state.members.length} member profiles, {state.ideas.length} ideas & {intel.opps.length} inbox items</p>
          </div>
          <button onClick={onClose} aria-label="Close copilot" className="rounded-full p-1.5 text-muted hover:bg-line-2"><X className="h-5 w-5" /></button>
        </header>
        <div ref={listRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="animate-fade-up">
              <p className="font-display text-xl font-semibold text-ink">Ask anything about your <span className="ai-gradient-text">community</span>.</p>
              <p className="mt-1 text-sm text-muted">Search your audience like a database.</p>
              <div className="mt-5 grid gap-2">
                {COPILOT_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-ink-2 transition hover:border-accent/40 hover:bg-accent-soft/40 hover:text-ink">
                    {s}<ArrowUpRight className="h-4 w-4 text-muted" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => m.role === 'user' ? (
            <div key={i} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">{m.text}</p></div>
          ) : (
            <div key={i} className="animate-fade-up">
              <p className="text-sm leading-relaxed text-ink">{m.text}</p>
              {m.llm && <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">Written by LLM from FanOS data</p>}
              {m.blocks?.map((b, k) => <CopilotBlock key={k} block={b} openM={openM} go={go} onClose={onClose} />)}
              {m.cta && (
                <Button size="sm" variant="soft" className="mt-3" icon={ArrowUpRight} onClick={() => { go(m.cta.to, m.cta.query ? { peopleQuery: m.cta.query } : {}); onClose(); }}>{m.cta.label}</Button>
              )}
            </div>
          ))}
          {thinking && (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> Analyzing {state.members.length + state.ideas.length} records…</p>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-4">
          {messages.length > 0 && (
            <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
              {COPILOT_SUGGESTIONS.slice(0, 6).map((s) => <button type="button" key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-accent/40">{s}</button>)}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="copilot-input" className="sr-only">Ask FanOS AI</label>
            <input id="copilot-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder="Find designers who contributed in the last 30 days…" className="h-11 flex-1 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-accent" />
            <Button type="submit" variant="accent" icon={Send} aria-label="Send" disabled={!input.trim() || thinking} />
          </div>
        </form>
      </section>
    </div>
  );
}

function CopilotBlock({ block, openM, go, onClose }) {
  const { intel } = useStore();
  const wrap = 'mt-3 rounded-2xl border border-line divide-y divide-line-2 overflow-hidden';
  if (block.type === 'people') return (
    <div className={wrap}>{block.items.map(({ member, why }) => <PersonRow key={member.id} member={member} why={why.slice(0, 3).join(' • ')} />)}</div>
  );
  if (block.type === 'ideas') return (
    <div className={wrap}>{block.items.map((i) => (
      <button key={i.id} onClick={() => openM.idea(i.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-paper">
        <ScoreRing score={intel.scored.get(i.id).score} size={36} stroke={4} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{i.title}</span><span className="text-xs text-muted">❤️ {i.supports} • 🤝 {i.volunteers.length}</span></span>
      </button>
    ))}</div>
  );
  if (block.type === 'clusters') return (
    <div className={wrap}>{block.items.map((c) => (
      <button key={c.id} onClick={() => { go('ideas'); onClose(); }} className="block w-full p-3 text-left hover:bg-paper">
        <span className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">🔥 {c.label}</span><Chip tone="accent">{c.requests} requests</Chip></span>
        <span className="mt-1 line-clamp-2 block text-xs text-muted">{c.summary}</span>
      </button>
    ))}</div>
  );
  if (block.type === 'trends') return (
    <div className={wrap}>{block.items.map((t) => (
      <div key={t.topic} className="flex items-center gap-3 p-3">
        <span className="flex-1 text-sm font-medium text-ink">{t.topic}</span>
        <Sparkline data={t.spark} width={70} height={22} color={t.change >= 0 ? '#5b3df5' : '#ff5a36'} />
        <span className={cx('w-16 text-right text-sm font-semibold', t.change >= 0 ? 'text-mint' : 'text-coral')}>{t.change >= 0 ? '↑' : '↓'} {Math.abs(t.change)}%</span>
      </div>
    ))}</div>
  );
  if (block.type === 'opps') return (
    <div className={wrap}>{block.items.map((o) => (
      <button key={o.id} onClick={() => { go('opportunities'); onClose(); }} className="flex w-full items-center gap-3 p-3 text-left hover:bg-paper">
        <span className="font-mono text-xs font-semibold text-accent">{o.ai.priority}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{o.subject}</span><span className="text-xs text-muted">{o.ai.category} • {o.from.org || o.from.name} • {hoursAgo(o.hoursAgo)}</span></span>
      </button>
    ))}</div>
  );
  if (block.type === 'discussions') return (
    <div className={wrap}>{block.items.map((d) => (
      <div key={d.id} className="flex items-center gap-3 p-3">
        <span className="min-w-0 flex-1 text-sm text-ink">{d.text}</span>
        <span className="text-right text-xs text-muted"><b className="block font-semibold text-ink">{d.count}</b>this week</span>
        {d.change !== undefined && <span className={cx('inline-flex items-center gap-0.5 text-xs font-semibold', d.change > 0 ? 'text-coral' : 'text-mint')}>{d.change > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}{Math.abs(d.change)}%</span>}
      </div>
    ))}</div>
  );
  if (block.type === 'things') return (
    <ol className={wrap}>{block.items.map((t, i) => (
      <li key={i} className="flex gap-3 p-3"><span className="text-lg" aria-hidden="true">{t.icon}</span><span className="min-w-0"><span className="block text-sm font-medium text-ink">{t.title}</span><span className="line-clamp-2 text-xs text-muted">{t.detail}</span></span></li>
    ))}</ol>
  );
  return null;
}
