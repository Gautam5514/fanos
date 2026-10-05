// Express app: every route lives under /api so the frontend can proxy /api/* here
// (see frontend/next.config.mjs) and session cookies stay first-party.
import express from 'express';
import authRoutes from './routes/auth.js';
import communityRoutes from './routes/community.js';
import aiRoutes from './routes/ai.js';
import feedbackRoutes from './routes/feedback.js';
import publicRoutes from './routes/public.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// Baseline security headers on every response (the API serves JSON only).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Bodies are read as raw text; each route parses + size-checks it itself.
app.use(express.text({ type: () => true, limit: '100kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', communityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/public', publicRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Maps setup problems (missing env / tables) to a clear 503; everything else is a 500.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return;
  if (err?.status === 503) return res.status(503).json({ error: err.message, setup: true });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Too large' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
