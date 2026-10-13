// The social networks a creator can connect, and how to turn a handle into a link.
// Every network is stored as { name, handle, followers } on the creator profile.
export const NETWORKS = [
  { key: 'yt', name: 'YouTube', unit: 'Subscribers', placeholder: 'yourchannel', url: (h) => `https://www.youtube.com/@${h}`, tile: 'from-[#ff4e45] to-[#c4302b]' },
  { key: 'ig', name: 'Instagram', unit: 'Followers', placeholder: 'yourname', url: (h) => `https://www.instagram.com/${h}`, tile: 'from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
  { key: 'fb', name: 'Facebook', unit: 'Followers', placeholder: 'yourpage', url: (h) => `https://www.facebook.com/${h}`, tile: 'from-[#1877f2] to-[#0e5ccf]' },
  { key: 'tt', name: 'TikTok', unit: 'Followers', placeholder: 'yourname', url: (h) => `https://www.tiktok.com/@${h}`, tile: 'from-[#25f4ee] via-[#111] to-[#fe2c55]' },
  { key: 'x', name: 'X', unit: 'Followers', placeholder: 'yourname', url: (h) => `https://x.com/${h}`, tile: 'from-[#2b2b2b] to-[#000]' },
  { key: 'li', name: 'LinkedIn', unit: 'Followers', placeholder: 'your-name', url: (h) => `https://www.linkedin.com/in/${h}`, tile: 'from-[#0a66c2] to-[#074a8f]' },
  { key: 'tg', name: 'Telegram', unit: 'Subscribers', placeholder: 'yourchannel', url: (h) => `https://t.me/${h}`, tile: 'from-[#2aabee] to-[#1d8fd0]' },
];

// "@name", "name", or a pasted profile link → the bare handle.
export const cleanHandle = (input) => String(input || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/.*\//, '').replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60);

export const socialUrl = (name, handle) => {
  const n = NETWORKS.find((x) => x.name === name);
  const h = cleanHandle(handle);
  return n && h ? n.url(h) : null;
};

// "100k" / "1.2M" / "100,000" → 100000 (null when it can't be read).
export function parseCount(raw) {
  const s = String(raw ?? '').trim().replace(/[,\s_]/g, '').toLowerCase();
  if (!s) return 0;
  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1));
  return Number.isFinite(n) ? Math.min(n, 1e10) : null;
}
export const compactCount = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K` : String(n));
