'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Newspaper, Lightbulb, Inbox, Users, Boxes, FolderKanban, Sparkles, LogOut, UserCog, Send, Link2, Check, Menu, X, Loader2, ArrowUpRight, TrendingUp, TrendingDown, PanelLeftClose, Plus, Zap, Heart, Handshake,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { askCopilot, COPILOT_SUGGESTIONS, hoursAgo } from '../../lib/ai';
import { CREATOR } from '../../lib/seed';
import { Avatar, Button, Chip, Logo, ScoreRing, Sparkline, cx } from '../ui';
import { Aurora, CollapsedLogoToggle, RailTip } from '../chrome';
import SearchPalette, { SearchTrigger } from '../SearchPalette';
import { aiContext, aiStream, AI_SUGGESTIONS } from '../../lib/aiClient';
import { AskAiButton, RichText, SourceChips } from '../AiParts';
import { AiIcon } from '../icons';
import ProfileMenu from '../ProfileMenu';
import { PersonRow, useOpen } from '../shared';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';
import { ICON as BRIEF_ICON } from './Priority';
import { BriefPage, IdeasPage, OpportunitiesPage, PeoplePage, CommunitiesPage, ProjectsPage } from './Pages';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['brief', 'Community Brief', Newspaper],
  ['ideas', 'Ideas', Lightbulb],
  ['opportunities', 'Opportunities', Inbox],
  ['people', 'People', Users],
  ['communities', 'Communities', Boxes],
  ['projects', 'Projects', FolderKanban],
  ['profile', 'Profile', UserCog],
];
// Group headers shown above these items in the sidebar.
const NAV_SECTION = { dashboard: 'Workspace', ideas: 'Community', profile: 'Account' };

export default function CreatorApp() {
  const { state, dispatch, intel, auth } = useStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const send = (q) => {
    const question = q.trim().slice(0, 400);
    if (!question) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setThinking(true);
    const local = askCopilot(question, state, intel);
    // With AI configured, the answer streams in from Groq, grounded in the same computed data;
    // the structured cards always come from the deterministic engine.
    if (state.aiEnabled) {
      const context = { ...aiContext(state, intel), localAnswer: local.text,
        items: local.blocks?.[0]?.items?.slice(0, 8).map((x) => x.member ? { name: x.member.name, role: x.member.role, skills: x.member.skills, why: x.why } : x.title || x.text || x.topic || x.subject || x.label) };
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      let acc = ''; let shown = false;
      const upsert = (patch) => {
        const first = !shown; // decide now, not when React later runs the updater
        shown = true;
        setMessages((m) => (first ? [...m, { role: 'ai', ...local, text: '', llm: true, ...patch }] : m.map((x, i) => (i === m.length - 1 ? { ...x, ...patch } : x))));
      };
      aiStream({ question, context, history, creator: CREATOR.name }, {
        onToken: (tok) => { acc += tok; upsert({ text: acc, streaming: true }); setAiStatus(''); setThinking(false); },
        onStatus: (st) => setAiStatus(st),
        onReset: () => { acc = ''; if (shown) upsert({ text: '' }); },
      }).then((r) => {
        if (r.ok) upsert({ text: acc, streaming: false, meta: r.meta, sources: r.sources, tools: r.tools });
        else if (shown) upsert({ text: acc, streaming: false }); // keep what we got (and stop the caret)
        else setMessages((m) => [...m, { role: 'ai', ...local, note: r.error && r.code ? `${r.error}. Here is the built-in answer.` : null }]);
      }).finally(() => { setThinking(false); setAiStatus(''); });
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

  const [searchOpen, setSearchOpen] = useState(false);

  const ask = (q) => { setCopilotOpen(true); send(q); };
  const copyInvite = async () => {
    const link = `${window.location.origin}/join/${encodeURIComponent(state.user?.id || '')}`;
    try { await navigator.clipboard.writeText(link); dispatch({ type: 'TOAST', toast: { text: 'Invite link copied — share it with your followers' } }); } catch { /* ignore */ }
  };

  const renderSidebar = (mini) => (
    <nav aria-label="Creator navigation" className={cx('flex h-full flex-col bg-night py-4 text-white', mini ? 'px-2' : 'px-2.5')}>
      {/* Brand + collapse toggle. When collapsed, the logo itself expands the sidebar. */}
      <div className={cx('flex items-center', mini ? 'justify-center' : 'justify-between px-1.5')}>
        {mini ? <CollapsedLogoToggle onClick={toggleCollapsed} /> : (
          <>
            <Logo dark />
            <button onClick={toggleCollapsed} aria-label="Collapse sidebar" title="Collapse"
              className="hidden rounded-lg p-1.5 text-white/50 transition hover:bg-night-2 hover:text-white lg:inline-flex">
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Primary nav */}
      <ul className={cx('no-scrollbar mt-4 min-h-0 flex-1', mini ? 'space-y-1.5 overflow-visible' : '-mx-1 space-y-0.5 overflow-y-auto px-1')}>
        {NAV.map(([id, label, Icon]) => {
          const active = page === id;
          const badge = id === 'opportunities' ? highOpps : id === 'ideas' ? intel.clusters.length : null;
          return (
            <Fragment key={id}>
            {NAV_SECTION[id] && (mini
              ? <li aria-hidden="true" className="mx-auto my-3 h-px w-6 bg-white/10" />
              : <li className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">{NAV_SECTION[id]}</li>)}
            <li>
              <button onClick={() => go(id)} aria-current={active ? 'page' : undefined} aria-label={mini ? label : undefined}
                className={cx('group relative flex items-center text-[13px] transition', mini ? 'mx-auto h-11 w-11 justify-center rounded-2xl' : 'w-full gap-2.5 rounded-full px-3 py-2', active ? 'bg-white font-semibold text-ink shadow-[0_8px_20px_-10px_rgba(255,255,255,.5)]' : 'text-white/65 hover:bg-white/[.07] hover:text-white')}>
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {!mini && <span className="flex-1 text-left">{label}</span>}
                {mini && <RailTip>{label}{badge ? ` · ${badge}` : ''}</RailTip>}
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
        <button onClick={() => { setCopilotOpen(true); setMobileNav(false); }} aria-label={mini ? 'Ask FanOS AI' : undefined}
          className={cx('group relative flex items-center bg-gradient-to-r from-accent to-[#9b4bf0] text-[13px] font-medium shadow-lg shadow-accent/20 transition hover:brightness-110', mini ? 'mx-auto h-11 w-11 justify-center rounded-2xl' : 'w-full gap-2.5 rounded-full px-3 py-2')}>
          <AiIcon className="h-[18px] w-[18px] shrink-0" />
          {mini && <RailTip>Ask FanOS AI</RailTip>}
          {!mini && <><span className="flex-1 text-left">Ask FanOS AI</span></>}
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
            <div className="w-full max-w-md justify-self-center"><SearchTrigger onClick={() => setSearchOpen(true)} placeholder="Search ideas, people, spaces, projects…" /></div>
            <div className="flex items-center justify-end gap-2.5">
              <AskAiButton onClick={() => setCopilotOpen(true)} />
              <ProfileMenu
                name={state.user?.name || CREATOR.name}
                avatar={state.user?.avatar}
                email={state.user?.email}
                sections={[
                  [
                    { icon: UserCog, label: 'Profile & accounts', onClick: () => go('profile') },
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
          {page === 'profile' && <ProfilePage />}
        </main>
      </div>
      <SearchPalette open={searchOpen} setOpen={setSearchOpen} mode="creator" onAsk={ask}
        pages={[['dashboard', 'Dashboard', LayoutDashboard], ['brief', 'Community Brief', Newspaper], ['ideas', 'Ideas', Lightbulb], ['opportunities', 'Opportunities', Inbox], ['people', 'People', Users], ['communities', 'Communities', Boxes], ['projects', 'Projects', FolderKanban]].map(([id, label, icon]) => ({ id, label, icon, open: (extra) => go(id, extra) }))}
        actions={[
          { id: 'ai', label: 'Ask FanOS AI', hint: 'Chat with your community data', icon: AiIcon, run: () => setCopilotOpen(true) },
          { id: 'invite', label: 'Copy invite link', hint: 'Share it with your followers', icon: Link2, run: copyInvite },
          { id: 'space', label: 'Create a space', hint: 'Group your fans by interest', icon: Plus, run: () => dispatch({ type: 'NAV', patch: { modal: { type: 'community' } } }) },
        ]} />
      <Copilot open={copilotOpen} messages={messages} thinking={thinking} status={aiStatus} send={send} onClose={() => setCopilotOpen(false)} go={go} />
    </div>
  );
}

// Live mode: the real link followers use to sign up as members of this community.
// Sidebar row: copy the join link followers use to sign up.
function InviteCard() {
  const { state } = useStore();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const link = `${window.location.origin}/join/${encodeURIComponent(state.user?.id || '')}`;
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ } setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
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
function Copilot({ open, messages, thinking, status, send: rawSend, onClose, go }) {
  const { state, intel } = useStore();
  const suggestions = state.aiEnabled ? AI_SUGGESTIONS.creator : COPILOT_SUGGESTIONS;
  const openSource = (src) => {
    if (src.type === 'idea') openM.idea(src.id);
    else if (src.type === 'member') openM.member(src.id);
    else if (src.type === 'opportunity') { go('opportunities', { openOppId: src.id }); onClose(); }
    else if (src.type === 'project') { go('projects', { openProjectId: src.id }); onClose(); }
    else if (src.type === 'space') { go('communities', { communityId: src.id, communityTab: 'feed' }); onClose(); }
  };
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
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-coral text-white"><AiIcon className="h-[18px] w-[18px]" /></span>
          <div className="flex-1">
            <p className="font-display font-semibold text-ink">FanOS AI</p>
            <p className="text-xs text-muted">{state.aiEnabled ? 'Ask anything in your own words. ' : ''}It checks your real community data.</p>
          </div>
          <button onClick={onClose} aria-label="Close copilot" className="rounded-full p-1.5 text-muted hover:bg-line-2"><X className="h-5 w-5" /></button>
        </header>
        <div ref={listRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="animate-fade-up">
              <p className="font-display text-xl font-semibold text-ink">Ask anything about your <span className="ai-gradient-text">community</span>.</p>
              <p className="mt-1 text-sm text-muted">Search your audience like a database.</p>
              <div className="mt-5 grid gap-2">
                {suggestions.map((s) => (
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
              <RichText text={m.text} />{m.streaming && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-accent" />}
              {m.note && <p className="mt-1 text-xs text-muted">{m.note}</p>}
              {m.llm && !m.streaming && <SourceChips sources={m.sources} onOpen={openSource} />}
              {!m.llm && m.blocks?.map((b, k) => <CopilotBlock key={k} block={b} openM={openM} go={go} onClose={onClose} />)}
              {!m.llm && m.cta && (
                <Button size="sm" variant="soft" className="mt-3" icon={ArrowUpRight} onClick={() => { go(m.cta.to, m.cta.query ? { peopleQuery: m.cta.query } : {}); onClose(); }}>{m.cta.label}</Button>
              )}
            </div>
          ))}
          {thinking && (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> {status || `Analyzing ${state.members.length + state.ideas.length} records…`}</p>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-4">
          {messages.length > 0 && (
            <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
              {suggestions.slice(0, 6).map((s) => <button type="button" key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-accent/40">{s}</button>)}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="copilot-input" className="sr-only">Ask FanOS AI</label>
            <input id="copilot-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={400} placeholder={state.aiEnabled ? 'Ask in your own words — English or Hinglish…' : 'Find designers who contributed in the last 30 days…'} className="h-11 flex-1 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-accent" />
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
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{i.title}</span><span className="inline-flex items-center gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-coral" aria-hidden="true" />{i.supports}</span><span className="inline-flex items-center gap-1"><Handshake className="h-3 w-3 text-mint" aria-hidden="true" />{i.volunteers.length}</span></span></span>
      </button>
    ))}</div>
  );
  if (block.type === 'clusters') return (
    <div className={wrap}>{block.items.map((c) => (
      <button key={c.id} onClick={() => { go('ideas'); onClose(); }} className="block w-full p-3 text-left hover:bg-paper">
        <span className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">{c.label}</span><Chip tone="accent">{c.requests} requests</Chip></span>
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
      <li key={i} className="flex gap-3 p-3">{(() => { const [TIcon, tone] = BRIEF_ICON[t.icon] || [Lightbulb, 'bg-line-2 text-ink-2']; return <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)} aria-hidden="true"><TIcon className="h-4 w-4" /></span>; })()}<span className="min-w-0"><span className="block text-sm font-medium text-ink">{t.title}</span><span className="line-clamp-2 text-xs text-muted">{t.detail}</span></span></li>
    ))}</ol>
  );
  return null;
}
