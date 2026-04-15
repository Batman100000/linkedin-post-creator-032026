#!/bin/bash
# LinkedIn Post Creator — Daily scheduled launcher
# Starts the proxy + web server if not already running, then opens the app.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$SCRIPT_DIR/scheduler.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "--- Scheduled launch triggered ---"

# ── Start proxy (port 3001) if not running ────────────────────────────────────
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  log "Starting proxy server..."
  CLAUDE_API_KEY=$(cat "$SCRIPT_DIR/config.txt" | tr -d '[:space:]') \
    node "$SCRIPT_DIR/proxy-server.js" >> "$SCRIPT_DIR/proxy-server.log" 2>&1 &
  sleep 2
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    log "Proxy server started (PID $!)"
  else
    log "ERROR: Proxy server failed to start"
  fi
else
  log "Proxy server already running"
fi

# ── Start web server (port 8000) if not running ───────────────────────────────
if ! curl -s http://localhost:8000/linkedin-post-creator.html > /dev/null 2>&1; then
  log "Starting web server..."
  cd "$SCRIPT_DIR"
  python3 -m http.server 8000 >> "$SCRIPT_DIR/python-server.log" 2>&1 &
  sleep 1
  log "Web server started (PID $!)"
else
  log "Web server already running"
fi

# ── Open the app in the browser ───────────────────────────────────────────────
URL="http://localhost:8000/linkedin-post-creator.html"
log "Opening $URL"
xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null || \
  notify-send "LinkedIn Post Creator" "Time to write your LinkedIn post! Open: $URL" 2>/dev/null || true

log "Done."
