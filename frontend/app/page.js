'use client';

import { StoreProvider, useStore } from './lib/store';
import Landing from './components/Landing';
import CreatorApp from './components/creator/CreatorApp';
import MemberApp from './components/member/MemberApp';
import Onboarding from './components/member/Onboarding';
import { ModalRoot } from './components/modals';
import { Logo, Toast } from './components/ui';
import { TestStart, FeedbackForm, ValidationResults } from './components/validation';
import { AuthScreen, CreatorSetup } from './components/Auth';
import { useEffect } from 'react';

function App() {
  const { state, dispatch } = useStore();
  // A creator opening the shared link (/?test=1) lands straight on the test session.
  useEffect(() => {
    if (!state.ready) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === '1') {
      if (!state.validation?.active) dispatch({ type: 'NAV', patch: { view: 'test-start' } });
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Followers arrive via the creator's join link (/?join=1).
    if (params.get('join') === '1') {
      dispatch({ type: 'NAV', patch: { view: 'auth', authTab: 'signup', authRole: 'member' } });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [state.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state.ready) {
    return <div className="flex min-h-screen items-center justify-center"><span className="animate-pulse"><Logo size={36} /></span></div>;
  }
  let view = state.view === 'member' && !state.meId ? 'onboarding' : state.view;
  // Guard live-mode views by role.
  if (state.mode === 'live' && state.user) {
    if (state.user.role === 'member' && (view === 'creator' || view === 'creator-setup')) view = state.meId ? 'member' : 'onboarding';
    if (state.user.role === 'creator' && (view === 'member' || view === 'onboarding')) view = 'creator';
  }
  if (state.mode === 'live' && !state.user && ['creator', 'member', 'onboarding', 'creator-setup'].includes(view)) view = 'auth';
  return (
    <>
      {view === 'landing' && <Landing />}
      {view === 'onboarding' && <Onboarding />}
      {view === 'creator' && <CreatorApp />}
      {view === 'member' && <MemberApp />}
      {view === 'auth' && <AuthScreen />}
      {view === 'creator-setup' && <CreatorSetup />}
      {view === 'test-start' && <TestStart />}
      {view === 'test-feedback' && <FeedbackForm />}
      {view === 'validation' && <ValidationResults />}
      {(view === 'creator' || view === 'member') && <ModalRoot />}
      <Toast toast={state.toast} onDone={() => dispatch({ type: 'TOAST', toast: null })} />
    </>
  );
}

export default function Page() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
