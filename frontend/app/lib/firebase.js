// Google sign-in in the browser (Firebase JS SDK, loaded only when the button is clicked).
// Firebase is used ONLY to get a Google-verified ID token; the backend verifies it and creates the
// real session, so no Firebase session is kept here. These config values are public identifiers.
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com` : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const googleConfigured = !!(cfg.apiKey && cfg.projectId && cfg.appId);

// Opens the Google popup. Resolves { idToken }, or null if the user simply closed the popup.
// Throws an Error with a user-friendly message for real failures.
export async function googlePopup() {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] || initializeApp(cfg);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const { user } = await signInWithPopup(auth, provider);
    const idToken = await user.getIdToken();
    await signOut(auth).catch(() => {}); // the backend owns the session
    return { idToken };
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
    if (code === 'auth/popup-blocked') throw new Error('Your browser blocked the Google window. Allow pop-ups for this site and try again.');
    if (code === 'auth/network-request-failed') throw new Error('Network problem. Check your connection and try again.');
    if (code === 'auth/unauthorized-domain') throw new Error('This website address is not authorised for Google sign-in yet. Add it under Firebase → Authentication → Settings → Authorized domains.');
    if (code === 'auth/operation-not-allowed') throw new Error('Google sign-in is not enabled in Firebase yet (Authentication → Sign-in method → Google).');
    throw new Error('Google sign-in failed. Please try again.');
  }
}
