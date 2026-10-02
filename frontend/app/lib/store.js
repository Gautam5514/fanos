'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { analyze } from './ai';
import { applyCreator } from './seed';
import { initialShared, initialState, nextId, SHARED_ACTIONS, SHARED_KEYS, trackedReducer } from './reducer';

export { TEST_TASKS } from './reducer';

const DEMO_KEY = 'fanos_demo_v2'; // full sandbox state (demo mode)
const UI_KEY = 'fanos_ui_v2'; // per-browser UI state (both modes)
const LOCAL_KEYS = ['view', 'creatorPage', 'memberPage', 'saved', 'feedback', 'validation', 'ideasTab', 'ideasCommunity', 'oppCategory', 'openProjectId', 'memberIdeasTab', 'memberIdeasCommunity', 'memberProjectId', 'communityId', 'communityTab'];
const ID_PREFIX = { ADD_IDEA: 'idea', CREATE_PROJECT: 'p', COMMENT: 'cm', CREATE_COMMUNITY: 'c', ANNOUNCE: 'an', ADD_TASK: 't', ADD_UPDATE: 'u', INVITE: 'inv' };
const POLL_MS = 5000;

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  let data = null;
  try { data = await r.json(); } catch { /* empty */ }
  if (!r.ok) { const e = new Error(data?.error || `Request failed (${r.status})`); e.status = r.status; throw e; }
  return data;
}

// Decide where a signed-in user should land.
function landingViewFor(user, shared) {
  if (user.role === 'creator') return shared?.creator?.claimed ? 'creator' : 'creator-setup';
  return user.memberId ? 'member' : 'onboarding';
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, rawDispatch] = useReducer(trackedReducer, undefined, initialState);
  const ref = useRef(state);
  useEffect(() => { ref.current = state; }, [state]);
  const hydrated = useRef(false);
  const version = useRef(0);

  const syncFrom = useCallback((snap) => {
    if (!snap || snap.unchanged) return;
    version.current = snap.version || version.current;
    rawDispatch({ type: 'SYNC', shared: snap.shared, supported: snap.supported });
  }, []);

  const pull = useCallback(async (force = false) => {
    try {
      const snap = await api(`/api/state${force ? '' : `?v=${version.current}`}`);
      syncFrom(snap);
      return snap;
    } catch (e) {
      if (e.status === 401) rawDispatch({ type: 'SET_USER', user: null });
      return null;
    }
  }, [syncFrom]);

  // Enter live mode for a signed-in user.
  const enterLive = useCallback(async (user, preferView) => {
    rawDispatch({ type: 'NAV', patch: { mode: 'live', ...initialShared(), supported: {}, modal: null } });
    rawDispatch({ type: 'SET_USER', user });
    version.current = 0;
    const snap = await pull(true);
    const view = preferView || landingViewFor(user, snap?.shared);
    rawDispatch({ type: 'NAV', patch: { view, ...(view === 'creator' ? { creatorPage: 'dashboard' } : {}) } });
  }, [pull]);

  // Boot: restore UI + demo sandbox from localStorage, then check for a live session.
  useEffect(() => {
    let ui = null, demo = null;
    try { ui = JSON.parse(localStorage.getItem(UI_KEY) || 'null'); demo = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch { /* corrupt */ }
    rawDispatch({ type: 'HYDRATE', state: { ...(demo || {}), ...(ui || {}), mode: 'demo' } });
    hydrated.current = true;
    api('/api/ai').then((d) => rawDispatch({ type: 'NAV', patch: { aiEnabled: !!d?.enabled } })).catch(() => {});
    api('/api/auth/me').then((d) => {
      rawDispatch({ type: 'NAV', patch: { serverError: d?.configured === false ? 'Accounts are not configured on this server yet (Supabase keys missing).' : null } });
      if (d?.user) enterLive(d.user);
      else if (ui?.mode === 'live') rawDispatch({ type: 'NAV', patch: { view: 'landing' } });
    }).catch((e) => rawDispatch({ type: 'NAV', patch: { serverError: e.status === 503 ? e.message : null } }));
  }, [enterLive]);

  // Persist: UI state always; full sandbox only in demo mode.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ ...pick(state, LOCAL_KEYS), mode: state.mode }));
      if (state.mode === 'demo') localStorage.setItem(DEMO_KEY, JSON.stringify({ ...pick(state, SHARED_KEYS), meId: state.meId, supported: state.supported }));
    } catch { /* quota */ }
  }, [state]);

  // Live mode: poll for changes made by other people (new members, ideas, votes…).
  useEffect(() => {
    if (state.mode !== 'live' || !state.user) return;
    const i = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, POLL_MS);
    return () => clearInterval(i);
  }, [state.mode, state.user, pull]);

  const dispatch = useCallback((a) => {
    const s = ref.current;
    if (s.mode !== 'live' || !SHARED_ACTIONS.has(a.type)) { rawDispatch(a); return; }
    const action = ID_PREFIX[a.type] && !a.id ? { ...a, id: nextId(ID_PREFIX[a.type]) } : a;
    rawDispatch(action); // optimistic
    api('/api/actions', { method: 'POST', body: JSON.stringify(action) })
      .then((res) => {
        syncFrom(res);
        if (action.type === 'ONBOARD' && res.memberId) rawDispatch({ type: 'SET_USER', user: { ...ref.current.user, memberId: res.memberId } });
      })
      .catch((e) => {
        rawDispatch({ type: 'TOAST', toast: { text: `⚠️ ${e.message}` } });
        pull(true); // roll back to the server's truth
      });
  }, [pull, syncFrom]);

  const auth = useMemo(() => ({
    async signup(body) {
      const d = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
      if (!d?.user) throw Object.assign(new Error(d?.error || 'Account created — please log in'), { status: 200 });
      await enterLive(d.user);
      return d.user;
    },
    async login(body) { const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }); await enterLive(d.user); return d.user; },
    async logout() {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      let demo = null;
      try { demo = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch { /* ignore */ }
      rawDispatch({ type: 'SET_USER', user: null });
      rawDispatch({ type: 'NAV', patch: { mode: 'demo', ...initialShared(), ...(demo || {}), view: 'landing', modal: null } });
    },
  }), [enterLive]);

  // Demo mode = browser-only sandbox with seeded data (no account needed).
  const startDemo = useCallback((patch = {}) => {
    const s = ref.current;
    if (s.mode === 'live') {
      let demo = null;
      try { demo = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch { /* ignore */ }
      rawDispatch({ type: 'NAV', patch: { mode: 'demo', ...initialShared(), meId: null, supported: {}, ...(demo || {}) } });
    }
    rawDispatch({ type: 'NAV', patch: { view: 'creator', creatorPage: 'dashboard', ...patch } });
  }, []);

  // Keep every component's view of the creator profile in sync (see seed.applyCreator).
  applyCreator(state.creator);

  const intel = useMemo(
    () => analyze({ ideas: state.ideas, members: state.members, opportunities: state.opportunities }),
    [state.ideas, state.members, state.opportunities],
  );

  const value = useMemo(() => ({ state, dispatch, intel, auth, startDemo, refresh: () => pull(true) }), [state, dispatch, intel, auth, startDemo, pull]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

export function useMember(id) {
  const { state } = useStore();
  return state.members.find((m) => m.id === id);
}
