'use client';

// The whole single-page app, rendered by the catch-all route app/[[...slug]]/page.js.
// The URL is the source of truth for which screen is open (see lib/routes.js):
//   URL → state on load and on Back/Forward, state → URL whenever the screen changes.
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { StoreProvider, useStore } from '../lib/store';
import { APP_VIEWS, parsePath, pathFor, titleFor } from '../lib/routes';
import Landing from './Landing';
import CreatorApp from './creator/CreatorApp';
import MemberApp from './member/MemberApp';
import Onboarding from './member/Onboarding';
import { ModalRoot } from './modals';
import { Logo, Toast } from './ui';
import { AuthScreen, CreatorSetup } from './Auth';
import PublicIdea from './PublicIdea';

function Loading() {
  return <div className="flex min-h-screen items-center justify-center"><span className="animate-pulse"><Logo size={36} /></span></div>;
}

function App() {
  const { state, dispatch } = useStore();
  // Tab title follows the URL (React 19 hoists <title> into <head>).
  const title = titleFor(usePathname().split('/').filter(Boolean));
  const role = state.user?.role;
  const written = useRef(null); // last screen path written to the address bar
  const parsedFor = useRef(null); // role the URL was last read for (null = not read yet)

  // URL → state: on first load, and again when a user signs in (shared pages like
  // /ideas open in the creator or member app, so the role matters).
  useEffect(() => {
    if (!state.ready) return;
    const key = role || 'guest';
    if (parsedFor.current === key) return;
    const first = parsedFor.current === null;
    parsedFor.current = key;
    if (!first && !role) return; // logged out: logout() already routes to the landing page
    if (first && new URLSearchParams(window.location.search).get('join') === '1') {
      // Followers arrive via the creator's join link (/?join=1).
      dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'signup', authRole: 'member', routed: true } });
      return;
    }
    const patch = parsePath(window.location.pathname, role);
    if (!first && patch?.view === 'auth') return; // just signed in from /auth/…; login routes to the home page
    // `routed` tells the URL writer below that the address bar has been read into state.
    dispatch({ type: 'NAV', patch: { ...(patch || { view: 'landing' }), routed: true } });
  }, [state.ready, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back / Forward.
  useEffect(() => {
    const onPop = () => {
      written.current = window.location.pathname; // the URL is already right; just follow it
      dispatch({ type: 'NAV', patch: parsePath(window.location.pathname, role) || { view: 'landing' } });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [dispatch, role]);

  // Resolve the screen to show, guarding by sign-in state and role.
  let view = state.view;
  if (state.user && !state.authChecked && APP_VIEWS.includes(view)) {
    // Signed in, but the community data is still loading: don't redirect on half-loaded state
    // (e.g. a creator profile that only *looks* unfinished until the data arrives).
    view = 'loading';
  } else if (state.user) {
    if (role === 'member') {
      if (view === 'creator' || view === 'creator-setup') view = state.meId ? 'member' : 'onboarding';
      if (view === 'member' && !state.meId) view = 'onboarding';
    }
    if (role === 'creator') {
      if (view === 'member' || view === 'onboarding') view = 'creator';
      if (view === 'creator' && !state.creator?.claimed) view = 'creator-setup';
    }
  } else if (APP_VIEWS.includes(view)) {
    view = state.authChecked ? 'auth' : 'loading';
  }

  // State → URL, only when the screen itself changes (not when the URL changed first,
  // e.g. Back/Forward — the popstate handler updates the screen in that case).
  // The first write replaces the history entry; later ones push.
  // Wait until the URL has been read once, or the default screen would overwrite it.
  useEffect(() => {
    if (!state.ready || !state.routed || view === 'loading') return;
    const want = pathFor(state, view);
    if (want === written.current) return;
    const first = written.current === null;
    written.current = want;
    if (want !== window.location.pathname) window.history[first ? 'replaceState' : 'pushState'](null, '', want);
  });

  if (!state.ready || view === 'loading') return <><title>{title}</title><Loading /></>;
  return (
    <>
      <title>{title}</title>
      {view === 'landing' && <Landing />}
      {view === 'onboarding' && <Onboarding />}
      {view === 'creator' && <CreatorApp />}
      {view === 'member' && <MemberApp />}
      {view === 'auth' && <AuthScreen />}
      {view === 'creator-setup' && <CreatorSetup />}
      {view === 'public-idea' && <PublicIdea key={state.publicIdeaId} id={state.publicIdeaId} />}
      {(view === 'creator' || view === 'member') && <ModalRoot />}
      <Toast toast={state.toast} onDone={() => dispatch({ type: 'TOAST', toast: null })} />
    </>
  );
}

export default function AppRoot() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
