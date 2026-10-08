// Startup health report printed when the API boots: environment, Supabase connection,
// database tables, community data and optional features. Never prints secret values.
import { adminDb, supabaseConfigured } from './supabase.js';
import { llmEnabled } from './llm.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = { green: paint(32), red: paint(31), yellow: paint(33), dim: paint(2), bold: paint(1), cyan: paint(36), magenta: paint(35) };
const OK = c.green('✔'), FAIL = c.red('✖'), WARN = c.yellow('▲'), OFF = c.dim('○');

const row = (icon, label, detail = '') => console.log(`  ${icon} ${label.padEnd(18)} ${c.dim(detail)}`);
const host = (url) => { try { return new URL(url).host; } catch { return 'invalid URL'; } };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms))]);

// Returns true when the database is reachable and the schema is in place.
async function checkDatabase() {
  if (!supabaseConfigured()) {
    const missing = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter((k) => !process.env[k]);
    row(FAIL, 'Supabase config', `missing ${missing.join(', ')} in backend/.env`);
    return false;
  }
  row(OK, 'Supabase config', host(process.env.SUPABASE_URL));

  const db = adminDb();
  const started = Date.now();
  console.log(c.dim('    checking database…'));
  // All checks run in parallel; each has its own time limit so a slow network can't hang startup.
  const LIMIT = 20000;
  const q = (p) => withTimeout(p, LIMIT).then((r) => r, (e) => ({ error: { message: e.message, timeout: true } }));
  const [profiles, creatorsRes, state, feedback] = await Promise.all([
    q(db.from('profiles').select('id', { count: 'exact', head: true })),
    q(db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'creator')),
    q(db.from('app_state').select('version, data').eq('id', 1).maybeSingle()),
    q(db.from('creator_feedback').select('id', { count: 'exact', head: true })),
  ]);
  const ms = Date.now() - started;
  const isMissing = (r) => r.error && (r.error.code === 'PGRST205' || r.error.code === '42P01');
  const failed = [profiles, state].find((r) => r.error && !isMissing(r));
  if (failed) {
    row(FAIL, 'Database', failed.error.timeout ? `no answer within ${LIMIT / 1000}s — check your internet / Supabase status` : `cannot connect — ${failed.error.message}`);
    return false;
  }
  row(ms > 3000 ? WARN : OK, 'Database', `connected in ${(ms / 1000).toFixed(1)} s${ms > 3000 ? ' (slow network)' : ''}`);

  const missing = [['profiles', profiles], ['app_state', state], ['creator_feedback', feedback]].filter(([, r]) => isMissing(r)).map(([t]) => t);
  if (missing.length) {
    row(FAIL, 'Tables', `missing ${missing.join(', ')} — run backend/supabase/migrations/001_fanos.sql`);
    return false;
  }
  row(OK, 'Tables', 'profiles, app_state, creator_feedback');

  const accounts = profiles.count ?? 0, creators = creatorsRes.count ?? 0;
  const d = state.data?.data || {};
  const n = (k) => (Array.isArray(d[k]) ? d[k].length : 0);
  row(OK, 'Community data', state.data
    ? `${accounts} accounts (${creators} creator) · ${n('members')} members · ${n('communities')} communities · ${n('ideas')} ideas · ${n('projects')} projects`
    : `${accounts} accounts · empty community (created on first request)`);
  if (!creators) row(WARN, 'Creator', 'no creator yet — the first creator signup claims the community');
  return true;
}

export async function printStartupReport(port) {
  const t0 = Date.now();
  console.log('');
  console.log(`  ${c.bold(c.magenta('FanOS API'))} ${c.dim(`· ${process.env.NODE_ENV || 'development'} · Node ${process.versions.node}`)}`);
  console.log('');
  row(OK, 'Server', c.cyan(`http://localhost:${port}`) + c.dim('  (health: /health)'));

  let dbOk = false;
  try { dbOk = await checkDatabase(); } catch (e) { row(FAIL, 'Database', e.message); }

  row(llmEnabled() ? OK : OFF, 'AI (LLM)', llmEnabled()
    ? `${process.env.OPENAI_MODEL || 'gpt-4o-mini'} via ${host(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')}`
    : 'off — built-in engine (set OPENAI_API_KEY to enable)');
  // The follower invite link always works; it needs no configuration.
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  row(dbOk ? OK : FAIL, 'Invite link', dbOk ? `${c.cyan(`${appUrl}/join`)} — followers sign up as members` : 'needs the database');
  row(process.env.FEEDBACK_ADMIN_TOKEN ? OK : OFF, 'Admin token', process.env.FEEDBACK_ADMIN_TOKEN ? 'set' : 'not set');

  console.log('');
  console.log(dbOk
    ? `  ${c.green(c.bold('Ready'))} ${c.dim(`in ${Date.now() - t0} ms`)}`
    : `  ${c.red(c.bold('Started with problems'))} ${c.dim('— API requests that need the database will return 503 until fixed')}`);
  console.log('');
}
