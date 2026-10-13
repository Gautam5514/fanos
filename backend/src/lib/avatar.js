// Profile photos. We only ever store/serve the photo URL Google gives us at sign-in (kept in the
// Supabase user's metadata) — no uploads. URLs are allow-listed to Google's image host so a user
// can't make the app load arbitrary third-party images.
import { adminDb } from './supabase.js';

const GOOGLE_IMG = /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\/[^\s"'<>]+$/i;
export const safeAvatar = (u) => (typeof u === 'string' && u.length < 600 && GOOGLE_IMG.test(u) ? u : '');

const cache = new Map(); // userId -> { url, at }
const TTL = 10 * 60_000;

export const forgetAvatar = (userId) => cache.delete(userId);

// The creator's photo (for invite pages and for members of their community).
export async function avatarFor(userId) {
  if (!userId) return '';
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.url;
  let url = '';
  try {
    const { data } = await adminDb().auth.admin.getUserById(userId);
    url = safeAvatar(data?.user?.user_metadata?.avatar_url || data?.user?.user_metadata?.picture);
  } catch { /* no photo is fine */ }
  if (cache.size > 2000) cache.clear();
  cache.set(userId, { url, at: Date.now() });
  return url;
}

// Save the Google photo on the account (merging, so other metadata is kept).
export async function saveGoogleAvatar(userId, picture) {
  const url = safeAvatar(picture);
  if (!url) return;
  try {
    const { data } = await adminDb().auth.admin.getUserById(userId);
    const meta = data?.user?.user_metadata || {};
    if (meta.avatar_url === url) return;
    await adminDb().auth.admin.updateUserById(userId, { user_metadata: { ...meta, avatar_url: url } });
    forgetAvatar(userId);
  } catch (e) { console.error('saveGoogleAvatar', e.message); }
}
