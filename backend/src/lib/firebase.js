// Google sign-in verification via Firebase Admin. The browser signs in with Google through the
// Firebase JS SDK and sends us the resulting ID token; we verify it here with the service account
// (never trust the client), then open a normal Supabase session for that email.
//
// Credentials (the first one found wins):
//   FIREBASE_SERVICE_ACCOUNT_JSON    the JSON contents on ONE line (works locally and on Render/hosting)
//   FIREBASE_SERVICE_ACCOUNT_BASE64  the same JSON, base64-encoded — use this if your host mangles quotes/newlines
//   FIREBASE_SERVICE_ACCOUNT_PATH    path to the .json file (local development only)
// The service-account key is a SECRET: keep it out of git and out of the frontend.
import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let cachedCreds;
function parseCreds(raw) {
  let t = String(raw || '').trim();
  if (t.length > 1 && /^(['"]).*\1$/s.test(t) && !t.startsWith('{')) t = t.slice(1, -1); // stray wrapping quotes
  try { return JSON.parse(t); } catch { return null; }
}
function credentials() {
  if (cachedCreds !== undefined) return cachedCreds;
  cachedCreds = null;
  try {
    let j = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) j = parseCreds(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!j && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) j = parseCreds(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(), 'base64').toString('utf8'));
    if (!j && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) j = parseCreds(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
    if (j?.project_id && j.client_email && j.private_key) {
      j.private_key = String(j.private_key).replace(/\\n/g, '\n'); // tolerate a double-escaped key
      cachedCreds = j;
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.error('Firebase credentials were found but are not valid service-account JSON — Google sign-in is disabled.');
    }
  } catch (e) {
    console.error('Firebase credentials could not be read:', e.message);
  }
  return cachedCreds;
}

export const firebaseEnabled = () => !!credentials();

function app() {
  if (!getApps().length) initializeApp({ credential: cert(credentials()) });
  return getApps()[0];
}

// Returns { email, name, picture } for a valid Google sign-in, or throws an Error with `.code`.
export async function verifyGoogleIdToken(idToken) {
  if (!firebaseEnabled()) throw Object.assign(new Error('Google sign-in is not configured on this server.'), { code: 'disabled' });
  let t;
  try { t = await getAuth(app()).verifyIdToken(idToken); }
  catch { throw Object.assign(new Error('Your Google sign-in expired. Please try again.'), { code: 'invalid' }); }
  if (t.firebase?.sign_in_provider !== 'google.com') throw Object.assign(new Error('Please sign in with Google.'), { code: 'invalid' });
  if (!t.email || t.email_verified !== true) throw Object.assign(new Error('Your Google email is not verified.'), { code: 'unverified' });
  return { email: String(t.email).toLowerCase(), name: String(t.name || '').trim(), picture: t.picture || '' };
}
