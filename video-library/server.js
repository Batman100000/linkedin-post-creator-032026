const http = require('http');
const fs   = require('fs');
const path = require('path');

const HTML_FILE    = path.join(__dirname, 'asaf-library.html');
const WATCH_FOLDER = 'C:\\Users\\asafa\\FinishDownloads';
const PORT         = 8001;

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
               '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  // CORS for local use
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/api/scan') {
    try {
      const items = fs.readdirSync(WATCH_FOLDER, { withFileTypes: true }).map(d => ({
        name: d.name,
        path: path.join(WATCH_FOLDER, d.name),
        isDir: d.isDirectory()
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(items));
    } catch(e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? HTML_FILE
    : path.join(__dirname, req.url.split('?')[0]);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Library server running at http://localhost:${PORT}`);
  console.log(`Scanning: ${WATCH_FOLDER}`);
});
