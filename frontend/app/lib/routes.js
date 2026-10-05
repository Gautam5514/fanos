// URL ↔ app-state mapping. Every screen has its own URL:
//
//   /                         landing
//   /auth/login, /auth/signup log in / create account
//   /setup                    creator profile setup
//   /onboarding               member onboarding
//   /dashboard /brief /opportunities             creator only
//   /home /profile                               member only
//   /ideas /people /communities /projects        both roles (rendered for the user's role)
//   /communities/:id  /projects/:id              one community / project
//   /i/:id                    public page of a featured idea (no sign-in needed)
//
// parsePath() turns a URL into a NAV patch; pathFor() turns state back into a URL.

const CREATOR_ONLY = ['dashboard', 'brief', 'opportunities'];
const MEMBER_ONLY = ['home', 'profile'];
const SHARED = ['ideas', 'people', 'communities', 'projects'];

export const APP_VIEWS = ['creator', 'member', 'onboarding', 'creator-setup'];

// `role` is the signed-in user's role, if known; shared pages open in that role's app.
export function parsePath(pathname, role) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [first, second] = parts;
  if (!first) return { view: 'landing' };
  if (first === 'auth') return { view: 'auth', authTab: second === 'signup' ? 'signup' : 'login' };
  if (first === 'setup') return { view: 'creator-setup' };
  if (first === 'onboarding') return { view: 'onboarding' };
  if (first === 'i' && second) return { view: 'public-idea', publicIdeaId: second };
  if (CREATOR_ONLY.includes(first)) return { view: 'creator', creatorPage: first };
  if (MEMBER_ONLY.includes(first)) return { view: 'member', memberPage: first };
  if (SHARED.includes(first)) {
    const patch = { view: role === 'member' ? 'member' : 'creator', creatorPage: first, memberPage: first };
    if (first === 'communities') patch.communityId = second || null;
    if (first === 'projects') { patch.openProjectId = second || null; patch.memberProjectId = second || null; }
    return patch;
  }
  return null; // unknown URL
}

export function pathFor(state, view) {
  switch (view) {
    case 'landing': return '/';
    case 'auth': return `/auth/${state.authTab === 'signup' ? 'signup' : 'login'}`;
    case 'creator-setup': return '/setup';
    case 'onboarding': return '/onboarding';
    case 'public-idea': return `/i/${encodeURIComponent(state.publicIdeaId || '')}`;
    case 'creator': {
      const page = state.creatorPage || 'dashboard';
      if (page === 'communities' && state.communityId) return `/communities/${encodeURIComponent(state.communityId)}`;
      if (page === 'projects' && state.openProjectId) return `/projects/${encodeURIComponent(state.openProjectId)}`;
      return `/${page}`;
    }
    case 'member': {
      const page = state.memberPage || 'home';
      if (page === 'communities' && state.communityId) return `/communities/${encodeURIComponent(state.communityId)}`;
      if (page === 'projects' && state.memberProjectId) return `/projects/${encodeURIComponent(state.memberProjectId)}`;
      return `/${page}`;
    }
    default: return '/';
  }
}

const TITLES = {
  '': 'FanOS — The Operating System for Your Audience',
  auth: 'Log in', setup: 'Set up your community', onboarding: 'Join the community',
  dashboard: 'Dashboard', brief: 'Community Brief', opportunities: 'Opportunities', home: 'Home', profile: 'Your profile',
  ideas: 'Ideas', people: 'People', communities: 'Communities', projects: 'Projects',
};

export function titleFor(slug = []) {
  const [first, second] = slug;
  if (!first) return TITLES[''];
  if (first === 'auth') return `${second === 'signup' ? 'Create your account' : 'Log in'} · FanOS`;
  if (first === 'i') return 'Featured idea · FanOS';
  return TITLES[first] ? `${TITLES[first]} · FanOS` : 'FanOS';
}
