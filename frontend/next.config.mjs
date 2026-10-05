// The UI calls relative /api/* URLs; Next.js proxies them to the backend service.
// Keeping the API on the same origin as the page means the Supabase session cookies
// set by the backend stay first-party (no CORS, no third-party-cookie blocking).
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
