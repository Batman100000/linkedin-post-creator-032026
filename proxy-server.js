/**
 * LinkedIn Post Creator — Local Proxy Server
 * ─────────────────────────────────────────
 * Keeps your Claude API key OUT of the browser.
 * Key is passed via environment variable — never saved to code or .env.
 *
 * Usage (Claude does this for you):
 *   CLAUDE_API_KEY=sk-ant-... node proxy-server.js
 *
 * Endpoints:
 *   GET  /health       — health check
 *   GET  /api/news     — fetch real RSS articles from cybersecurity/AI sites
 *   POST /api/claude   — proxy to Anthropic API
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY = process.env.CLAUDE_API_KEY || '';
const PORT    = parseInt(process.env.PROXY_PORT || '3001');
const MODEL   = process.env.CLAUDE_MODEL   || 'claude-sonnet-4-20250514';

if (!API_KEY) {
  console.error('\n❌  CLAUDE_API_KEY is missing in your .env file!');
  console.error('    Edit .env and add:  CLAUDE_API_KEY=sk-ant-...\n');
  process.exit(1);
}

// ── RSS sources — Tier 1 (Official), Tier 2 (Media), Tier 3 (Dev/Research) ──
// Failures are caught silently — partial results are still returned.
const RSS_SOURCES = [

  // ── Tier 1 — Official company blogs ──────────────────────────────────────
  { url: 'https://openai.com/blog/rss/',                               source: 'OpenAI',             icon: 'W', tier: 1 },
  { url: 'https://deepmind.google/blog/rss.xml',                       source: 'Google DeepMind',    icon: 'W', tier: 1 },
  { url: 'https://ai.meta.com/blog/rss/',                              source: 'Meta AI',            icon: 'W', tier: 1 },
  { url: 'https://blogs.microsoft.com/ai/feed/',                       source: 'Microsoft AI',       icon: 'W', tier: 1 },
  { url: 'https://blogs.nvidia.com/feed/',                             source: 'NVIDIA',             icon: 'W', tier: 1 },
  { url: 'https://www.anthropic.com/rss.xml',                          source: 'Anthropic',          icon: 'W', tier: 1 },
  { url: 'https://github.blog/ai-and-ml/feed/',                        source: 'GitHub',             icon: 'W', tier: 1 },

  // ── Tier 2 — Trusted media & analysis ────────────────────────────────────
  { url: 'https://www.technologyreview.com/feed/',                     source: 'MIT Tech Review',    icon: 'W', tier: 2 },
  { url: 'https://feeds.reuters.com/reuters/technologyNews',           source: 'Reuters',            icon: 'W', tier: 2 },
  { url: 'https://techcrunch.com/tag/artificial-intelligence/feed/',   source: 'TechCrunch',         icon: 'W', tier: 2 },
  { url: 'https://techcrunch.com/category/security/feed/',             source: 'TechCrunch Security',icon: 'W', tier: 2 },
  { url: 'https://www.wired.com/feed/tag/artificial-intelligence/rss', source: 'Wired AI',           icon: 'W', tier: 2 },
  { url: 'https://www.wired.com/feed/category/security/latest/rss',   source: 'Wired Security',     icon: 'W', tier: 2 },
  { url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html',       source: 'CNBC Tech',          icon: 'W', tier: 2 },
  { url: 'https://the-decoder.com/feed/',                              source: 'The Decoder',        icon: 'W', tier: 2 },
  { url: 'https://www.kdnuggets.com/feed',                             source: 'KDnuggets',          icon: 'W', tier: 2 },
  { url: 'https://feeds.npr.org/1019/rss.xml',                         source: 'NPR Tech',           icon: 'W', tier: 2 },

  // ── Tier 2 — Cybersecurity ────────────────────────────────────────────────
  { url: 'https://feeds.feedburner.com/TheHackersNews',                source: 'The Hacker News',    icon: 'HN', tier: 2 },
  { url: 'https://www.bleepingcomputer.com/feed/',                     source: 'BleepingComputer',   icon: 'W',  tier: 2 },
  { url: 'https://krebsonsecurity.com/feed/',                          source: 'Krebs on Security',  icon: 'W',  tier: 2 },
  { url: 'https://www.darkreading.com/rss.xml',                        source: 'Dark Reading',       icon: 'W',  tier: 2 },
  { url: 'https://www.securityweek.com/feed/',                         source: 'SecurityWeek',       icon: 'W',  tier: 2 },

  // ── Tier 3 — Developer & research ────────────────────────────────────────
  { url: 'https://huggingface.co/blog/feed.xml',                       source: 'Hugging Face',       icon: 'W', tier: 3 },
  { url: 'https://github.blog/feed/',                                  source: 'GitHub Blog',        icon: 'W', tier: 3 },
  { url: 'https://rss.arxiv.org/rss/cs.AI',                            source: 'arXiv AI',           icon: 'W', tier: 3 },
];

// ── Fetch a URL, following up to 5 redirects ─────────────────────────────────
function fetchURL(urlStr, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 5;
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch(e) { return reject(new Error('Bad URL: ' + urlStr)); }
    const mod = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  { 'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)' },
    };
    const req = mod.request(options, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.resume(); // drain
        return fetchURL(next, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout: ' + urlStr)); });
    req.on('error', reject);
    req.end();
  });
}

// ── Parse RSS/Atom XML — no external libs needed ─────────────────────────────
function extractTag(xml, tag) {
  // Try CDATA first
  const cdata = xml.match(new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></' + tag + '>', 'i'));
  if (cdata) return cdata[1].trim();
  // Plain text
  const plain = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
  return plain ? plain[1].replace(/<[^>]+>/g, '').trim() : '';
}

function parseRSSItems(xml, source, icon, max) {
  const items = [];
  // Match <item> or <entry> (Atom)
  const itemRx = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let m;
  while ((m = itemRx.exec(xml)) !== null && items.length < max) {
    const body = m[1];
    const title = extractTag(body, 'title');
    // <link> in RSS is plain text; in Atom it's an attribute
    let link = extractTag(body, 'link');
    if (!link) {
      const attrM = body.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (attrM) link = attrM[1];
    }
    if (!link) link = extractTag(body, 'guid');
    const pubDate = extractTag(body, 'pubDate') || extractTag(body, 'published') || extractTag(body, 'dc:date') || '';
    if (title && link && link.startsWith('http')) {
      items.push({ title, url: link, date: pubDate, source, icon });
    }
  }
  return items;
}

// ── /api/news — fetch real articles from RSS ─────────────────────────────────
function handleNewsRequest(res) {
  const fetches = RSS_SOURCES.map(s =>
    fetchURL(s.url)
      .then(r => parseRSSItems(r.body, s.source, s.icon, 4).map(a => ({ ...a, tier: s.tier || 2 })))
      .catch(err => {
        console.warn('[rss] failed:', s.source, '-', err.message);
        return [];
      })
  );
  Promise.all(fetches).then(results => {
    // Flatten, sort by tier (1 first), deduplicate by URL
    const seen = new Set();
    const articles = results
      .flat()
      .sort((a, b) => (a.tier || 2) - (b.tier || 2))
      .filter(a => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });
    const byTier = { 1: 0, 2: 0, 3: 0 };
    articles.forEach(a => byTier[a.tier || 2]++);
    console.log(`[rss] fetched ${articles.length} articles — T1:${byTier[1]} T2:${byTier[2]} T3:${byTier[3]}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ articles }));
  }).catch(err => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });
}

// ── CORS — allow localhost AND file:// origins (local machine only) ─────────
function setCORS(res, origin) {
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  const isFile      = !origin || origin === 'null'; // file:// sends empty/null origin
  if (isLocalhost || isFile) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Main request handler ─────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  setCORS(res, origin);

  // Pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', model: MODEL }));
    return;
  }

  // ── Real RSS news ──
  if (req.method === 'GET' && req.url === '/api/news') {
    handleNewsRequest(res);
    return;
  }

  // ── Graceful shutdown ──
  if (req.method === 'POST' && req.url === '/shutdown') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'shutting down' }));
    console.log('\n🛑  Shutdown requested from browser. Bye!\n');
    setTimeout(() => process.exit(0), 200);
    return;
  }

  // Only accept POST /api/claude
  if (req.method !== 'POST' || req.url !== '/api/claude') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (_) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Build Anthropic payload — browser only sends {prompt, max_tokens}
    const payload = JSON.stringify({
      model:      MODEL,
      max_tokens: parsed.max_tokens || 1024,
      messages:   [{ role: 'user', content: parsed.prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(payload),
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const apiReq = https.request(options, apiRes => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    apiReq.on('error', err => {
      console.error('[proxy] upstream error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream error: ' + err.message }));
    });

    apiReq.write(payload);
    apiReq.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n✅  Proxy server running at http://localhost:' + PORT);
  console.log('    Model : ' + MODEL);
  console.log('    CORS  : localhost only');
  console.log('    Key   : ' + API_KEY.slice(0, 12) + '...[hidden]\n');
  console.log('    RSS   : The Hacker News, BleepingComputer, Krebs, Dark Reading, TechCrunch, SecurityWeek');
  console.log('    Open linkedin-post-creator.html in your browser.\n');
});
