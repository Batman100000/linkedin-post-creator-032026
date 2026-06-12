const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const { exec } = require('child_process');

// Load API key from environment (or use provided key)
const OMDB_KEY = process.env.OMDB_API_KEY || 'b9bd48a6';

const VIDEO_EXT = new Set(['.mkv','.mp4','.avi','.mov','.wmv','.m4v','.flv','.webm','.ts','.m2ts']);

const HTML_FILE    = path.join(__dirname, 'asaf-library.html');
const WATCH_FOLDER = 'C:\\Users\\asafa\\FinishDownloads';
const POSTERS_DIR  = path.join(__dirname, 'posters');
const PORT         = 8001;

if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR);

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

  // ── /api/poster?title=X&year=Y ───────────────────────
  if (route === '/api/poster') {
    const title = params.get('title') || '';
    const year  = params.get('year')  || '';
    const slug  = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const localFile = path.join(POSTERS_DIR, slug + '.jpg');
    const localUrl  = `http://localhost:${PORT}/posters/${slug}.jpg`;

    // Serve from cache if already downloaded
    if (fs.existsSync(localFile)) {
      return json(res, { poster: localUrl, cached: true });
    }

    // Helper: download image and cache it, return local URL on success
    async function cacheImage(remoteUrl) {
      try {
        const imgRes = await fetchUrl(remoteUrl);
        if (imgRes.status === 200 && imgRes.body.length > 5000) {
          fs.writeFileSync(localFile, imgRes.body);
          return localUrl;
        }
      } catch(_) {}
      return null;
    }

    // Helper: get poster URL from a Wikipedia page slug
    async function wikiPoster(pageSlug) {
      try {
        const { body } = await fetchUrl(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageSlug)}`);
        const data = JSON.parse(body.toString());
        if (!data.thumbnail) return null;
        // Upgrade thumbnail to 500px width
        return data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
      } catch(_) { return null; }
    }

    // 1) Try OMDB
    try {
      const q = encodeURIComponent(title);
      const { body } = await fetchUrl(`https://www.omdbapi.com/?t=${q}&y=${year}&apikey=${OMDB_KEY}`);
      const data = JSON.parse(body.toString());
      if (data.Poster && data.Poster !== 'N/A' && data.Response !== 'False') {
        const cached = await cacheImage(data.Poster);
        if (cached) return json(res, { poster: cached });
      }
    } catch(_) {}

    // 2) Wikipedia — try common film article title patterns
    const wikiCandidates = [
      `${title} (film)`,
      `${title} (${year} film)`,
      year ? `${title} (${year})` : null,
      `${title} film`,
      `${title}`,
    ].filter(Boolean);

    for (const candidate of wikiCandidates) {
      const remoteUrl = await wikiPoster(candidate);
      if (remoteUrl) {
        const cached = await cacheImage(remoteUrl);
        if (cached) return json(res, { poster: cached });
        return json(res, { poster: remoteUrl });
      }
    }

    // 3) Wikipedia search as last resort (try multiple search terms)
    const searchTerms = [
      title + (year ? ' ' + year : '') + ' film',
      title + ' film',
      title + (year ? ' ' + year : ''),
    ];

    for (const searchTerm of searchTerms) {
      try {
        const q = encodeURIComponent(searchTerm);
        const { body } = await fetchUrl(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=5&format=json`);
        const results = JSON.parse(body.toString());
        const titles  = results[1] || [];
        const urls    = results[3] || [];
        for (let i = 0; i < titles.length; i++) {
          const pageSlug = decodeURIComponent(urls[i].split('/wiki/')[1] || '');
          if (!pageSlug) continue;
          const remoteUrl = await wikiPoster(pageSlug);
          if (remoteUrl) {
            const cached = await cacheImage(remoteUrl);
            if (cached) return json(res, { poster: cached });
            return json(res, { poster: remoteUrl });
          }
        }
      } catch(_) {}
    }

    return json(res, { poster: null });
  }

  // ── /api/play?path=X ──────────────────────────────────
  if (route === '/api/play') {
    const filePath = params.get('path');
    if (!filePath) return json(res, { error: 'missing path' }, 400);
    // Prevent path traversal — file must be under WATCH_FOLDER
    const resolved = path.resolve(filePath);
    const watchResolved = path.resolve(WATCH_FOLDER);
    if (!resolved.startsWith(watchResolved)) {
      return json(res, { error: 'access denied' }, 403);
    }
    // Verify file exists and is a video
    if (!VIDEO_EXT.has(path.extname(filePath).toLowerCase())) {
      return json(res, { error: 'not a video file' }, 400);
    }
    // Use start "" to open with default player (Windows)
    exec(`start "" "${filePath}"`, err => {
      if (err) return json(res, { error: 'play failed' }, 500);
      json(res, { ok: true });
    });
    return;
  }

  // ── /api/episodes?path=X ──────────────────────────────
  if (route === '/api/episodes') {
    const folderPath = params.get('path');
    if (!folderPath) return json(res, { error: 'missing path' }, 400);
    // Prevent path traversal
    const resolved = path.resolve(folderPath);
    const watchResolved = path.resolve(WATCH_FOLDER);
    if (!resolved.startsWith(watchResolved)) {
      return json(res, { error: 'access denied' }, 403);
    }
    try {
      const files = fs.readdirSync(resolved)
        .filter(f => VIDEO_EXT.has(path.extname(f).toLowerCase()))
        .sort()
        .map(f => ({ name: f, path: path.join(resolved, f) }));
      json(res, files);
    } catch(e) { json(res, { error: 'folder read error' }, 500); }
    return;
  }

  // ── /api/scan ─────────────────────────────────────────
  if (route === '/api/scan') {
    try {
      const items = fs.readdirSync(WATCH_FOLDER, { withFileTypes: true }).map(d => {
        const fullPath = path.join(WATCH_FOLDER, d.name);
        const stat = fs.statSync(fullPath);
        return {
          name: d.name,
          path: fullPath,
          isDir: d.isDirectory(),
          mtime: stat.mtimeMs  // Last modified time in milliseconds
        };
      });
      return json(res, items);
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── /api/operations-report ────────────────────────────
  if (route === '/api/operations-report') {
    try {
      const MUSIC_KW  = /mp3|music|billboard|songs|chart|acoustic|party|flac|album|rock/i;
      const SERIES_KW = /\bS\d{2}\b|season\s*\d|complete/i;

      const items = fs.readdirSync(WATCH_FOLDER, { withFileTypes: true })
        .filter(d => d.isDirectory() && !/^\.|desktop\.ini|thumbs\.db/i.test(d.name))
        .map(d => {
          const fullPath = path.join(WATCH_FOLDER, d.name);
          const stat = fs.statSync(fullPath);

          // Count video files recursively
          function countVideos(dir) {
            let count = 0;
            try {
              fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
                if (entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase())) {
                  count++;
                } else if (entry.isDirectory()) {
                  count += countVideos(path.join(dir, entry.name));
                }
              });
            } catch(_) {}
            return count;
          }

          const videoCount = countVideos(fullPath);
          const isMusic = MUSIC_KW.test(d.name);
          const isSeries = SERIES_KW.test(d.name);
          const hasPoster = fs.existsSync(path.join(POSTERS_DIR, d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg'));

          return {
            name: d.name,
            videoCount: videoCount,
            isMusic: isMusic,
            isSeries: isSeries,
            hasPoster: hasPoster,
            shouldDisplay: !isMusic && videoCount > 0,
            mtime: stat.mtimeMs
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const report = {
        totalFolders: items.length,
        totalVideos: items.reduce((s, i) => s + i.videoCount, 0),
        musicFolders: items.filter(i => i.isMusic).length,
        videoFolders: items.filter(i => !i.isMusic).length,
        seriesFolders: items.filter(i => !i.isMusic && i.isSeries).length,
        movieFolders: items.filter(i => !i.isMusic && !i.isSeries).length,
        emptyFolders: items.filter(i => i.videoCount === 0).length,
        postersFound: items.filter(i => i.hasPoster).length,
        items: items
      };

      return json(res, report);
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── /api/count-videos ─────────────────────────────────
  if (route === '/api/count-videos') {
    try {
      function countVideos(dir) {
        let count = 0;
        try {
          fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            if (entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase())) {
              count++;
            } else if (entry.isDirectory()) {
              count += countVideos(path.join(dir, entry.name));
            }
          });
        } catch(_) {}
        return count;
      }
      const total = countVideos(WATCH_FOLDER);
      return json(res, { totalVideoFiles: total });
    } catch(e) { return json(res, { error: e.message }, 500); }
  }

  // ── /api/folder-type?path=X ────────────────────────────
  if (route === '/api/folder-type') {
    const folderPath = params.get('path');
    if (!folderPath) return json(res, { error: 'missing path' }, 400);
    const resolved = path.resolve(folderPath);
    const watchResolved = path.resolve(WATCH_FOLDER);
    if (!resolved.startsWith(watchResolved)) return json(res, { error: 'access denied' }, 403);

    try {
      // Recursively find all files in folder tree
      function walkDir(dir) {
        const files = [];
        try {
          fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            if (entry.isFile()) {
              files.push(path.extname(entry.name).toLowerCase());
            } else if (entry.isDirectory()) {
              files.push(...walkDir(path.join(dir, entry.name)));
            }
          });
        } catch(_) {}
        return files;
      }

      const allExts = walkDir(resolved);
      const hasMP3 = allExts.some(ext => ['.mp3', '.flac', '.wav', '.m4a'].includes(ext));
      const hasVideo = allExts.some(ext => ['.mkv','.mp4','.avi','.mov','.wmv','.m4v','.flv','.webm','.ts','.m2ts'].includes(ext));

      return json(res, { hasMP3, hasVideo, isMusic: hasMP3 && !hasVideo, fileCount: allExts.length });
    } catch(e) { return json(res, { error: 'read error' }, 500); }
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

    // Prevent path traversal in savePath
    const resolved = path.resolve(savePath);
    const watchResolved = path.resolve(WATCH_FOLDER);
    if (!resolved.startsWith(watchResolved)) {
      return json(res, { error: 'access denied' }, 403);
    }

    try {
      const { body } = await fetchUrl(dlUrl);

      // Limit subtitle file size to 10MB
      if (body.length > 10 * 1024 * 1024) {
        return json(res, { error: 'file too large' }, 413);
      }

      let srtBuf;
      try { srtBuf = await extractGzip(body); }
      catch { srtBuf = body; }  // already decompressed

      const safeName = title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 100);  // Max 100 chars
      const destFile = path.join(resolved, safeName + '.he.srt');

      // Final path check
      const destResolved = path.resolve(destFile);
      if (!destResolved.startsWith(watchResolved)) {
        return json(res, { error: 'invalid path' }, 403);
      }

      fs.writeFileSync(destFile, srtBuf);
      return json(res, { saved: destFile });
    } catch(e) { return json(res, { error: 'download failed' }, 500); }
  }

  // ── /posters/ static images ───────────────────────────
  if (route.startsWith('/posters/')) {
    const filename = path.basename(route);
    // Reject if filename has path separators
    if (filename.includes('/') || filename.includes('\\') || filename === '..') {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const imgFile = path.join(POSTERS_DIR, filename);
    const resolved = path.resolve(imgFile);
    const dirResolved = path.resolve(POSTERS_DIR);
    // Prevent path traversal
    if (!resolved.startsWith(dirResolved)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(imgFile, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin':'*',
                           'Cache-Control': 'public, max-age=31536000' });
      res.end(data);
    });
    return;
  }

  // ── static files ──────────────────────────────────────
  let filePath = route === '/' ? HTML_FILE : path.join(__dirname, route);
  const resolved = path.resolve(filePath);
  const dirResolved = path.resolve(__dirname);
  // Prevent path traversal — only serve files under __dirname
  if (!resolved.startsWith(dirResolved)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Access-Control-Allow-Origin':'*' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Library server running at http://localhost:${PORT}`);
});
