// Accounts & sessions via Supabase Auth (sessions live in Supabase-managed httpOnly cookies).
// Roles and the member link are stored in public.profiles.
import crypto from 'crypto';
import { adminDb, authClient, checkDbError } from './supabase.js';

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

// A short list of obviously-weak passwords we refuse outright (length is checked separately).
const WEAK_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', '111111111', '000000000', 'iloveyou', 'letmein1',
  'admin123', 'welcome1', 'password!', 'passw0rd', 'abc12345', 'changeme1',
]);

// Returns a reason string if the password is too weak, else null.
export function passwordWeakness(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 72) return 'Password must be 72 characters or fewer';
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) return 'That password is too common — pick something harder to guess';
  if (/^(.)\1+$/.test(pw)) return 'Password cannot be a single repeated character';
  if (/^(?:0123456789|1234567890|abcdefghij)/i.test(pw)) return 'Password cannot be a simple sequence';
  // Require at least two character classes so "aaaaaaaa"-style strings are rejected.
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 2) return 'Use a mix of letters, numbers or symbols';
  return null;
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

export const fromProfile = (p) => ({ id: p.id, email: p.email, name: p.name, role: p.role, memberId: p.member_id, provider: p.provider });

// Current signed-in user (with role) or null.
export async function getUser(req, res) {
  const sb = authClient(req, res);
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

export const clientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local';

// Tiny in-memory limiter (per server instance, per IP).
const hits = new Map();
export function rateLimited(req, key, max, windowMs) {
  return rateLimitedKey(`${key}:${clientIp(req)}`, max, windowMs);
}

// Rate-limit by an arbitrary composite key (e.g. per-email), independent of IP.
export function rateLimitedKey(k, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  // Opportunistically evict stale keys so the map can't grow unbounded.
  if (hits.size > 5000) for (const [key, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(key);
  return list.length > max;
}
