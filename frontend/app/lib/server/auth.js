// Accounts & sessions via Supabase Auth (sessions live in Supabase-managed httpOnly cookies).
// Roles and the member link are stored in public.profiles.
import crypto from 'crypto';
import { adminDb, authClient, checkDbError } from './supabase';

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export function appUrl(request) {
  return (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
}

export function publicUser(u) {
  return u ? { id: u.id, email: u.email, name: u.name, role: u.role, memberId: u.memberId || null, provider: u.provider } : null;
}

export async function getProfile(id) {
  const { data, error } = await adminDb().from('profiles').select('*').eq('id', id).maybeSingle();
  checkDbError(error);
  return data;
}

export async function createProfile({ id, email, name, role, provider }) {
  const { data, error } = await adminDb().from('profiles').insert({ id, email, name, role, provider }).select('*').single();
  checkDbError(error);
  return data;
}

export async function setMemberId(userId, memberId) {
  const { error } = await adminDb().from('profiles').update({ member_id: memberId }).eq('id', userId);
  checkDbError(error);
}

const fromProfile = (p) => ({ id: p.id, email: p.email, name: p.name, role: p.role, memberId: p.member_id, provider: p.provider });

// Current signed-in user (with role) or null. `request` kept for call-site compatibility.
export async function getUser() {
  const sb = await authClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  const p = await getProfile(data.user.id);
  return p ? fromProfile(p) : null;
}

// The first creator account claims the community. More creator accounts need CREATOR_ACCESS_CODE.
export async function canBecomeCreator(code) {
  const { count, error } = await adminDb().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'creator');
  checkDbError(error);
  if (!count) return true;
  const expected = process.env.CREATOR_ACCESS_CODE;
  return !!(expected && code && code.length === expected.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected)));
}

// Tiny in-memory limiter (per server instance, per IP).
const hits = new Map();
export function rateLimited(request, key, max, windowMs) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  return list.length > max;
}

// Wraps a route handler: maps setup problems (missing env / tables) to a clear 503.
export function handle(fn) {
  return async (request, ctx) => {
    try { return await fn(request, ctx); } catch (e) {
      if (e?.status === 503) return json({ error: e.message, setup: true }, 503);
      console.error(e);
      return json({ error: 'Something went wrong' }, 500);
    }
  };
}
