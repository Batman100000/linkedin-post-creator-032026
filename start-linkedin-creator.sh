#!/bin/bash
# LinkedIn Post Creator — startup script
cd "$(dirname "$0")"

# Kill any existing servers on these ports
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true

sleep 1

# Start proxy server with API key
CLAUDE_API_KEY=$(cat config.txt | tr -d '[:space:]') node proxy-server.js >> proxy-server.log 2>&1 &
echo "Proxy PID: $!"

sleep 2

# Start web server
python3 -m http.server 8000 >> python-server.log 2>&1 &
echo "Web server PID: $!"

sleep 1

# Open browser
xdg-open http://localhost:8000/linkedin-post-creator.html 2>/dev/null || \
  open http://localhost:8000/linkedin-post-creator.html 2>/dev/null || \
  echo "Open in browser: http://localhost:8000/linkedin-post-creator.html"

echo "LinkedIn Post Creator is running at http://localhost:8000/linkedin-post-creator.html"
