const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const { exec } = require('child_process');

const VIDEO_EXT = new Set(['.mkv','.mp4','.avi','.mov','.wmv','.m4v','.flv','.webm','.ts','.m2ts']);

const HTML_FILE    = path.join(__dirname, 'asaf-library.html');
const WATCH_FOLDER = 'C:\\Users\\asafa\\FinishDownloads';
const PORT         = 8001;

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
               '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };

function json(res, data, status=200) {
  res.writeHead(status, { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' });
  res.end(JSON.stringify(data));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'SubDB/1.0',
        'X-User-Agent': 'TemporaryUserAgent'
      }
    }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks), headers: r.headers }));
    }).on('error', reject);
  });
}

function extractGzip(buf) {
  return new Promise((resolve, reject) =>
    zlib.gunzip(buf, (err, out) => err ? reject(err) : resolve(out))
  );
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlObj  = new URL(req.url, `http://localhost:${PORT}`);
  const route   = urlObj.pathname;
  const params  = urlObj.searchParams;

  // ── /api/play?path=X ──────────────────────────────────
  if (route === '/api/play') {
    const filePath = params.get('path');
    if (!filePath) return json(res, { error: 'missing path' }, 400);
    // Use start "" to open with default player (Windows)
    exec(`start "" "${filePath}"`, err => {
      if (err) return json(res, { error: err.message }, 500);
      json(res, { ok: true });
    });
    return;
  }

  // ── /api/episodes?path=X ──────────────────────────────
  if (route === '/api/episodes') {
    const folderPath = params.get('path');
    if (!folderPath) return json(res, { error: 'missing path' }, 400);
    try {
      const files = fs.readdirSync(folderPath)
        .filter(f => VIDEO_EXT.has(path.extname(f).toLowerCase()))
        .sort()
        .map(f => ({ name: f, path: path.join(folderPath, f) }));
      json(res, files);
    } catch(e) { json(res, { error: e.message }, 500); }
    return;
  }

  // ── /api/scan ─────────────────────────────────────────
  if (route === '/api/scan') {
    try {
      const items = fs.readdirSync(WATCH_FOLDER, { withFileTypes: true }).map(d => ({
        name: d.name, path: path.join(WATCH_FOLDER, d.name), isDir: d.isDirectory()
      }));
      return json(res, items);
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── /api/subtitles/search?title=X&year=Y&folder=X ────
  if (route === '/api/subtitles/search') {
    const title  = params.get('title') || '';
    const year   = params.get('year')  || '';
    const query  = encodeURIComponent(title.toLowerCase().replace(/\s+/g, '+'));
    const apiUrl = `https://rest.opensubtitles.org/search/query-${query}/sublanguageid-heb`;

    try {
      const { body } = await fetchUrl(apiUrl);
      const raw = JSON.parse(body.toString());
      const results = (Array.isArray(raw) ? raw : []).slice(0, 10).map(s => ({
        id:       s.IDSubtitleFile,
        name:     s.SubFileName,
        rating:   s.SubRating,
        downloads:s.SubDownloadsCnt,
        movieName:s.MovieName,
        year:     s.MovieYear,
        url:      s.SubDownloadLink   // gzipped .srt
      }));
      return json(res, results);
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── /api/subtitles/download?url=X&savePath=Y&title=Z ──
  if (route === '/api/subtitles/download') {
    const dlUrl    = params.get('url');
    const savePath = params.get('savePath');  // full folder path
    const title    = params.get('title') || 'subtitle';

    if (!dlUrl || !savePath) return json(res, { error: 'missing params' }, 400);

    try {
      const { body } = await fetchUrl(dlUrl);

      let srtBuf;
      try { srtBuf = await extractGzip(body); }
      catch { srtBuf = body; }  // already decompressed

      const safeName = title.replace(/[\\/:*?"<>|]/g, '_');
      const destFile = path.join(savePath, safeName + '.he.srt');
      fs.writeFileSync(destFile, srtBuf);
      return json(res, { saved: destFile });
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── static files ──────────────────────────────────────
  let filePath = route === '/' ? HTML_FILE : path.join(__dirname, route);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Access-Control-Allow-Origin':'*' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Library server running at http://localhost:${PORT}`);
});
