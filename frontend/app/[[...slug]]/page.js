// One route for the whole app: /, /auth/login, /dashboard, /ideas, /communities/:id …
// AppRoot reads the URL and renders the matching screen (see lib/routes.js),
// including the page <title>.
import AppRoot from '../components/AppRoot';

export default function Page() {
  return <AppRoot />;
}
