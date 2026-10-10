// Public, read-only data for shareable pages (no sign-in). Multi-tenant: every public page
// is scoped to ONE creator's community via the creatorId in the path.
//   GET /api/public/community/:creatorId      → invite preview: creator profile, counts, communities.
//   GET /api/public/ideas/:creatorId/:id       → a FEATURED idea's public view, or 404.
// Only ideas the creator has featured are exposed, and only safe fields:
// members appear as first name + last initial, never emails or ids.
import { Router } from 'express';
import { loadState } from '../lib/db.js';
import { rateLimited, getCommunityCreator } from '../lib/auth.js';
import { ideaStage } from '../shared/reducer.js';

const router = Router();

const shortName = (name = '') => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first || 'A member';
};

// What a follower sees when they open a creator's invite link (before signing up).
router.get('/community/:creatorId', async (req, res) => {
  if (rateLimited(req, 'public', 120, 60_000)) return res.status(429).json({ error: 'Too many requests' });
  const creator = await getCommunityCreator(req.params.creatorId);
  if (!creator) return res.status(404).json({ error: 'That community link is invalid or no longer exists.' });
  const st = await loadState(creator.id);
  const c = st.creator || {};
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    creatorId: creator.id,
    ready: !!c.claimed, // false until the creator finishes setting up their profile
    creator: c.claimed ? { name: c.name || '', handle: c.handle || '', niche: c.niche || '', platforms: (c.platforms || []).map((p) => ({ name: p.name, followers: p.followers })) } : { name: creator.name || '' },
    members: st.members.length,
    ideas: st.ideas.filter((i) => i.status !== 'archived').length,
    communities: st.communities.map((x) => ({ name: x.name, emoji: x.emoji })),
  });
});

router.get('/ideas/:creatorId/:id', async (req, res) => {
  if (rateLimited(req, 'public', 120, 60_000)) return res.status(429).json({ error: 'Too many requests' });
  const creator = await getCommunityCreator(req.params.creatorId);
  if (!creator) return res.status(404).json({ error: 'This idea is not public' });
  const st = await loadState(creator.id);
  const idea = st.ideas.find((i) => i.id === req.params.id);
  if (!idea || !idea.featured || idea.status === 'archived') return res.status(404).json({ error: 'This idea is not public' });
  const member = (id) => st.members.find((m) => m.id === id);
  const author = member(idea.authorId);
  const community = st.communities.find((c) => c.id === idea.communityId);
  const project = st.projects.find((p) => p.id === idea.projectId || p.ideaId === idea.id);
  const done = project ? project.tasks.filter((t) => t.done).length : 0;
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    creatorId: creator.id,
    idea: {
      id: idea.id, title: idea.title, description: idea.description, summary: idea.aiSummary || null,
      tags: idea.tags, needs: idea.needs, supports: idea.supports, comments: idea.commentsCount || 0,
      volunteers: idea.volunteers.length, stage: ideaStage(idea, st.projects), createdAt: idea.createdAt || null,
      author: author ? { name: shortName(author.name), role: author.role } : null,
    },
    community: community ? { name: community.name, emoji: community.emoji } : null,
    creator: { name: st.creator?.name || '', handle: st.creator?.handle || '', niche: st.creator?.niche || '' },
    project: project ? {
      name: project.name, status: project.status, tasks: project.tasks.length, done,
      owner: member(project.ownerId) ? shortName(member(project.ownerId).name) : null,
      contributors: project.contributors.map((c) => ({ name: shortName(member(c.memberId)?.name), role: c.role })),
    } : null,
  });
});

export default router;
