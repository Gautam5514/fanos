'use client';

// Public page for a featured idea: /i/:creatorId/:id. Readable without an account so the creator
// can promote it anywhere. Data comes from GET /api/public/ideas/:creatorId/:id (featured only).
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Handshake, Heart, MessagesSquare, Rocket, Share2, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, Bar, Button, Chip, Logo } from './ui';
import { Aurora } from './chrome';
import { StageChip, StageTrack } from './shared';

export default function PublicIdea({ id, communityId }) {
  const { state, dispatch } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!communityId) return undefined;
    let alive = true;
    fetch(`/api/public/ideas/${encodeURIComponent(communityId)}/${encodeURIComponent(id)}`)
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Not found'); return d; })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id, communityId]);

  const user = state.user;
  const creatorName = data?.creator?.name || 'the creator';
  const first = creatorName.split(' ')[0];
  const join = () => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'signup', authRole: 'member', viaInvite: true, inviteCommunity: communityId } });
  const openInApp = () => dispatch({ type: 'NAV', patch: user.role === 'creator'
    ? { view: 'creator', creatorPage: 'ideas', modal: { type: 'idea', id } }
    : { view: 'member', memberPage: 'ideas', modal: { type: 'idea', id } } });
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data?.idea.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch { /* cancelled */ }
  };

  const header = (
    <header className="glass sticky top-0 z-30 border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} aria-label="FanOS home"><Logo /></button>
        <div className="flex items-center gap-2">
          {user
            ? <Button size="sm" variant="primary" arrow onClick={openInApp}>Open in FanOS</Button>
            : <>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'login' } })}>Log in</Button>
              <Button size="sm" variant="primary" arrow onClick={join}>Join</Button>
            </>}
        </div>
      </div>
    </header>
  );

  if (error || !communityId || !data) {
    return (
      <div className="relative min-h-screen bg-paper">
        <Aurora className="h-[420px]" />
        {header}
        <main className="relative mx-auto flex max-w-xl flex-col items-center px-6 py-28 text-center">
          {error || !communityId ? (
            <>
              <h1 className="font-display text-3xl font-semibold text-ink">This idea isn’t public</h1>
              <p className="mt-2 text-ink-2">It may have been unfeatured or archived by the creator.</p>
              <Button className="mt-6" variant="secondary" icon={ArrowLeft} onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })}>Go to FanOS</Button>
            </>
          ) : <span className="animate-pulse"><Logo size={36} /></span>}
        </main>
      </div>
    );
  }

  const { idea, project, community } = data;
  const pct = project ? Math.round((project.done / Math.max(1, project.tasks)) * 100) : 0;
  const stats = [[Heart, idea.supports, 'supporters'], [Handshake, idea.volunteers, 'people offering help'], [MessagesSquare, idea.comments, 'comments']];

  return (
    <div className="relative min-h-screen bg-paper">
      <Aurora className="h-[560px]" />
      {header}
      <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <article className="animate-fade-up">
          <p className="text-sm text-muted">Featured by <span className="font-semibold text-ink">{creatorName}</span>{data.creator.handle ? ` ${data.creator.handle}` : ''}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StageChip stage={idea.stage} />
            {community && <Chip>{community.emoji} {community.name}</Chip>}
            {idea.tags.slice(0, 3).map((t) => <Chip key={t} tone="outline">{t}</Chip>)}
          </div>
          <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl">{idea.title}</h1>
          {idea.author && <p className="mt-3 flex items-center gap-2 text-sm text-ink-2"><Avatar name={idea.author.name} size={26} /> Proposed by <span className="font-medium text-ink">{idea.author.name}</span> · {idea.author.role}</p>}
          <div className="mt-6 max-w-xl"><StageTrack stage={idea.stage} /></div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <section className="card p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted">The idea</h2>
                {idea.summary && <p className="mt-2 font-medium text-ink">{idea.summary}</p>}
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{idea.description}</p>
                {idea.needs.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted">Looking for</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{idea.needs.map((n) => <Chip key={n} tone="accent">{n}</Chip>)}</div>
                  </div>
                )}
              </section>

              {project && (
                <section className="card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-muted"><Rocket className="h-3.5 w-3.5" aria-hidden="true" /> Project</h2>
                    <Chip tone={project.status === 'Completed' ? 'mint' : 'amber'} icon={project.status === 'Completed' ? Check : undefined}>{project.status === 'Completed' ? 'Completed' : 'In progress'}</Chip>
                  </div>
                  <p className="mt-2 font-display text-xl font-semibold text-ink">{project.name}</p>
                  <div className="mt-4 flex items-center gap-3"><div className="flex-1"><Bar value={pct} color="bg-mint" /></div><span className="text-sm font-semibold text-ink">{project.done}/{project.tasks} tasks</span></div>
                  {project.owner && <p className="mt-3 text-sm text-ink-2">Owner: <span className="font-medium text-ink">{project.owner}</span></p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.contributors.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm">
                        <Avatar name={c.name} size={24} /><span className="text-ink">{c.name}</span><span className="text-muted">· {c.role}</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <div className="card divide-y divide-line p-2">
                {stats.map(([Icon, n, label]) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span><span className="block font-display text-xl font-semibold leading-none text-ink">{n.toLocaleString('en-US')}</span><span className="text-xs text-muted">{label}</span></span>
                  </div>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-[20px] bg-night p-5 text-white">
                <Aurora tone="dark" />
                <div className="relative">
                  <Users className="h-5 w-5 text-[#b9a8ff]" aria-hidden="true" />
                  <p className="mt-3 font-display text-lg font-semibold">{user ? 'Help move it forward' : `Join ${first}’s community`}</p>
                  <p className="mt-1 text-sm text-white/70">{user ? 'Support it, comment, or offer your skills.' : 'Support this idea, comment, or offer your skills.'}</p>
                  {user
                    ? <Button className="mt-4 w-full bg-white text-ink hover:bg-white/90" arrow onClick={openInApp}>Open in FanOS</Button>
                    : <Button className="mt-4 w-full bg-white text-ink hover:bg-white/90" arrow onClick={join}>Join free</Button>}
                </div>
              </div>
              <Button variant="secondary" icon={copied ? Check : Share2} className="w-full" onClick={share}>{copied ? 'Link copied' : 'Share this idea'}</Button>
            </aside>
          </div>
        </article>
      </main>
    </div>
  );
}
