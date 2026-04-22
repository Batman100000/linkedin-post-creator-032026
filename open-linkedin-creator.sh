#!/bin/bash
# Scheduled task: open LinkedIn Post Creator in browser
# Kills stale servers and restarts them, then opens the app.

cd "$(dirname "$0")"

fuser -k 3001/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
sleep 1

CLAUDE_API_KEY=$(cat config.txt | tr -d '[:space:]') node proxy-server.js >> proxy-server.log 2>&1 &
sleep 2

python3 -m http.server 8000 >> python-server.log 2>&1 &
sleep 1

xdg-open http://localhost:8000/linkedin-post-creator.html 2>/dev/null || \
  open http://localhost:8000/linkedin-post-creator.html 2>/dev/null || true
