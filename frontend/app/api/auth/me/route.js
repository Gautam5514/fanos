import { supabaseConfigured } from '../../../lib/server/supabase';
import { getUser, handle, json, publicUser } from '../../../lib/server/auth';

export const GET = handle(async () => {
  if (!supabaseConfigured()) return json({ user: null, configured: false });
  const user = await getUser();
  return json({ user: publicUser(user), configured: true });
});
