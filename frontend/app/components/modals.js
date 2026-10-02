'use client';

import { useMemo, useState } from 'react';
import {
  Heart, Handshake, Bookmark, Star, Megaphone, Rocket, Sparkles, Layers, Send, Check, Copy, RefreshCw,
  ShieldCheck, Brain, Tags, Fingerprint, GitMerge, Gauge, UserCheck, Loader2, AlertTriangle, MapPin, Trophy, Lightbulb, MessagesSquare, FolderKanban, Award,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { contributionScore, findSimilar, generatePromo, moderate, recommendTeam, summarizeIdea, fmt, ago, roleMatchesNeed } from '../lib/ai';
import { CATEGORIES, CREATOR, NEEDS, categoryForCommunity } from '../lib/seed';
import { Avatar, Bar, Button, Chip, Modal, ScoreRing, cx } from './ui';
import { IdeaStatus, memberName, useOpen } from './shared';

export function ModalRoot() {
  const { state } = useStore();
  const open = useOpen();
  const m = state.modal;
  return (
    <>
      {m?.type === 'idea' && <IdeaModal key={m.id} id={m.id} onClose={open.close} />}
      {m?.type === 'share' && <ShareIdeaModal prefill={m.prefill} onClose={open.close} />}
      {m?.type === 'promote' && <PromoteModal key={m.id} id={m.id} onClose={open.close} />}
      {m?.type === 'project' && <ProjectModal key={m.id} id={m.id} onClose={open.close} />}
      {m?.type === 'member' && <ProfileDrawer key={m.id} id={m.id} onClose={open.close} />}
      {m?.type === 'community' && <CreateCommunityModal onClose={open.close} />}
      {m?.type === 'invite' && <InviteModal key={m.id} memberId={m.id} projectId={m.projectId} onClose={open.close} />}
    </>
  );
}

// ------------------------------------------------------------------ idea detail
function IdeaModal({ id, onClose }) {
  const { state, dispatch, intel } = useStore();
  const open = useOpen();
  const idea = state.ideas.find((i) => i.id === id);
  const [comment, setComment] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [note, setNote] = useState('');
  const [showAllVols, setShowAllVols] = useState(false);
  if (!idea) return <Modal open={false} onClose={onClose} />;

  const isCreator = state.view === 'creator';
  const project = state.projects.find((p) => p.id === idea.projectId || p.ideaId === idea.id);
  const sig = intel.scored.get(idea.id);
  const cluster = intel.clusterOf.get(idea.id);
  const author = state.members.find((m) => m.id === idea.authorId);
  const community = state.communities.find((c) => c.id === idea.communityId);
  const me = state.members.find((m) => m.id === state.meId);
  const volunteered = me && idea.volunteers.some((v) => v.memberId === me.id);
  const skilledVols = idea.volunteers
    .map((v) => ({ ...v, m: state.members.find((x) => x.id === v.memberId) }))
    .filter((v) => v.m)
    .sort((a, b) => contributionScore(b.m) - contributionScore(a.m));
  const roleCounts = {};
  skilledVols.forEach((v) => (roleCounts[v.role] = (roleCounts[v.role] || 0) + 1));

  const submitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    dispatch({ type: 'COMMENT', ideaId: idea.id, text: comment.trim().slice(0, 1000), asCreator: isCreator });
    setComment('');
  };

  return (
    <Modal open onClose={onClose} width="max-w-5xl" labelledBy="idea-title">
      <div className="grid lg:grid-cols-[1fr_340px]">
        {/* Left: content */}
        <div className="p-6 sm:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-8">
            {community && <Chip>{community.emoji} {community.name}</Chip>}
            {idea.category && <Chip tone="sky">Category: {idea.category}</Chip>}
            {idea.tags.map((t) => <Chip key={t} tone="outline">{t}</Chip>)}
            <IdeaStatus idea={idea} />
          </div>
          <h2 id="idea-title" className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[28px]">{idea.title}</h2>
          {author && (
            <button onClick={() => open.member(author.id)} className="mt-3 flex items-center gap-2 text-left text-sm">
              <Avatar name={author.name} size={28} />
              <span><span className="font-medium text-ink">{author.name}</span> <span className="text-muted">• {author.role} • score {contributionScore(author)} • {ago(idea.daysAgo)}</span></span>
            </button>
          )}
          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI Summary</p>
            <p className="mt-1 text-sm text-ink">{summarizeIdea(idea)}</p>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{idea.description}</p>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">What this idea needs</p>
            <div className="flex flex-wrap gap-1.5">
              {idea.needs.map((n) => {
                const have = skilledVols.filter((v) => roleMatchesNeed(v.role, n)).length;
                return <Chip key={n} tone={have ? 'mint' : 'default'}>{n}{have ? ` • ${have} offered` : ''}</Chip>;
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {isCreator ? (
              <>
                <Button variant={idea.featured ? 'soft' : 'secondary'} icon={Star} onClick={() => dispatch({ type: 'FEATURE', ideaId: idea.id })}>{idea.featured ? 'Selected & featured' : 'Select & feature'}</Button>
                <Button variant="secondary" icon={Megaphone} onClick={() => open.promote(idea.id)}>Promote to audience</Button>
                {idea.status === 'project'
                  ? <Button variant="primary" icon={FolderKanban} onClick={() => { dispatch({ type: 'NAV', patch: { modal: null, creatorPage: 'projects', openProjectId: project?.id } }); }}>Open project</Button>
                  : <Button variant="accent" icon={Rocket} onClick={() => open.project(idea.id)}>Create collaboration</Button>}
              </>
            ) : (
              <>
                <Button variant={state.supported[idea.id] ? 'soft' : 'secondary'} icon={Heart} onClick={() => dispatch({ type: 'SUPPORT', ideaId: idea.id })} aria-pressed={!!state.supported[idea.id]}>
                  {state.supported[idea.id] ? 'Supported' : 'Support'} • {idea.supports.toLocaleString('en-US')}
                </Button>
                <Button variant={volunteered ? 'soft' : 'accent'} icon={Handshake} onClick={() => (volunteered ? dispatch({ type: 'VOLUNTEER', ideaId: idea.id }) : setHelpOpen((v) => !v))}>
                  {volunteered ? 'You offered to help' : 'I can help'}
                </Button>
                <Button variant="secondary" icon={Bookmark} onClick={() => dispatch({ type: 'SAVE', ideaId: idea.id })} aria-pressed={!!state.saved[idea.id]}>{state.saved[idea.id] ? 'Saved' : 'Save'}</Button>
              </>
            )}
          </div>
          {helpOpen && !volunteered && me && (
            <form className="mt-3 animate-fade-up rounded-2xl border border-line bg-paper p-4" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'VOLUNTEER', ideaId: idea.id, note: note.trim().slice(0, 280) }); setHelpOpen(false); }}>
              <label htmlFor="help-note" className="text-sm font-medium text-ink">How can you help as a {me.role.toLowerCase()}?</label>
              <input id="help-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`e.g. I can build the first version with ${me.skills[0] || 'my skills'}`} className="mt-2 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent" />
              <div className="mt-3 flex justify-end"><Button type="submit" variant="primary" size="sm" icon={Check}>Offer help</Button></div>
            </form>
          )}

          {/* Discussion */}
          <div className="mt-8">
            <p className="mb-3 flex items-center gap-2 font-display font-semibold text-ink"><MessagesSquare className="h-4 w-4" aria-hidden="true" /> Discussion <span className="text-sm font-normal text-muted">{idea.commentsCount}</span></p>
            <ul className="space-y-3">
              {idea.comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={memberName(state, c.memberId)} size={30} />
                  <div className={cx('flex-1 rounded-2xl px-4 py-2.5', c.memberId === 'creator' ? 'bg-accent-soft' : 'bg-paper')}>
                    <p className="text-xs font-semibold text-ink">{memberName(state, c.memberId)} {c.memberId === 'creator' && <Chip tone="accent" className="ml-1">Creator</Chip>} <span className="font-normal text-muted">• {ago(c.daysAgo)}</span></p>
                    <p className="mt-0.5 text-sm text-ink-2">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            {(isCreator || me) && (
              <form onSubmit={submitComment} className="mt-4 flex gap-2">
                <label htmlFor="comment" className="sr-only">Add a comment</label>
                <input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder={isCreator ? 'Reply as creator…' : 'Add to the discussion…'} className="h-10 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent" />
                <Button type="submit" variant="primary" icon={Send} aria-label="Post comment" disabled={!comment.trim()} />
              </form>
            )}
          </div>
        </div>

        {/* Right: AI intelligence */}
        <aside className="border-t border-line bg-paper/60 p-6 lg:rounded-r-3xl lg:border-l lg:border-t-0 lg:pt-14">
          <div className="ai-border ai-glow rounded-2xl p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI Signal Score</p>
            <div className="mt-3 flex items-center gap-4">
              <ScoreRing score={sig.score} size={72} stroke={6} />
              <div>
                <p className="font-display text-xl font-semibold text-ink">{sig.score}<span className="text-sm text-muted"> / 100</span></p>
                <p className="text-sm font-medium text-ink-2">{sig.label}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {sig.breakdown.map((b) => (
                <div key={b.key}>
                  <div className="mb-1 flex justify-between text-[11px]"><span className="text-ink-2">{b.key}</span><span className="font-mono text-muted">{b.value}</span></div>
                  <Bar value={b.value} color={b.value >= 80 ? 'bg-accent' : b.value >= 55 ? 'bg-mint' : 'bg-amber'} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Why AI surfaced it</p>
            <ul className="space-y-1.5">
              {sig.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-ink-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />{r}</li>
              ))}
            </ul>
          </div>

          {cluster && cluster.ideaIds.length > 1 && (
            <div className="mt-5 rounded-2xl border border-line bg-white p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><GitMerge className="h-3.5 w-3.5" aria-hidden="true" /> Part of “{cluster.label}”</p>
              <p className="mt-1 text-xs text-muted">{cluster.requests} similar requests merged from {cluster.items.length} ideas</p>
              <ul className="mt-2 space-y-1">
                {cluster.items.filter((x) => x.idea.id !== idea.id).slice(0, 3).map(({ idea: o }) => (
                  <li key={o.id}><button onClick={() => open.idea(o.id)} className="w-full truncate text-left text-xs text-ink-2 hover:text-accent">↳ {o.title}</button></li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
              <span>Volunteers</span><span className="normal-case tracking-normal">{idea.volunteers.length} total</span>
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {Object.entries(roleCounts).map(([r, n]) => <Chip key={r} tone="outline">{n} {r}{n > 1 ? 's' : ''}</Chip>)}
            </div>
            <div className="space-y-0.5">
              {skilledVols.slice(0, showAllVols ? 40 : 5).map((v) => {
                const inTeam = project?.contributors.some((c) => c.memberId === v.memberId);
                return (
                  <div key={v.memberId} className="flex items-center gap-1">
                    <button onClick={() => open.member(v.memberId)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-left hover:bg-white">
                      <Avatar name={v.m.name} size={26} />
                      <span className="min-w-0 flex-1 truncate text-xs"><span className="font-medium text-ink">{v.m.name}</span> <span className="text-muted">• {v.m.role}</span>{v.note && <span className="block truncate text-muted">“{v.note}”</span>}</span>
                      <span className="font-mono text-[11px] text-muted">{contributionScore(v.m)}</span>
                    </button>
                    {isCreator && project && (inTeam
                      ? <span className="px-1 text-[11px] font-medium text-mint">In team</span>
                      : <button onClick={() => dispatch({ type: 'ADD_CONTRIBUTOR', projectId: project.id, memberId: v.memberId })} className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent-soft">+ Add</button>)}
                  </div>
                );
              })}
              {skilledVols.length > 5 && <button onClick={() => setShowAllVols((x) => !x)} className="mt-1 text-xs font-medium text-accent hover:underline">{showAllVols ? 'Show less' : `Show all ${skilledVols.length} collaboration requests`}</button>}
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ share idea
const PIPELINE = [
  [ShieldCheck, 'Content moderation'],
  [Brain, 'Intent classification'],
  [Tags, 'Topic extraction'],
  [Fingerprint, 'Embedding generation'],
  [GitMerge, 'Duplicate detection & clustering'],
  [Gauge, 'Signal scoring'],
  [UserCheck, 'Contributor analysis'],
];
const CATEGORY_TAGS = {
  'ai-builders': ['AI Tools'], developers: ['Building'], marketing: ['Marketing'], founders: ['Startups'],
  creators: ['Content Creation'], finance: ['Finance'], fitness: ['Fitness'], designers: ['Design'],
};
const KEYWORD_TAGS = [[/agent/i, 'AI Agents'], [/automat/i, 'Automation'], [/course|tutorial|teach|learn|workshop/i, 'Education'], [/live|stream/i, 'Live'], [/challenge|30.day|sprint/i, 'Challenge'], [/directory|database/i, 'Directory'], [/monet|brand deal|sponsor/i, 'Monetization']];

function ShareIdeaModal({ prefill, onClose }) {
  const open = true;
  const { state, dispatch, intel } = useStore();
  const openM = useOpen();
  const me = state.members.find((m) => m.id === state.meId);
  const [title, setTitle] = useState(prefill?.title || '');
  const [desc, setDesc] = useState(prefill?.description || '');
  const [communityId, setCommunityId] = useState(prefill?.communityId || me?.communities?.[0] || 'ai-builders');
  const [category, setCategory] = useState(categoryForCommunity(prefill?.communityId || me?.communities?.[0] || 'ai-builders'));
  const [needs, setNeeds] = useState(['Developer']);
  const [phase, setPhase] = useState('form'); // form | pipeline | done
  const [step, setStep] = useState(0);
  const [submittedTitle, setSubmittedTitle] = useState(null);

  const tags = useMemo(() => {
    const t = new Set(CATEGORY_TAGS[communityId] || []);
    KEYWORD_TAGS.forEach(([re, tag]) => re.test(`${title} ${desc}`) && t.add(tag));
    return [...t];
  }, [title, desc, communityId]);
  const similar = useMemo(() => findSimilar(`${title} ${desc}`, tags, state.ideas.filter((i) => i.status !== 'archived'), 3), [title, desc, tags, state.ideas]);
  const mod = useMemo(() => moderate(`${title} ${desc}`), [title, desc]);
  const tips = [];
  if (title.length > 0 && title.length < 15) tips.push('Make the title more specific — what exactly should be built?');
  if (desc.length < 60) tips.push('Explain why it’s useful and who it helps (60+ characters).');
  if (!needs.length) tips.push('Select what you need so the right members can help.');
  const quality = Math.min(100, 20 + Math.min(30, title.length) + Math.min(35, desc.length / 4) + needs.length * 5);
  const canSubmit = title.trim().length >= 8 && desc.trim().length >= 20 && !mod.isSpam;
  const topDup = similar[0] && similar[0].similarity > 0.38 ? similar[0] : null;

  const submit = () => {
    setPhase('pipeline');
    PIPELINE.forEach((_, i) => setTimeout(() => setStep(i + 1), 280 * (i + 1)));
    setTimeout(() => {
      setSubmittedTitle(title.trim().slice(0, 140));
      const idea = { title: title.trim().slice(0, 140), description: desc.trim().slice(0, 2000), communityId, category, needs, tags: tags.length ? tags : ['Community'], authorId: me?.id || 'me' };
      dispatch({ type: 'ADD_IDEA', idea });
      setPhase('done');
    }, 280 * (PIPELINE.length + 1));
  };
  // The idea we just created (ideas are prepended, so the first match is the newest).
  const created = phase === 'done' && submittedTitle ? state.ideas.find((i) => i.title === submittedTitle && i.authorId === (me?.id || 'me')) : null;
  const createdSig = created && intel.scored.get(created.id);
  const createdCluster = created && intel.clusterOf.get(created.id);

  return (
    <Modal open={open} onClose={onClose} width="max-w-4xl" labelledBy="share-title">
      {phase === 'form' && (
        <div className="grid md:grid-cols-[1fr_300px]">
          <form className="p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); if (canSubmit) submit(); }}>
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-accent">Share an idea</p>
            <h2 id="share-title" className="mt-1 font-display text-2xl font-semibold text-ink">What should we build together?</h2>

            <label htmlFor="idea-t" className="mt-6 block text-sm font-medium text-ink">Title</label>
            <input id="idea-t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Build an AI tool that converts YouTube videos into visual notes" className="mt-1.5 h-11 w-full rounded-xl border border-line px-3.5 text-[15px] outline-none focus:border-accent" />

            <label htmlFor="idea-d" className="mt-4 block text-sm font-medium text-ink">Description <span className="font-normal text-muted">— why is it useful?</span></label>
            <textarea id="idea-d" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} rows={4} placeholder="Who does it help, what problem does it solve, what would a first version look like?" className="mt-1.5 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-[15px] outline-none focus:border-accent" />

            <label htmlFor="idea-c" className="mt-4 block text-sm font-medium text-ink">Community</label>
            <select id="idea-c" value={communityId} onChange={(e) => { setCommunityId(e.target.value); setCategory(categoryForCommunity(e.target.value)); }} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent">
              {state.communities.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>

            <label htmlFor="idea-cat" className="mt-4 block text-sm font-medium text-ink">Category</label>
            <select id="idea-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-ink">What do you need?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {NEEDS.map((n) => {
                  const on = needs.includes(n);
                  return (
                    <button type="button" key={n} aria-pressed={on} onClick={() => setNeeds((v) => (on ? v.filter((x) => x !== n) : [...v, n]))}
                      className={cx('inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition', on ? 'border-accent bg-accent-soft font-medium text-accent' : 'border-line text-ink-2 hover:border-ink/25')}>
                      {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{n}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="accent" icon={Sparkles} disabled={!canSubmit}>Submit idea</Button>
            </div>
          </form>

          {/* Live AI copilot */}
          <aside className="border-t border-line bg-paper/60 p-6 md:rounded-r-3xl md:border-l md:border-t-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Live AI check</p>
            <div className="mt-4" aria-live="polite">
              <div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">Idea quality</span><span className="font-mono text-muted">{Math.round(quality)}</span></div>
              <Bar value={quality} color={quality >= 75 ? 'bg-mint' : quality >= 50 ? 'bg-amber' : 'bg-coral'} />
            </div>
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-muted">Detected topics</p>
                <div className="flex flex-wrap gap-1">{tags.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}</div>
              </div>
            )}
            {mod.isSpam && (
              <div className="mt-4 rounded-xl bg-coral-soft p-3 text-xs text-coral"><AlertTriangle className="mb-1 h-4 w-4" aria-hidden="true" />Looks like spam: {mod.reasons.join(', ')}</div>
            )}
            {topDup ? (
              <div className="mt-4 animate-fade-up rounded-2xl border border-accent/30 bg-white p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><GitMerge className="h-3.5 w-3.5" aria-hidden="true" /> A very similar idea already exists</p>
                <p className="mt-1.5 text-sm font-medium text-ink">{topDup.idea.title}</p>
                <p className="mt-1 text-xs text-muted">❤️ {topDup.idea.supports} supporters{intel.clusterOf.get(topDup.idea.id) ? ` • ${intel.clusterOf.get(topDup.idea.id).requests} similar requests` : ''}</p>
                <p className="mt-2 text-xs text-ink-2">Add your voice to it instead? Merged ideas get the creator’s attention faster.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" icon={Heart} onClick={() => { dispatch({ type: 'MERGE_INTO', ideaId: topDup.idea.id }); openM.idea(topDup.idea.id); }}>Support it</Button>
                  <Button size="sm" variant="ghost" onClick={() => openM.idea(topDup.idea.id)}>View</Button>
                </div>
              </div>
            ) : similar.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-muted">Related ideas</p>
                {similar.map((s) => <p key={s.idea.id} className="truncate text-xs text-ink-2">↳ {s.idea.title}</p>)}
              </div>
            ) : null}
            {tips.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {tips.map((t) => <li key={t} className="flex gap-1.5 text-xs text-ink-2"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden="true" />{t}</li>)}
              </ul>
            )}
          </aside>
        </div>
      )}

      {phase !== 'form' && (
        <div className="p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-accent">FanOS Intelligence Pipeline</p>
          <h2 id="share-title" className="mt-1 font-display text-2xl font-semibold text-ink">{phase === 'done' ? 'Your idea is live 🎉' : 'Analyzing your idea…'}</h2>
          <ol className="mt-6 grid gap-2 sm:grid-cols-2">
            {PIPELINE.map(([Icon, label], i) => {
              const done = step > i, active = step === i;
              return (
                <li key={label} className={cx('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition', done ? 'border-mint/30 bg-mint-soft/60 text-ink' : active ? 'border-accent/40 bg-accent-soft text-ink' : 'border-line text-muted')}>
                  {done ? <Check className="h-4 w-4 text-mint" aria-hidden="true" /> : active ? <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                  {label}
                </li>
              );
            })}
          </ol>
          {phase === 'done' && !created && (
            <p className="mt-6 text-sm text-muted">Saving to the community…</p>
          )}
          {phase === 'done' && created && (
            <div className="mt-6 animate-fade-up rounded-2xl border border-line p-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={createdSig.score} size={60} />
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">{created.title}</p>
                  <p className="text-sm text-muted">Initial Signal Score {createdSig.score} • {createdSig.label}{createdCluster ? ` • joined cluster “${createdCluster.label}”` : ''}</p>
                  <p className="mt-2 text-sm text-ink-2"><span className="font-semibold text-accent">AI Summary:</span> {summarizeIdea(created)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={() => openM.idea(created.id)}>View idea</Button>
                <Button variant="ghost" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ promote
const PLATFORMS = ['Instagram', 'X', 'LinkedIn', 'Announcement'];
function PromoteModal({ id, onClose }) {
  const { state, dispatch } = useStore();
  const idea = state.ideas.find((i) => i.id === id);
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('Excited');
  const [variant, setVariant] = useState(0);
  const [text, setText] = useState(() => (idea ? generatePromo(idea, state, 0, 'Excited').Instagram : ''));
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  if (!idea) return <Modal open={false} onClose={onClose} />;

  // Optional LLM rewrite (server /api/ai, only when an API key is configured).
  const rewriteWithAI = async () => {
    setGenerating(true);
    try {
      const author = state.members.find((m) => m.id === idea.authorId)?.name;
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'promo', platform, tone, creator: CREATOR.name, idea: { title: idea.title, description: idea.description, author, supports: idea.supports, volunteers: idea.volunteers.length } }) });
      const d = await r.json();
      if (r.ok && d.text) setText(d.text);
      else dispatch({ type: 'TOAST', toast: { text: 'AI rewrite unavailable — kept the current draft' } });
    } catch { dispatch({ type: 'TOAST', toast: { text: 'AI rewrite unavailable' } }); }
    setGenerating(false);
  };

  // Regenerate with a short "thinking" state so the change is visible.
  const regenerate = (next) => {
    const p = next.platform ?? platform, t = next.tone ?? tone, v = next.variant ?? variant;
    setPlatform(p); setTone(t); setVariant(v);
    setGenerating(true);
    setTimeout(() => { setText(generatePromo(idea, state, v, t)[p]); setGenerating(false); }, 450);
  };

  const limit = platform === 'X' ? 280 : platform === 'Instagram' ? 2200 : 3000;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard unavailable */ }
  };

  return (
    <Modal open onClose={onClose} width="max-w-3xl" labelledBy="promote-title">
      <div className="p-6 sm:p-8">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Promote to audience</p>
        <h2 id="promote-title" className="mt-1 pr-8 font-display text-2xl font-semibold text-ink">{idea.title}</h2>
        <p className="mt-1 text-sm text-muted">AI drafts posts for every channel using real community data: {idea.supports.toLocaleString('en-US')} supporters, {idea.volunteers.length} volunteers.</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Platform" className="flex gap-1 rounded-xl bg-line-2 p-1">
            {PLATFORMS.map((p) => (
              <button key={p} role="tab" aria-selected={platform === p} onClick={() => regenerate({ platform: p })}
                className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', platform === p ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>{p === 'Announcement' ? 'Community' : p}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tone" className="text-xs text-muted">Tone</label>
            <select id="tone" value={tone} onChange={(e) => regenerate({ tone: e.target.value })} className="h-9 rounded-xl border border-line bg-white px-2 text-sm">
              {['Excited', 'Professional', 'Casual'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => regenerate({ variant: variant + 1 })}>Regenerate</Button>
            {state.aiEnabled && state.mode === 'live' && <Button size="sm" variant="soft" icon={Sparkles} disabled={generating} onClick={rewriteWithAI}>Rewrite with AI</Button>}
          </div>
        </div>

        <div className="relative mt-4">
          <label htmlFor="promo-text" className="sr-only">Generated post</label>
          {generating && <div className="absolute inset-0 z-10 space-y-2 rounded-2xl border border-line bg-white p-4">{[90, 75, 95, 60, 80].map((w, i) => <div key={i} className="shimmer h-3.5 rounded" style={{ width: `${w}%` }} />)}</div>}
          <textarea id="promo-text" value={text} onChange={(e) => setText(e.target.value)} rows={platform === 'X' ? 5 : 11} className="w-full resize-none rounded-2xl border border-line p-4 text-[15px] leading-relaxed text-ink outline-none focus:border-accent" />
          <p className={cx('mt-1 text-right text-xs', text.length > limit ? 'text-coral' : 'text-muted')}>{text.length} / {limit}</p>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Button>
          {!idea.featured && <Button variant="secondary" icon={Star} onClick={() => dispatch({ type: 'FEATURE', ideaId: idea.id })}>Feature too</Button>}
          <Button variant="accent" icon={Send} onClick={() => { dispatch({ type: 'ANNOUNCE', ideaId: idea.id, text: generatePromo(idea, state, variant, tone).Announcement }); if (!idea.featured) dispatch({ type: 'FEATURE', ideaId: idea.id }); onClose(); }}>Post to community</Button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ turn into project
const TASKS_BY_NEED = {
  Developer: 'Build the first working prototype', Designer: 'Design the core screens & brand', Marketing: 'Plan the launch with the community',
  'Video Editor': 'Edit the announcement video', Writer: 'Write the launch post & docs', Funding: 'Scope budget & sponsors', Feedback: 'Run a feedback round with 20 members',
};
function ProjectModal({ id, onClose }) {
  const { state, dispatch } = useStore();
  const idea = state.ideas.find((i) => i.id === id);
  const team = useMemo(() => (idea ? recommendTeam(idea, state.members) : []), [idea, state.members]);
  const [name, setName] = useState(() => (idea ? idea.title.replace(/^(build|make|please|we need)( a| an)?\s+/i, '').replace(/^./, (c) => c.toUpperCase()) : ''));
  const [picked, setPicked] = useState(() => Object.fromEntries(team.map((t) => [t.member.id, true])));
  if (!idea) return <Modal open={false} onClose={onClose} />;
  const tasks = ['Kick-off call & define the first milestone', ...idea.needs.map((n) => TASKS_BY_NEED[n]).filter(Boolean)];
  const chosen = team.filter((t) => picked[t.member.id]);

  return (
    <Modal open onClose={onClose} width="max-w-3xl" labelledBy="project-title">
      <div className="p-6 sm:p-8">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Rocket className="h-3.5 w-3.5" aria-hidden="true" /> Create collaboration</p>
        <h2 id="project-title" className="mt-1 font-display text-2xl font-semibold text-ink">From idea to action — {idea.title}</h2>

        <label htmlFor="pname" className="mt-6 block text-sm font-medium text-ink">Project name</label>
        <input id="pname" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3.5 outline-none focus:border-accent" />

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-ink">AI-recommended team</p>
            <p className="text-xs text-muted">Matched from volunteers by skills needed & contribution score</p>
          </div>
          <Chip tone="accent" icon={Sparkles}>{chosen.length} selected</Chip>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {team.map((t) => {
            const on = !!picked[t.member.id];
            return (
              <li key={t.member.id}>
                <button aria-pressed={on} onClick={() => setPicked((p) => ({ ...p, [t.member.id]: !on }))}
                  className={cx('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', on ? 'border-accent bg-accent-soft/50' : 'border-line hover:border-ink/20')}>
                  <Avatar name={t.member.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{t.member.name}</p>
                    <p className="truncate text-xs text-muted">{t.role} • {t.member.skills.slice(0, 2).join(', ')} • {t.score}</p>
                    {t.volunteered && <p className="text-[11px] font-medium text-mint">Volunteered</p>}
                  </div>
                  <span className={cx('flex h-5 w-5 items-center justify-center rounded-md border', on ? 'border-accent bg-accent text-white' : 'border-line')}>{on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-sm font-medium text-ink">Starter tasks</p>
        <ul className="mt-2 space-y-1.5">
          {tasks.map((t) => <li key={t} className="flex items-center gap-2 text-sm text-ink-2"><span className="h-4 w-4 rounded border border-line" aria-hidden="true" />{t}</li>)}
        </ul>

        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" icon={Rocket} disabled={!name.trim() || !chosen.length}
            onClick={() => {
              dispatch({ type: 'CREATE_PROJECT', ideaId: idea.id, name: name.trim(), description: idea.description, contributors: chosen.map((c) => ({ memberId: c.member.id, role: c.role })), tasks });
              dispatch({ type: 'NAV', patch: { modal: null } });
            }}>
            Create project & invite {chosen.length}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ profile
function ProfileDrawer({ id, onClose }) {
  const { state, dispatch } = useStore();
  const open = useOpen();
  const m = state.members.find((x) => x.id === id);
  if (!m) return <Modal open={false} onClose={onClose} />;
  const score = contributionScore(m);
  const ideas = state.ideas.filter((i) => i.authorId === m.id);
  const projects = state.projects.filter((p) => p.contributors.some((c) => c.memberId === m.id));
  const helping = state.ideas.filter((i) => i.volunteers.some((v) => v.memberId === m.id));
  const isCreator = state.view === 'creator';
  const communities = state.communities.filter((c) => m.communities.includes(c.id));
  return (
    <Modal open onClose={onClose} side labelledBy="profile-name">
      <div className="bg-gradient-to-br from-accent/10 via-white to-coral/10 p-6 pt-10">
        <Avatar name={m.name} size={64} />
        <h2 id="profile-name" className="mt-3 font-display text-xl font-semibold text-ink">{m.name}</h2>
        <p className="text-sm text-muted">{m.handle} • {m.role}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{m.city} • joined {ago(m.joinedDaysAgo)} • {fmt(m.socialFollowers)} social followers</p>
        <p className="mt-3 text-sm text-ink-2">{m.bio}</p>
      </div>
      <div className="p-6">
        <div className="ai-border ai-glow rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Contribution Score</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{score}</p>
          <p className="text-xs text-muted">Value, not popularity — {m.positive}% positive community feedback{m.growth > 0 ? ` • +${m.growth}% this month` : ''}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[['Ideas', m.stats.ideas], ['Helpful', m.stats.helpful], ['Projects', m.stats.projects], ['Featured', m.stats.featured]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/70 p-2"><p className="font-display font-semibold text-ink">{v}</p><p className="text-[10px] text-muted">{k}</p></div>
            ))}
          </div>
        </div>

        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Skills</p>
        <div className="flex flex-wrap gap-1">{m.skills.map((s) => <Chip key={s} tone="accent">{s}</Chip>)}</div>
        <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Interests</p>
        <div className="flex flex-wrap gap-1">{m.interests.map((s) => <Chip key={s}>{s}</Chip>)}</div>
        <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Communities</p>
        <div className="flex flex-wrap gap-1">{communities.map((c) => <Chip key={c.id} tone="outline">{c.emoji} {c.name}</Chip>)}</div>

        {(ideas.length > 0 || helping.length > 0) && (
          <>
            <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Activity</p>
            <ul className="space-y-1">
              {ideas.slice(0, 3).map((i) => <li key={i.id}><button onClick={() => open.idea(i.id)} className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm text-ink-2 hover:bg-paper"><Lightbulb className="h-4 w-4 shrink-0 text-amber" aria-hidden="true" /><span className="truncate">Proposed “{i.title}”</span></button></li>)}
              {helping.slice(0, 3).map((i) => <li key={i.id}><button onClick={() => open.idea(i.id)} className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm text-ink-2 hover:bg-paper"><Handshake className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" /><span className="truncate">Volunteered on “{i.title}”</span></button></li>)}
              {projects.slice(0, 2).map((p) => <li key={p.id} className="flex items-center gap-2 p-1.5 text-sm text-ink-2"><Award className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><span className="truncate">Contributor on {p.name}</span></li>)}
            </ul>
          </>
        )}

        {isCreator && (
          <div className="mt-6 flex gap-2">
            <Button variant="accent" className="flex-1" icon={Send} onClick={() => open.invite(m.id)}>Invite to collaborate</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ create community
function CreateCommunityModal({ onClose }) {
  const open = true;
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [description, setDescription] = useState('');
  return (
    <Modal open={open} onClose={onClose} width="max-w-lg" labelledBy="cc-title">
      <form className="p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; dispatch({ type: 'CREATE_COMMUNITY', community: { name: name.trim().slice(0, 40), emoji, description: description.trim().slice(0, 160) || 'A new space for focused contributions.', interest: 'Other' } }); onClose(); }}>
        <h2 id="cc-title" className="font-display text-xl font-semibold text-ink">Create a community</h2>
        <p className="mt-1 text-sm text-muted">Communities organise members around structured contributions — not chat.</p>
        <div className="mt-5 flex gap-2">
          <div>
            <label htmlFor="cc-e" className="block text-sm font-medium text-ink">Icon</label>
            <select id="cc-e" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1.5 h-11 rounded-xl border border-line bg-white px-2 text-lg">
              {['✨', '🤖', '📚', '🎮', '🎙️', '🌍', '📸', '🧠', '🛠️'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="cc-n" className="block text-sm font-medium text-ink">Name</label>
            <input id="cc-n" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Podcast Lab" className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-accent" />
          </div>
        </div>
        <label htmlFor="cc-d" className="mt-4 block text-sm font-medium text-ink">Purpose</label>
        <input id="cc-d" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} placeholder="What will members contribute here?" className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-accent" />
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!name.trim()}>Create</Button></div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ invite
function InviteModal({ memberId, projectId: preProject, onClose }) {
  const { state, dispatch } = useStore();
  const m = state.members.find((x) => x.id === memberId);
  const [projectId, setProjectId] = useState(preProject || state.projects[0]?.id || '');
  const [message, setMessage] = useState('');
  if (!m) return <Modal open={false} onClose={onClose} />;
  const pending = state.invites.filter((i) => i.memberId === m.id);
  return (
    <Modal open onClose={onClose} width="max-w-lg" labelledBy="inv-title">
      <form className="p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'INVITE', memberId: m.id, projectId: projectId || null, message: message.trim().slice(0, 280) }); onClose(); }}>
        <div className="flex items-center gap-3"><Avatar name={m.name} size={44} /><div><h2 id="inv-title" className="font-display text-xl font-semibold text-ink">Invite {m.name.split(' ')[0]} to collaborate</h2><p className="text-sm text-muted">{m.role} • {m.skills.slice(0, 3).join(', ')} • score {contributionScore(m)}</p></div></div>
        <label htmlFor="inv-p" className="mt-6 block text-sm font-medium text-ink">Project</label>
        <select id="inv-p" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm">
          <option value="">General collaboration (no project yet)</option>
          {state.projects.map((p) => <option key={p.id} value={p.id} disabled={p.contributors.some((c) => c.memberId === m.id)}>{p.name}{p.contributors.some((c) => c.memberId === m.id) ? ' (already in team)' : ''}</option>)}
        </select>
        <label htmlFor="inv-msg" className="mt-4 block text-sm font-medium text-ink">Message <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="inv-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} rows={3} placeholder={`Hey ${m.name.split(' ')[0]}, loved your contributions — want to build this with us?`} className="mt-1.5 w-full resize-none rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent" />
        {pending.length > 0 && <p className="mt-3 text-xs text-muted">Previous invites: {pending.map((i) => `${state.projects.find((p) => p.id === i.projectId)?.name || 'General'} (${i.status})`).join(', ')}</p>}
        <p className="mt-3 text-xs text-muted">{m.name.split(' ')[0]} sees this invitation on their FanOS home and can accept or decline.</p>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="accent" icon={Send}>Send invitation</Button></div>
      </form>
    </Modal>
  );
}
