/**
 * LinkedIn Post Creator — Daily Scheduler
 * Fires Mon–Fri at 09:00 (local time) and starts the proxy + HTTP servers.
 * Run once in the background: node scheduler.js &
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

const DIR       = path.dirname(require.main.filename);
const LOG       = path.join(DIR, 'scheduler.log');
const HOUR      = 9;   // 09:00
const MINUTE    = 0;
const DAYS      = [1, 2, 3, 4, 5]; // Mon–Fri (0=Sun)

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG, line);
}

function killPort(port) {
  try { execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: 'ignore' }); } catch (_) {}
}

function startServers() {
  log('Starting LinkedIn Post Creator servers...');

  killPort(3001);
  killPort(8000);

  const apiKey = fs.readFileSync(path.join(DIR, 'config.txt'), 'utf8').trim();

  const proxy = spawn('node', [path.join(DIR, 'proxy-server.js')], {
    env:      { ...process.env, CLAUDE_API_KEY: apiKey },
    detached: true,
    stdio:    'ignore',
  });
  proxy.unref();
  log(`Proxy server started (PID ${proxy.pid}) — http://localhost:3001`);

  setTimeout(() => {
    const web = spawn('python3', ['-m', 'http.server', '8000', '--directory', DIR], {
      detached: true,
      stdio:    'ignore',
    });
    web.unref();
    log(`Web server started (PID ${web.pid}) — http://localhost:8000/linkedin-post-creator.html`);
    log('Ready! Open: http://localhost:8000/linkedin-post-creator.html');
  }, 2000);
}

function msUntilNext(hour, minute, allowedDays) {
  const now  = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hour, minute);

  // If we've already passed today's fire time, push to tomorrow
  if (next <= now) next.setDate(next.getDate() + 1);

  // Advance until we hit an allowed weekday
  while (!allowedDays.includes(next.getDay())) {
    next.setDate(next.getDate() + 1);
  }

  return next - now;
}

function scheduleNext() {
  const ms = msUntilNext(HOUR, MINUTE, DAYS);
  const fireAt = new Date(Date.now() + ms);
  log(`Next run scheduled for ${fireAt.toLocaleString()} (in ${Math.round(ms / 60000)} min)`);

  setTimeout(() => {
    startServers();
    scheduleNext(); // schedule the one after
  }, ms);
}

log('LinkedIn Post Creator Scheduler started.');
log(`Schedule: Mon–Fri at ${String(HOUR).padStart(2,'0')}:${String(MINUTE).padStart(2,'0')}`);
scheduleNext();

// Keep process alive
setInterval(() => {}, 1 << 30);
