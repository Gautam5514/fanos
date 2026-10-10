// Persistence for live mode — Supabase Postgres (table public.app_state).
// Multi-tenant: ONE row per creator community, keyed by creator_id. Every write is
//   UPDATE app_state SET … WHERE creator_id = <id> AND version = <version we read>
// and the caller retries on conflict (see withRetry). Stateless and safe across instances.
import { emptyShared, SHARED_KEYS } from '../shared/reducer.js';
import { adminDb, checkDbError } from './supabase.js';

export async function loadVersion(communityId) {
  const { data, error } = await adminDb().from('app_state').select('version').eq('creator_id', communityId).maybeSingle();
  checkDbError(error);
  return data?.version || 0;
}

// Load (or lazily create) the empty community document for one creator.
export async function loadState(communityId) {
  const db = adminDb();
  let { data, error } = await db.from('app_state').select('version, data, member_supports').eq('creator_id', communityId).maybeSingle();
  checkDbError(error);
  if (!data) {
    // First access: start this creator's community EMPTY — only real data created by real
    // users appears (ignored if another request seeded it first).
    const seed = emptyShared();
    const ins = await db.from('app_state').upsert({ creator_id: communityId, version: 1, data: seed, member_supports: {} }, { onConflict: 'creator_id', ignoreDuplicates: true });
    checkDbError(ins.error);
    ({ data, error } = await db.from('app_state').select('version, data, member_supports').eq('creator_id', communityId).single());
    checkDbError(error);
  }
  return { ...emptyShared(), ...data.data, version: data.version, memberSupports: data.member_supports || {}, communityId };
}

// Returns true if saved, false if someone else wrote first (caller should retry).
export async function saveState(st, expectedVersion) {
  const data = {};
  SHARED_KEYS.forEach((k) => (data[k] = st[k]));
  const { data: rows, error } = await adminDb().from('app_state')
    .update({ data, member_supports: st.memberSupports || {}, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq('creator_id', st.communityId).eq('version', expectedVersion).select('version');
  checkDbError(error);
  if (rows?.length === 1) { st.version = expectedVersion + 1; return true; }
  return false;
}

// Optimistic-concurrency loop: fn(state) mutates/returns a result; retried on write conflicts.
export async function withRetry(communityId, fn, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const st = await loadState(communityId);
    const before = st.version;
    const result = await fn(st);
    if (await saveState(st, before)) return { st, result };
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
  }
  throw new Error('The community is very busy — please try again.');
}
