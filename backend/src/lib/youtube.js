// Optional YouTube lookup via the official YouTube Data API v3.
// Enabled only when YOUTUBE_API_KEY is set. Given a channel handle (e.g. "@mkbhd"),
// legacy username, channel URL, or channel id (UC…), returns the REAL public stats:
//   { channelId, title, handle, subscribers, hidden }
// The key stays server-side. When disabled or on any error, callers fall back to manual entry.
//
// This is the allowed, stable way to read public YouTube stats (no scraping):
//   https://developers.google.com/youtube/v3/docs/channels/list

export const youtubeEnabled = () => !!process.env.YOUTUBE_API_KEY;

const API = 'https://www.googleapis.com/youtube/v3/channels';

// Pull a usable identifier out of whatever the creator typed (handle, URL, or id).
function parseInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  // Full channel URL forms.
  const urlHandle = s.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i);
  if (urlHandle) return { kind: 'handle', value: urlHandle[1] };
  const urlId = s.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})/i);
  if (urlId) return { kind: 'id', value: urlId[1] };
  const urlUser = s.match(/youtube\.com\/user\/([A-Za-z0-9._-]+)/i);
  if (urlUser) return { kind: 'username', value: urlUser[1] };
  const urlC = s.match(/youtube\.com\/c\/([A-Za-z0-9._-]+)/i);
  if (urlC) return { kind: 'handle', value: urlC[1] };
  // Bare channel id.
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(s)) return { kind: 'id', value: s };
  // Bare handle (strip a leading @).
  return { kind: 'handle', value: s.replace(/^@+/, '') };
}

async function callApi(params) {
  const url = `${API}?${new URLSearchParams({ ...params, part: 'statistics,snippet', key: process.env.YOUTUBE_API_KEY }).toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return { error: r.status === 403 ? 'quota' : 'request-failed' };
    const d = await r.json();
    return { items: d?.items || [] };
  } catch {
    return { error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

function toResult(item) {
  const stats = item.statistics || {};
  return {
    channelId: item.id,
    title: item.snippet?.title || '',
    handle: item.snippet?.customUrl ? item.snippet.customUrl.replace(/^@?/, '@') : '',
    subscribers: stats.hiddenSubscriberCount ? null : Number(stats.subscriberCount || 0),
    hidden: !!stats.hiddenSubscriberCount,
  };
}

// Resolve a creator-supplied identifier to real channel stats, or null if not found/disabled.
export async function lookupYouTube(raw) {
  if (!youtubeEnabled()) return { error: 'disabled' };
  const parsed = parseInput(raw);
  if (!parsed) return { error: 'empty' };

  // Try the most direct lookup first based on what we parsed.
  const order = parsed.kind === 'id'
    ? [{ id: parsed.value }]
    : parsed.kind === 'username'
      ? [{ forUsername: parsed.value }, { forHandle: parsed.value }]
      : [{ forHandle: parsed.value }, { forUsername: parsed.value }];

  for (const params of order) {
    const res = await callApi(params);
    if (res.error) return { error: res.error };
    if (res.items.length) return { channel: toResult(res.items[0]) };
  }
  return { error: 'not-found' };
}
