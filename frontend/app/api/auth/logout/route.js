import { authClient } from '../../../lib/server/supabase';
import { handle, json } from '../../../lib/server/auth';

export const POST = handle(async () => {
  const sb = await authClient();
  await sb.auth.signOut();
  return json({ ok: true });
});
