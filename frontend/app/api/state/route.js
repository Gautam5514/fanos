import { loadState, loadVersion } from '../../lib/server/db';
import { snapshotFor } from '../../lib/server/actions';
import { getUser, handle, json } from '../../lib/server/auth';

// Shared community data for the signed-in user. `?v=<version>` → {unchanged:true} when nothing changed.
export const GET = handle(async (request) => {
  const user = await getUser();
  if (!user) return json({ error: 'Sign in required' }, 401);
  const v = Number(new URL(request.url).searchParams.get('v'));
  if (v) {
    const current = await loadVersion();
    if (current === v) return json({ unchanged: true, version: v });
  }
  return json(snapshotFor(user, await loadState()));
});
