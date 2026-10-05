// Pure state logic shared by the browser (optimistic updates)
// and the server (/api/actions applies the same reducer to the shared store).
// No React, no browser or Node APIs here.

import { DEFAULT_CREATOR, communitiesForProfile, ROLE_SKILLS } from './seed.js';

// Keys that live on the server in live mode (everything else is per-browser UI state).
export const SHARED_KEYS = ['creator', 'members', 'ideas', 'communities', 'projects', 'opportunities', 'announcements', 'activity', 'topicBoost', 'newActivity', 'invites'];

// Actions that change shared data (sent to the server in live mode).
export const SHARED_ACTIONS = new Set([
  'ONBOARD', 'SET_CREATOR', 'JOIN_COMMUNITY', 'CREATE_COMMUNITY', 'SUPPORT', 'VOLUNTEER', 'COMMENT', 'ADD_IDEA', 'MERGE_INTO',
  'FEATURE', 'ANNOUNCE', 'CREATE_PROJECT', 'TOGGLE_TASK', 'ADD_TASK', 'ADD_UPDATE', 'JOIN_PROJECT', 'ADD_CONTRIBUTOR',
  'INVITE', 'RESPOND_INVITE', 'OPP_STATUS', 'SET_SUMMARY', 'RESET',
  'SELECT_IDEA', 'ARCHIVE_IDEA', 'PROJECT_STATUS', 'SET_OWNER',
]);

// Idea lifecycle: Submitted → Discussing → Selected → In progress → Completed (or Archived).
// Derived from stored facts, so it can never drift out of sync:
//   comments/help offers → discussing, creator selection → selected, workspace → in progress,
//   project marked complete → completed.
export const STAGES = ['submitted', 'discussing', 'selected', 'in_progress', 'completed'];
export const STAGE_LABEL = { submitted: 'Submitted', discussing: 'Discussing', selected: 'Selected', in_progress: 'In progress', completed: 'Completed', archived: 'Archived' };
export function ideaStage(idea, projects = []) {
  if (idea.status === 'archived') return 'archived';
  if (idea.status === 'project') {
    const p = projects.find((x) => x.id === idea.projectId || x.ideaId === idea.id);
    return p?.status === 'Completed' ? 'completed' : 'in_progress';
  }
  if (idea.selectedAt) return 'selected';
  if ((idea.commentsCount || 0) > 0 || (idea.volunteers || []).length > 0) return 'discussing';
  return 'submitted';
}

// Every community starts empty: no sample members, ideas, communities, projects or
// opportunities — only real data created by real users is ever shown.
// The creator starts unclaimed, so the first creator account completes the profile first.
export function emptyShared() {
  return {
    creator: { ...DEFAULT_CREATOR, name: '', firstName: '', handle: '', niche: '', platforms: [], claimed: false },
    ideas: [],
    members: [],
    opportunities: [],
    projects: [],
    communities: [],
    activity: [],
    announcements: [],
    invites: [],
    topicBoost: {},
    newActivity: 0,
  };
}

export const initialState = () => ({
  mode: 'live', // always real accounts + shared server data (there is no demo sandbox)
  user: null, // { id, email, name, role, memberId }
  view: 'landing', // landing | auth | onboarding | creator-setup | creator | member
  creatorPage: 'dashboard',
  memberPage: 'home',
  meId: null,
  supported: {},
  saved: {},
  toast: null,
  ...emptyShared(),
});

const DAY = 86_400_000;
const ageDays = (ts, now) => (ts ? Math.max(0, Math.floor((now - ts) / DAY)) : undefined);

// "Days ago" fields are derived from the stored timestamps, so they are always current.
export function withAges(shared, now = Date.now()) {
  const age = (ts, fallback) => ageDays(ts, now) ?? fallback ?? 0;
  return {
    ...shared,
    ideas: (shared.ideas || []).map((i) => ({ ...i, daysAgo: age(i.createdAt, i.daysAgo), comments: (i.comments || []).map((c) => ({ ...c, daysAgo: age(c.at, c.daysAgo) })) })),
    members: (shared.members || []).map((m) => ({ ...m, joinedDaysAgo: age(m.joinedAt, m.joinedDaysAgo) })),
    projects: (shared.projects || []).map((p) => ({ ...p, createdDaysAgo: age(p.createdAt, p.createdDaysAgo), updates: (p.updates || []).map((u) => ({ ...u, daysAgo: age(u.at, u.daysAgo) })) })),
  };
}

let uid = 0;
export const nextId = (p) => `${p}_${Date.now().toString(36)}${(uid++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
const idOf = (a, p) => a.id || nextId(p);
const toast = (text) => ({ id: Date.now(), text });

function mapIdea(state, id, fn) {
  return { ...state, ideas: state.ideas.map((i) => (i.id === id ? fn(i) : i)) };
}
function mapProject(state, id, fn) {
  return { ...state, projects: state.projects.map((p) => (p.id === id ? fn(p) : p)) };
}
function bumpStat(members, ids, key) {
  const set = new Set(ids);
  return members.map((m) => (set.has(m.id) ? { ...m, stats: { ...m.stats, [key]: (m.stats[key] || 0) + 1 } } : m));
}
const TOPIC_MAP = { 'AI Agents': 'AI Agents', Automation: 'Automation', Monetization: 'Creator Monetization', Live: 'Live Building', Finance: 'Personal Finance', Fitness: 'Fitness', Design: 'Design Systems' };

export function reducer(state, a) {
  switch (a.type) {
    case 'HYDRATE': return { ...state, ...(a.state || {}), toast: null, ready: true };
    case 'SYNC': return { ...state, ...a.shared, ...(a.supported ? { supported: a.supported } : {}) };
    case 'RESET': return { ...state, ...emptyShared(), ...(a.keepMembers ? { members: a.keepMembers } : {}), view: state.view, supported: {}, toast: toast('Community content cleared — member accounts kept') };
    case 'NAV': return { ...state, ...a.patch };
    case 'TOAST': return { ...state, toast: a.toast ? { id: Date.now(), ...a.toast } : null };
    case 'SET_USER': return { ...state, user: a.user, meId: a.user?.memberId || null };

    case 'SET_CREATOR':
      return { ...state, creator: { ...state.creator, ...a.creator, claimed: true, firstName: (a.creator.name || state.creator.name).split(' ')[0] }, toast: toast('Creator profile saved') };

    case 'ONBOARD': {
      const { name, interests, role, skills, goals } = a.profile;
      const id = a.memberId || 'me';
      const me = {
        id, name, role, interests, goals,
        skills: skills.length ? skills : (ROLE_SKILLS[role] || []).slice(0, 2),
        communities: a.communities ?? communitiesForProfile(interests, role, state.communities),
        // No invented reputation: feedback % and growth are unknown until there is real activity.
        joinedAt: Date.now(), joinedDaysAgo: 0, socialFollowers: 0, positive: null, growth: 0, lastActiveDaysAgo: 0,
        stats: { ideas: 0, helpful: 0, projects: 0, featured: 0 },
        bio: `${role} • interested in ${interests.slice(0, 2).join(' & ')}`,
        city: a.profile.city || '—', handle: '@' + name.toLowerCase().replace(/[^a-z]+/g, '.'), isReal: true,
      };
      const prev = state.members.find((m) => m.id === id);
      const members = [me, ...state.members.filter((m) => m.id !== id)];
      const communities = state.communities.map((c) => {
        const was = prev?.communities.includes(c.id), now = me.communities.includes(c.id);
        return was === now ? c : { ...c, members: c.members + (now ? 1 : -1) };
      });
      return { ...state, members, communities, meId: id, view: 'member', memberPage: 'home', newActivity: state.newActivity + 1, activity: [{ id: idOf(a, 'a'), text: `${name} joined as a ${role}`, at: Date.now(), memberId: id }, ...state.activity].slice(0, 100) };
    }

    case 'JOIN_COMMUNITY': {
      const me = state.members.find((m) => m.id === state.meId);
      if (!me) return state;
      const joined = me.communities.includes(a.communityId);
      return {
        ...state,
        members: state.members.map((m) => (m.id === me.id ? { ...m, communities: joined ? m.communities.filter((c) => c !== a.communityId) : [...m.communities, a.communityId] } : m)),
        communities: state.communities.map((c) => (c.id === a.communityId ? { ...c, members: c.members + (joined ? -1 : 1) } : c)),
      };
    }

    case 'CREATE_COMMUNITY':
      return { ...state, communities: [...state.communities, { id: idOf(a, 'c'), members: 0, growth: 0, ...a.community }], toast: toast(`Community “${a.community.name}” created`) };

    case 'SUPPORT': {
      const on = !state.supported[a.ideaId];
      return { ...mapIdea(state, a.ideaId, (i) => ({ ...i, supports: Math.max(0, i.supports + (on ? 1 : -1)) })), supported: { ...state.supported, [a.ideaId]: on }, newActivity: state.newActivity + 1 };
    }
    case 'SAVE': return { ...state, saved: { ...state.saved, [a.ideaId]: !state.saved[a.ideaId] } };

    case 'VOLUNTEER': {
      const me = state.members.find((m) => m.id === state.meId);
      if (!me) return state;
      const idea = state.ideas.find((i) => i.id === a.ideaId);
      const leaving = idea?.volunteers.some((v) => v.memberId === me.id);
      const s = mapIdea(state, a.ideaId, (i) => (leaving
        ? { ...i, volunteers: i.volunteers.filter((v) => v.memberId !== me.id) }
        : { ...i, volunteers: [{ memberId: me.id, role: me.role, note: a.note }, ...i.volunteers] }));
      return { ...s, toast: leaving ? null : toast('Thanks! The creator can now see you volunteered.'), newActivity: state.newActivity + 1, activity: leaving ? s.activity : [{ id: idOf(a, 'a'), text: `${me.name} (${me.role}) offered to help on “${idea?.title}”`, at: Date.now(), ideaId: a.ideaId }, ...s.activity].slice(0, 100) };
    }

    case 'COMMENT': {
      const author = a.asCreator ? 'creator' : state.meId;
      if (!author) return state;
      const s = mapIdea(state, a.ideaId, (i) => ({ ...i, commentsCount: i.commentsCount + 1, comments: [...i.comments, { id: idOf(a, 'cm'), memberId: author, text: a.text, daysAgo: 0, at: Date.now() }] }));
      const members = author !== 'creator' ? bumpStat(s.members, [author], 'helpful') : s.members;
      return { ...s, members, newActivity: state.newActivity + 1 };
    }

    case 'ADD_IDEA': {
      const idea = { supports: 1, commentsCount: 0, mentions: 0, daysAgo: 0, status: 'open', featured: false, volunteers: [], comments: [], createdAt: Date.now(), ...a.idea, id: idOf(a, 'idea') };
      const topicBoost = { ...state.topicBoost };
      idea.tags.forEach((t) => { if (TOPIC_MAP[t]) topicBoost[TOPIC_MAP[t]] = (topicBoost[TOPIC_MAP[t]] || 0) + 1; });
      return {
        ...state, ideas: [idea, ...state.ideas], members: bumpStat(state.members, [idea.authorId], 'ideas'), topicBoost,
        supported: { ...state.supported, [idea.id]: true }, newActivity: state.newActivity + 1,
        activity: [{ id: nextId('a'), text: `New idea: “${idea.title}”`, at: Date.now(), ideaId: idea.id }, ...state.activity].slice(0, 100),
      };
    }
    case 'SET_SUMMARY':
      return mapIdea(state, a.ideaId, (i) => ({ ...i, aiSummary: a.summary }));
    case 'MERGE_INTO': {
      const s = mapIdea(state, a.ideaId, (i) => ({ ...i, mentions: (i.mentions || 0) + 1, supports: i.supports + (state.supported[a.ideaId] ? 0 : 1) }));
      return { ...s, supported: { ...state.supported, [a.ideaId]: true }, newActivity: state.newActivity + 1, toast: toast('Merged — your voice was added to the existing idea.') };
    }

    case 'FEATURE': {
      const s = mapIdea(state, a.ideaId, (i) => ({ ...i, featured: !i.featured }));
      const idea = s.ideas.find((i) => i.id === a.ideaId);
      if (!idea) return state;
      return { ...s, members: idea.featured ? bumpStat(s.members, [idea.authorId], 'featured') : s.members, toast: toast(idea.featured ? '⭐ Featured — members will see it on their home.' : 'Removed from featured') };
    }

    case 'SELECT_IDEA': {
      const s = mapIdea(state, a.ideaId, (i) => ({ ...i, selectedAt: a.selected ? (i.selectedAt || Date.now()) : null }));
      const idea = s.ideas.find((i) => i.id === a.ideaId);
      if (!idea) return state;
      return {
        ...s,
        activity: a.selected ? [{ id: idOf(a, 'a'), text: `“${idea.title}” was selected for a pilot`, at: Date.now(), ideaId: idea.id }, ...s.activity].slice(0, 100) : s.activity,
        toast: toast(a.selected ? '✅ Selected for a pilot — next: create the workspace' : 'Selection removed'),
      };
    }
    case 'ARCHIVE_IDEA':
      return { ...mapIdea(state, a.ideaId, (i) => (i.status === 'project' ? i : { ...i, status: a.archived ? 'archived' : 'open', featured: a.archived ? false : i.featured })), toast: toast(a.archived ? 'Idea archived' : 'Idea restored') };

    case 'ANNOUNCE':
      return { ...state, announcements: [{ id: idOf(a, 'an'), ideaId: a.ideaId, text: a.text, at: Date.now() }, ...state.announcements].slice(0, 50), toast: toast('📣 Announcement posted to your community') };

    case 'CREATE_PROJECT': {
      const id = idOf(a, 'p');
      const project = {
        id, name: a.name, ideaId: a.ideaId, description: a.description, createdDaysAgo: 0, status: 'Active', createdAt: Date.now(),
        contributors: a.contributors, ownerId: a.ownerId || a.contributors[0]?.memberId || null,
        tasks: a.tasks.map((t, k) => ({ id: `t${k}`, title: t, done: false, assignee: a.contributors[k % Math.max(1, a.contributors.length)]?.memberId })),
        updates: [{ id: 'u0', memberId: 'creator', text: 'Project created from a community idea. Welcome, team! 🚀', daysAgo: 0, at: Date.now() }],
      };
      const s = mapIdea(state, a.ideaId, (i) => ({ ...i, status: 'project', projectId: id, featured: true, selectedAt: i.selectedAt || Date.now() }));
      return { ...s, members: bumpStat(s.members, a.contributors.map((c) => c.memberId), 'projects'), projects: [project, ...state.projects], creatorPage: 'projects', openProjectId: id, toast: toast(`🚀 Project created — ${a.contributors.length} contributors added`) };
    }
    case 'PROJECT_STATUS': {
      const s = mapProject(state, a.projectId, (p) => ({ ...p, status: a.status, completedAt: a.status === 'Completed' ? Date.now() : null }));
      const p = s.projects.find((x) => x.id === a.projectId);
      if (!p) return state;
      return {
        ...s,
        activity: a.status === 'Completed' ? [{ id: idOf(a, 'a'), text: `Project “${p.name}” was completed 🎉`, at: Date.now(), ideaId: p.ideaId }, ...s.activity].slice(0, 100) : s.activity,
        toast: toast(a.status === 'Completed' ? '🎉 Project marked complete' : 'Project reopened'),
      };
    }
    case 'SET_OWNER':
      return { ...mapProject(state, a.projectId, (p) => ({ ...p, ownerId: a.memberId })), toast: toast('Project owner updated') };
    case 'TOGGLE_TASK':
      return mapProject(state, a.projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === a.taskId ? { ...t, done: !t.done } : t)) }));
    case 'ADD_TASK':
      return mapProject(state, a.projectId, (p) => ({ ...p, tasks: [...p.tasks, { id: idOf(a, 't'), title: a.title, done: false, assignee: a.assignee || null }] }));
    case 'ADD_UPDATE':
      return mapProject(state, a.projectId, (p) => ({ ...p, updates: [{ id: idOf(a, 'u'), memberId: a.memberId, text: a.text, daysAgo: 0, at: Date.now() }, ...p.updates] }));
    case 'JOIN_PROJECT': {
      const me = state.members.find((m) => m.id === state.meId);
      if (!me) return state;
      return { ...mapProject(state, a.projectId, (p) => (p.contributors.some((c) => c.memberId === me.id) ? p : { ...p, contributors: [...p.contributors, { memberId: me.id, role: me.role }] })), toast: toast('You joined the project team 🎉') };
    }
    case 'ADD_CONTRIBUTOR': {
      const m = state.members.find((x) => x.id === a.memberId);
      if (!m) return state;
      return { ...mapProject(state, a.projectId, (p) => (p.contributors.some((c) => c.memberId === m.id) ? p : { ...p, contributors: [...p.contributors, { memberId: m.id, role: m.role }] })), members: bumpStat(state.members, [m.id], 'projects'), toast: toast(`${m.name.split(' ')[0]} added to the team`) };
    }

    case 'INVITE': {
      const m = state.members.find((x) => x.id === a.memberId);
      if (!m) return state;
      const inv = { id: idOf(a, 'inv'), memberId: a.memberId, projectId: a.projectId || null, message: a.message || '', status: 'pending', at: Date.now() };
      return { ...state, invites: [inv, ...state.invites.filter((i) => !(i.memberId === inv.memberId && i.projectId === inv.projectId && i.status === 'pending'))], toast: toast(`Invitation sent to ${m.name.split(' ')[0]} ✉️`) };
    }
    case 'RESPOND_INVITE': {
      const inv = state.invites.find((i) => i.id === a.inviteId);
      if (!inv || inv.memberId !== state.meId) return state;
      let s = { ...state, invites: state.invites.map((i) => (i.id === inv.id ? { ...i, status: a.accept ? 'accepted' : 'declined' } : i)) };
      if (a.accept && inv.projectId) s = reducer(s, { type: 'JOIN_PROJECT', projectId: inv.projectId });
      return { ...s, toast: toast(a.accept ? 'Invitation accepted 🎉' : 'Invitation declined') };
    }

    case 'OPP_STATUS':
      return { ...state, opportunities: state.opportunities.map((o) => (o.id === a.oppId ? { ...o, status: a.status } : o)), toast: a.toastText ? toast(a.toastText) : state.toast };

    default: return state;
  }
}

export function pickShared(state) {
  const out = {};
  SHARED_KEYS.forEach((k) => (out[k] = state[k]));
  return out;
}
