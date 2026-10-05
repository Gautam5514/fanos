'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { analyze } from './ai';
import { applyCreator } from './seed';
import { emptyShared, initialState, nextId, reducer, SHARED_ACTIONS, withAges } from './reducer';
import { parsePath } from './routes';

const UI_KEY = 'fanos_ui_v3'; // per-browser UI preferences (tabs, filters, saved ideas)
// Which page is open is NOT stored here: the URL is the source of truth (see AppRoot).
const LOCAL_KEYS = ['saved', 'ideasTab', 'ideasCommunity', 'oppCategory', 'memberIdeasTab', 'memberIdeasCommunity', 'communityTab'];
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
  const [state, rawDispatch] = useReducer(reducer, undefined, initialState);
  const ref = useRef(state);
  useEffect(() => { ref.current = state; }, [state]);
  const hydrated = useRef(false);
  const version = useRef(0);

  const syncFrom = useCallback((snap) => {
    if (!snap || snap.unchanged) return;
    version.current = snap.version || version.current;
    rawDispatch({ type: 'SYNC', shared: withAges(snap.shared), supported: snap.supported });
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

  // Load the signed-in user's real community. If the URL already points at a page in
  // their app (e.g. /ideas), stay there; otherwise land on the role's home page.
  const enterLive = useCallback(async (user, { fromAuth = false } = {}) => {
    rawDispatch({ type: 'NAV', patch: { ...emptyShared(), supported: {}, modal: null } });
    rawDispatch({ type: 'SET_USER', user });
    version.current = 0;
    const snap = await pull(true);
    const target = landingViewFor(user, snap?.shared);
    // Opened at an app URL (refresh, bookmark, shared link)? Keep that page if it belongs to this user's app.
    const fromUrl = fromAuth ? null : parsePath(window.location.pathname, user.role);
    // A finished creator may also open /setup directly to edit their profile.
    const allowed = target === 'creator' ? ['creator', 'creator-setup'] : target === 'member' ? ['member'] : [];
    const keep = fromUrl && allowed.includes(fromUrl.view);
    rawDispatch({ type: 'NAV', patch: keep ? { ...fromUrl, authChecked: true } : { view: target, creatorPage: 'dashboard', memberPage: 'home', authChecked: true } });
  }, [pull]);

  // Boot: restore UI preferences, then check for a session.
  useEffect(() => {
    let ui = null;
    try { ui = JSON.parse(localStorage.getItem(UI_KEY) || 'null'); } catch { /* corrupt */ }
    rawDispatch({ type: 'HYDRATE', state: { ...(ui || {}) } });
    hydrated.current = true;
    api('/api/ai').then((d) => rawDispatch({ type: 'NAV', patch: { aiEnabled: !!d?.enabled } })).catch(() => {});
    api('/api/auth/me').then((d) => {
      rawDispatch({ type: 'NAV', patch: { serverError: d?.configured === false ? 'Accounts are not configured on this server yet (Supabase keys missing).' : null } });
      if (d?.user) enterLive(d.user);
      else rawDispatch({ type: 'NAV', patch: { authChecked: true } });
    }).catch((e) => rawDispatch({ type: 'NAV', patch: { authChecked: true, serverError: e.status === 503 ? e.message : 'Cannot reach the FanOS server.' } }));
  }, [enterLive]);

  // Persist UI preferences.
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(UI_KEY, JSON.stringify(pick(state, LOCAL_KEYS))); } catch { /* quota */ }
  }, [state]);

  // Poll for changes made by other people (new members, ideas, votes…).
  useEffect(() => {
    if (!state.user) return;
    const i = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, POLL_MS);
    return () => clearInterval(i);
  }, [state.user, pull]);

  const dispatch = useCallback((a) => {
    const s = ref.current;
    if (!s.user || !SHARED_ACTIONS.has(a.type)) { rawDispatch(a); return; }
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
      await enterLive(d.user, { fromAuth: true });
      return d.user;
    },
    async login(body) { const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }); await enterLive(d.user, { fromAuth: true }); return d.user; },
    async logout() {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      rawDispatch({ type: 'SET_USER', user: null });
      rawDispatch({ type: 'NAV', patch: { ...emptyShared(), supported: {}, view: 'landing', modal: null } });
    },
  }), [enterLive]);

  // Keep every component's view of the creator profile in sync (see seed.applyCreator).
  applyCreator(state.creator);

  const intel = useMemo(
    () => analyze({ ideas: state.ideas, members: state.members, opportunities: state.opportunities }),
    [state.ideas, state.members, state.opportunities],
  );

  const value = useMemo(() => ({ state, dispatch, intel, auth, refresh: () => pull(true) }), [state, dispatch, intel, auth, pull]);
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
