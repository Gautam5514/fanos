// Request helpers shared by the route modules.

// Parses the raw text body (see express.text in app.js). Sends the error response itself
// and returns undefined when the body is too large or not valid JSON.
export function readJson(req, res, max, invalid = { error: 'Invalid JSON' }) {
  const text = typeof req.body === 'string' ? req.body : '';
  if (text.length > max) { res.status(413).json({ error: 'Too large' }); return undefined; }
  try { return JSON.parse(text); } catch { res.status(400).json(invalid); return undefined; }
}
