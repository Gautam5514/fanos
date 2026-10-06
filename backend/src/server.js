import app from './app.js';
import { printStartupReport } from './lib/startup.js';

const port = Number(process.env.PORT) || 4000;

const server = app.listen(port, () => {
  // Short pause so a late port error (EADDRINUSE) is reported on its own, not mid-report.
  setTimeout(() => printStartupReport(port).catch((e) => console.error('Startup check failed:', e.message)), 150);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  ✖ Port ${port} is already in use. Stop the other server or set PORT in backend/.env.\n`);
  else console.error(e);
  process.exit(1);
});
