// Persistence for live mode — Supabase Postgres (table public.app_state, single row id=1).
// Stateless and safe across multiple server instances: every write is
//   UPDATE app_state SET … WHERE id = 1 AND version = <version we read>
// and the caller retries on conflict (see withRetry).
import { emptyShared, SHARED_KEYS } from '../reducer';
import { adminDb, checkDbError } from './supabase';

export async function loadVersion() {
  const { data, error } = await adminDb().from('app_state').select('version').eq('id', 1).maybeSingle();
  checkDbError(error);
  return data?.version || 0;
}

export async function loadState() {
  const db = adminDb();
  let { data, error } = await db.from('app_state').select('version, data, member_supports').eq('id', 1).maybeSingle();
  checkDbError(error);
  if (!data) {
    // First run: start the community EMPTY — only real data created by real users appears
    // (ignored if another request seeded it first).
    const seed = emptyShared();
    const ins = await db.from('app_state').upsert({ id: 1, version: 1, data: seed, member_supports: {} }, { onConflict: 'id', ignoreDuplicates: true });
    checkDbError(ins.error);
    ({ data, error } = await db.from('app_state').select('version, data, member_supports').eq('id', 1).single());
    checkDbError(error);
  }
  return { ...emptyShared(), ...data.data, version: data.version, memberSupports: data.member_supports || {} };
}

// Returns true if saved, false if someone else wrote first (caller should retry).
export async function saveState(st, expectedVersion) {
  const data = {};
  SHARED_KEYS.forEach((k) => (data[k] = st[k]));
  const { data: rows, error } = await adminDb().from('app_state')
    .update({ data, member_supports: st.memberSupports || {}, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq('id', 1).eq('version', expectedVersion).select('version');
  checkDbError(error);
  if (rows?.length === 1) { st.version = expectedVersion + 1; return true; }
  return false;
}

// Optimistic-concurrency loop: fn(state) mutates/returns a result; retried on write conflicts.
export async function withRetry(fn, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const st = await loadState();
    const before = st.version;
    const result = await fn(st);
    if (await saveState(st, before)) return { st, result };
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
  }
  throw new Error('The community is very busy — please try again.');
}
