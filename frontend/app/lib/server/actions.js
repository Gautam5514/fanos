// Validates, authorizes and applies a client action to the shared server state.
// The browser never sends trusted data: every field is re-built here from allow-lists,
// identities (authorId, memberId, asCreator) come from the session, never the payload.

import { reducer, SHARED_KEYS, pickShared } from '../reducer';
import { CATEGORIES, GOALS, INTERESTS, NEEDS, ROLES, ROLE_SKILLS } from '../seed';
import { moderate } from '../ai';
import { withRetry } from './db';
import { setMemberId } from './auth';

export class ActionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const str = (v, max, min = 0) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  if (s.length < min) throw new ActionError(400, `Text too short (min ${min})`);
  return s;
};
const pickList = (v, allowed, max = 12) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))].slice(0, max) : []);
const ID_RE = /^[a-z]{1,5}_[a-z0-9]{4,32}$/;
const clientId = (v, exists) => (typeof v === 'string' && ID_RE.test(v) && !exists(v) ? v : undefined);

const CREATOR_ONLY = new Set(['FEATURE', 'ANNOUNCE', 'CREATE_PROJECT', 'OPP_STATUS', 'CREATE_COMMUNITY', 'INVITE', 'ADD_CONTRIBUTOR', 'SET_CREATOR', 'RESET']);
const MEMBER_ONLY = new Set(['SUPPORT', 'VOLUNTEER', 'ADD_IDEA', 'MERGE_INTO', 'JOIN_COMMUNITY', 'JOIN_PROJECT', 'RESPOND_INVITE', 'ONBOARD']);
const ALLOWED = new Set([...CREATOR_ONLY, ...MEMBER_ONLY, 'COMMENT', 'TOGGLE_TASK', 'ADD_TASK', 'ADD_UPDATE']);

function sanitize(a, user, st) {
  const idea = (id) => { const i = st.ideas.find((x) => x.id === id); if (!i) throw new ActionError(404, 'Idea not found'); return i; };
  const project = (id) => { const p = st.projects.find((x) => x.id === id); if (!p) throw new ActionError(404, 'Project not found'); return p; };
  const member = (id) => { const m = st.members.find((x) => x.id === id); if (!m) throw new ActionError(404, 'Member not found'); return m; };
  const isCreator = user.role === 'creator';
  const canEditProject = (p) => isCreator || p.contributors.some((c) => c.memberId === user.memberId);

  switch (a.type) {
    case 'ONBOARD': {
      const role = ROLES.includes(a.profile?.role) ? a.profile.role : null;
      if (!role) throw new ActionError(400, 'Choose what you can contribute');
      const interests = pickList(a.profile?.interests, INTERESTS);
      if (!interests.length) throw new ActionError(400, 'Choose at least one interest');
      return {
        type: 'ONBOARD', memberId: `m_u_${user.id}`,
        profile: { name: str(a.profile?.name, 40, 2), role, interests, skills: pickList(a.profile?.skills, ROLE_SKILLS[role] || []), goals: pickList(a.profile?.goals, GOALS), city: str(a.profile?.city, 40) || '—' },
        communities: pickList(a.communities, st.communities.map((c) => c.id), 20),
      };
    }
    case 'SET_CREATOR': {
      const platforms = Array.isArray(a.creator?.platforms) ? a.creator.platforms.slice(0, 6).map((p) => ({ name: str(p?.name, 20), followers: Math.max(0, Math.min(1e10, Math.round(Number(p?.followers) || 0))) })).filter((p) => p.name) : undefined;
      return { type: 'SET_CREATOR', creator: { name: str(a.creator?.name, 60, 2), handle: str(a.creator?.handle, 40), niche: str(a.creator?.niche, 80), ...(platforms ? { platforms } : {}) } };
    }
    case 'JOIN_COMMUNITY':
      if (!st.communities.some((c) => c.id === a.communityId)) throw new ActionError(404, 'Community not found');
      return { type: a.type, communityId: a.communityId };
    case 'CREATE_COMMUNITY':
      return { type: a.type, id: clientId(a.id, (v) => st.communities.some((c) => c.id === v)), community: { name: str(a.community?.name, 40, 2), emoji: str(a.community?.emoji, 4) || '✨', description: str(a.community?.description, 160) || 'A new space for focused contributions.', interest: 'Other' } };
    case 'SUPPORT': case 'MERGE_INTO': case 'FEATURE':
      idea(a.ideaId);
      return { type: a.type, ideaId: a.ideaId };
    case 'VOLUNTEER':
      idea(a.ideaId);
      return { type: a.type, ideaId: a.ideaId, note: str(a.note, 280) };
    case 'COMMENT':
      idea(a.ideaId);
      return { type: a.type, ideaId: a.ideaId, text: str(a.text, 1000, 1), asCreator: isCreator, id: clientId(a.id, () => false) };
    case 'ADD_IDEA': {
      const i = a.idea || {};
      const title = str(i.title, 140, 8), description = str(i.description, 2000, 20);
      const mod = moderate(`${title} ${description}`);
      if (mod.isSpam) throw new ActionError(422, `Looks like spam: ${mod.reasons.join(', ')}`);
      if (!st.communities.some((c) => c.id === i.communityId)) throw new ActionError(400, 'Choose a community');
      const tags = (Array.isArray(i.tags) ? i.tags : []).filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 6);
      return {
        type: a.type, id: clientId(a.id, (v) => st.ideas.some((x) => x.id === v)),
        idea: { title, description, communityId: i.communityId, category: CATEGORIES.includes(i.category) ? i.category : 'AI', needs: pickList(i.needs, NEEDS), tags: tags.length ? tags : ['Community'], authorId: user.memberId },
      };
    }
    case 'ANNOUNCE':
      idea(a.ideaId);
      return { type: a.type, ideaId: a.ideaId, text: str(a.text, 3000, 1), id: clientId(a.id, () => false) };
    case 'CREATE_PROJECT': {
      const i = idea(a.ideaId);
      if (i.status === 'project') throw new ActionError(409, 'This idea is already a project');
      const contributors = (Array.isArray(a.contributors) ? a.contributors : []).slice(0, 12).map((c) => member(c?.memberId)).map((m) => ({ memberId: m.id, role: m.role }));
      if (!contributors.length) throw new ActionError(400, 'Pick at least one contributor');
      const tasks = (Array.isArray(a.tasks) ? a.tasks : []).filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 120)).filter(Boolean).slice(0, 10);
      return { type: a.type, id: clientId(a.id, (v) => st.projects.some((p) => p.id === v)), ideaId: i.id, name: str(a.name, 80, 2), description: i.description, contributors, tasks };
    }
    case 'TOGGLE_TASK': {
      const p = project(a.projectId);
      if (!canEditProject(p)) throw new ActionError(403, 'Only the team can edit tasks');
      return { type: a.type, projectId: p.id, taskId: String(a.taskId || '').slice(0, 40) };
    }
    case 'ADD_TASK': {
      const p = project(a.projectId);
      if (!canEditProject(p)) throw new ActionError(403, 'Only the team can add tasks');
      return { type: a.type, projectId: p.id, title: str(a.title, 120, 1), id: clientId(a.id, () => false) };
    }
    case 'ADD_UPDATE': {
      const p = project(a.projectId);
      if (!canEditProject(p)) throw new ActionError(403, 'Only the team can post updates');
      return { type: a.type, projectId: p.id, text: str(a.text, 500, 1), memberId: isCreator ? 'creator' : user.memberId, id: clientId(a.id, () => false) };
    }
    case 'JOIN_PROJECT':
      project(a.projectId);
      return { type: a.type, projectId: a.projectId };
    case 'ADD_CONTRIBUTOR':
      project(a.projectId); member(a.memberId);
      return { type: a.type, projectId: a.projectId, memberId: a.memberId };
    case 'INVITE':
      member(a.memberId);
      if (a.projectId) project(a.projectId);
      return { type: a.type, memberId: a.memberId, projectId: a.projectId || null, message: str(a.message, 280), id: clientId(a.id, () => false) };
    case 'RESPOND_INVITE':
      return { type: a.type, inviteId: String(a.inviteId || '').slice(0, 40), accept: a.accept === true };
    case 'OPP_STATUS':
      if (!st.opportunities.some((o) => o.id === a.oppId)) throw new ActionError(404, 'Not found');
      if (!['new', 'replied', 'accepted', 'archived'].includes(a.status)) throw new ActionError(400, 'Bad status');
      return { type: a.type, oppId: a.oppId, status: a.status };
    case 'RESET':
      return { type: 'RESET', keepMembers: st.members.filter((m) => m.isReal).map((m) => ({ ...m, stats: { ideas: 0, helpful: 0, projects: 0, featured: 0 } })) };
    default:
      throw new ActionError(400, 'Unknown action');
  }
}

// Snapshot sent to a client: creators see everything, members never see the private inbox.
export function snapshotFor(user, st) {
  const shared = pickShared(st);
  if (user.role !== 'creator') {
    shared.opportunities = [];
    shared.invites = (shared.invites || []).filter((i) => i.memberId === user.memberId);
  }
  return { shared, version: st.version, supported: user.memberId ? st.memberSupports?.[user.memberId] || {} : {} };
}

export async function applyAction(user, raw) {
  if (!raw || typeof raw.type !== 'string' || !ALLOWED.has(raw.type)) throw new ActionError(400, 'Unknown action');
  if (CREATOR_ONLY.has(raw.type) && user.role !== 'creator') throw new ActionError(403, 'Creator only');
  if (MEMBER_ONLY.has(raw.type) && user.role !== 'member') throw new ActionError(403, 'Members only');
  if (raw.type !== 'ONBOARD' && user.role === 'member' && !user.memberId) throw new ActionError(409, 'Finish onboarding first');

  const { st, result: action } = await withRetry(async (st) => {
    const action = sanitize(raw, user, st);
    const memberId = action.type === 'ONBOARD' ? action.memberId : user.memberId;
    const ctx = { ...pickShared(st), mode: 'live', meId: memberId || null, supported: (memberId && st.memberSupports?.[memberId]) || {}, saved: {}, validation: {} };
    const next = reducer(ctx, action);
    SHARED_KEYS.forEach((k) => (st[k] = next[k]));
    if (memberId) st.memberSupports = { ...(st.memberSupports || {}), [memberId]: next.supported };
    return action;
  });

  if (action.type === 'ONBOARD' && user.memberId !== action.memberId) {
    await setMemberId(user.id, action.memberId);
    user.memberId = action.memberId;
  }
  return { action, snapshot: snapshotFor(user, st) };
}

// Used for background AI enrichment (not exposed to clients).
export async function applyInternal(action) {
  await withRetry(async (st) => {
    const next = reducer({ ...pickShared(st), supported: {}, saved: {}, validation: {} }, action);
    SHARED_KEYS.forEach((k) => (st[k] = next[k]));
  });
}
