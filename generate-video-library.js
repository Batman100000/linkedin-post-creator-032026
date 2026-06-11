#!/usr/bin/env node

/**
 * Video Library Generator - Netflix Style
 * Scans C:\Users\asafa\FinishDownloads and generates HTML
 * Usage: node generate-video-library.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FOLDER_PATH = 'C:\\Users\\asafa\\FinishDownloads';
const OUTPUT_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\asafa', 'Downloads', 'my-library-final.html');

console.log('🎬 Video Library Generator\n');
console.log(`📁 Scanning: ${FOLDER_PATH}`);

// Get all subfolders
let folders = [];
try {
  const items = fs.readdirSync(FOLDER_PATH, { withFileTypes: true });
  folders = items
    .filter(item => item.isDirectory())
    .map(item => ({
      name: item.name,
      path: path.join(FOLDER_PATH, item.name)
    }));
} catch (err) {
  console.error(`❌ Error reading folder: ${err.message}`);
  process.exit(1);
}

console.log(`✅ Found ${folders.length} items\n`);

// Separate Series from Movies
const seriesPattern = /S\d{2}E/i;
const series = folders.filter(f => seriesPattern.test(f.name));
const movies = folders.filter(f => !seriesPattern.test(f.name));

console.log(`📺 Series: ${series.length}`);
console.log(`🎬 Movies: ${movies.length}\n`);

// Generate HTML
const generateRow = (item, type, index) => {
  const id = `${type[0]}_${index}`;
  const escapedPath = item.path.replace(/\\/g, '\\\\');
  return `
    <tr data-id="${id}" data-folder="${escapedPath}">
      <td class="poster-cell"><div class="poster-wrap"><img id="img-${id}" alt=""><span class="fallback-text">...</span></div></td>
      <td class="title-cell">
        <div class="title-main">${item.name}</div>
        <div class="title-sub">${type}</div>
      </td>
      <td style="font-size:11px;color:#666;word-break:break-all;">${escapedPath}</td>
      <td class="actions-cell">
        <button class="action-btn btn-folder" onclick="openFolder(this)">📁</button>
        <button class="action-btn btn-watched" onclick="toggleWatchedRow(this)">👁 Saw This</button>
        <button class="action-btn btn-remove" onclick="removeRow(this)">✕</button>
      </td>
    </tr>`;
};

const seriesRows = series.map((s, i) => generateRow(s, 'Series', i)).join('');
const moviesRows = movies.map((m, i) => generateRow(m, 'Movies', i)).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Asaf's Video Library</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #141414;
    color: #e5e5e5;
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 30px 40px;
  }

  .header-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 8px;
  }
  h1 { font-size: 28px; color: #e50914; letter-spacing: 1px; }
  .subtitle { color: #666; font-size: 12px; margin-top: 4px; }

  .header-actions { display: flex; gap: 8px; align-items: center; }

  .btn-refresh {
    display: inline-flex; align-items: center; gap: 6px;
    background: #2a2a2a; color: #ccc; border: 1px solid #444;
    font-size: 12px; border-radius: 5px; padding: 7px 14px;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-refresh:hover { background: #3a3a3a; color: #fff; border-color: #666; }
  .btn-refresh.spinning svg { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .btn-toggle-watched {
    display: inline-flex; align-items: center; gap: 6px;
    background: #1a1a1a; color: #888; border: 1px solid #333;
    font-size: 12px; border-radius: 5px; padding: 7px 14px;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-toggle-watched:hover { color: #ccc; border-color: #555; }
  .btn-toggle-watched.active { color: #4caf50; border-color: #4caf50; }

  h2 {
    font-size: 17px; color: #fff; margin: 32px 0 12px;
    border-left: 4px solid #e50914; padding-left: 10px;
    display: flex; align-items: center; gap: 10px;
  }
  .count-badge {
    font-size: 11px; color: #888; font-weight: 400;
    background: #2a2a2a; border-radius: 10px; padding: 2px 8px;
  }

  table { width: 100%; border-collapse: collapse; background: #1f1f1f; border-radius: 8px; overflow: hidden; margin-bottom: 32px; }
  thead tr { background: #252525; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  th, td { padding: 11px 12px; text-align: left; border-bottom: 1px solid #272727; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tbody tr { transition: background 0.12s; }
  tbody tr:hover td { background: #242424; }

  tbody tr.watched td { opacity: 0.38; }
  tbody tr.watched .title-main { text-decoration: line-through; color: #777; }
  tbody tr.hidden-row { display: none; }
  body.hide-watched tbody tr.watched { display: none; }

  .poster-cell { width: 65px; }
  .poster-wrap {
    width: 52px; height: 76px; border-radius: 4px; overflow: hidden;
    background: #2a2a2a; display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: #555; text-align: center;
  }
  .poster-wrap img { width: 100%; height: 100%; object-fit: cover; display: none; }
  .poster-wrap img.loaded { display: block; }
  .poster-wrap .fallback-text { font-size: 9px; color: #555; padding: 4px; }

  .title-cell { min-width: 200px; }
  .title-main { font-size: 14px; font-weight: 600; color: #fff; }
  .title-sub  { font-size: 11px; color: #777; margin-top: 2px; }

  .actions-cell { white-space: nowrap; }
  .action-btn {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; border-radius: 4px; padding: 5px 9px;
    cursor: pointer; border: none; transition: all 0.14s;
    margin: 2px 2px 2px 0;
  }

  .btn-folder  { background: #2a2a2a; color: #bbb; }
  .btn-folder:hover  { background: #444; color: #fff; }

  .btn-watched { background: #1a2a1a; color: #6abf69; border: 1px solid #2d4a2d; }
  .btn-watched:hover { background: #2d4a2d; color: #8de08c; }
  tr.watched .btn-watched { background: #3a1a1a; color: #cf6679; border-color: #5a2a2a; }
  tr.watched .btn-watched::before { content: "✓ "; }

  .btn-remove  { background: #1a1a2a; color: #7b9cdb; border: 1px solid #2a2a4a; }
  .btn-remove:hover  { background: #2a2a4a; color: #a0b8f0; }

  #toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(60px);
    background: #333; color: #fff; font-size: 13px;
    padding: 10px 22px; border-radius: 6px; opacity: 0;
    transition: all 0.3s; pointer-events: none; z-index: 999;
    border-left: 3px solid #e50914;
  }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  footer { margin-top: 40px; color: #444; font-size: 11px; padding-top: 20px; border-top: 1px solid #333; }
</style>
</head>
<body class="hide-watched">

<div class="header-row">
  <div>
    <h1>🎬 Asaf's Video Library</h1>
    <div class="subtitle">${FOLDER_PATH} · Updated ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="header-actions">
    <button class="btn-toggle-watched" id="toggleWatched" onclick="toggleWatched()">
      <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
      Show Watched
    </button>
    <button class="btn-refresh" id="refreshBtn" onclick="refreshPosters()">
      <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>
      Refresh Posters
    </button>
  </div>
</div>

<h2>📺 Series <span class="count-badge" id="series-count">${series.length}</span></h2>
<table id="series-table">
  <thead>
    <tr>
      <th class="poster-cell">Poster</th>
      <th>Title</th>
      <th>Folder Path</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
${seriesRows}
  </tbody>
</table>

<h2>🎬 Movies <span class="count-badge" id="movies-count">${movies.length}</span></h2>
<table id="movies-table">
  <thead>
    <tr>
      <th class="poster-cell">Poster</th>
      <th>Title</th>
      <th>Folder Path</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
${moviesRows}
  </tbody>
</table>

<footer>
  <p>🎬 Generated on ${new Date().toLocaleString()} | ${series.length} Series + ${movies.length} Movies</p>
</footer>

<div id="toast"></div>

<script>
const POSTERS = [];
document.querySelectorAll('img[id^="img-"]').forEach(img => {
  POSTERS.push({ id: img.id });
});

async function loadPosters() {
  for (const item of POSTERS) {
    const img = document.getElementById(item.id);
    if (!img) continue;
    const wrap = img.closest('.poster-wrap');
    const span = wrap ? wrap.querySelector('.fallback-text') : null;
    try {
      const title = img.closest('tr').querySelector('.title-main').textContent;
      const r = await fetch(\`https://www.omdbapi.com/?t=\${encodeURIComponent(title)}&apikey=b9bd48a6\`);
      const d = await r.json();
      if (d.Poster && d.Poster !== 'N/A') {
        img.onload = () => { img.classList.add('loaded'); if(span) span.style.display='none'; };
        img.src = d.Poster;
      } else {
        if(span) span.textContent = 'No poster';
      }
    } catch(e) {
      if(span) span.textContent = '—';
    }
  }
}

function refreshPosters() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  POSTERS.forEach(item => {
    const img = document.getElementById(item.id);
    if(!img) return;
    img.classList.remove('loaded');
    img.src = '';
    const wrap = img.closest('.poster-wrap');
    const span = wrap ? wrap.querySelector('.fallback-text') : null;
    if(span) { span.textContent = 'Loading…'; span.style.display = ''; }
  });
  loadPosters().then(() => {
    btn.classList.remove('spinning');
    showToast('Posters refreshed ✓');
  });
}

function openFolder(btn) {
  const row = btn.closest('tr');
  const folder = row.dataset.folder;
  window.open('file:///' + folder.replace(/\\\\\\\\/g, '/'), '_blank');
}

function toggleWatchedRow(btn) {
  const row = btn.closest('tr');
  const id = row.dataset.id;
  const isWatched = row.classList.toggle('watched');
  btn.textContent = isWatched ? '↩ Unwatch' : '👁 Saw This';
  const state = getState();
  isWatched ? state.watched.add(id) : state.watched.delete(id);
  saveState(state);
  updateCounts();
  showToast(isWatched ? 'Marked as watched ✓' : 'Unmarked');
}

function removeRow(btn) {
  const row = btn.closest('tr');
  const id = row.dataset.id;
  row.classList.add('hidden-row');
  const state = getState();
  state.hidden.add(id);
  saveState(state);
  updateCounts();
  showToast('Removed from list');
}

function toggleWatched() {
  const body = document.body;
  const btn = document.getElementById('toggleWatched');
  const hiding = body.classList.toggle('hide-watched');
  btn.classList.toggle('active', !hiding);
  btn.childNodes.forEach(n => { if(n.nodeType === 3) n.textContent = hiding ? ' Show Watched' : ' Hide Watched'; });
}

function updateCounts() {
  ['series','movies'].forEach(section => {
    const table = document.getElementById(section + '-table');
    const badge = document.getElementById(section + '-count');
    if(!table || !badge) return;
    const total = table.querySelectorAll('tbody tr:not(.hidden-row)').length;
    badge.textContent = total;
  });
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function getState() {
  try {
    const raw = JSON.parse(localStorage.getItem('videolib') || '{}');
    return { watched: new Set(raw.watched || []), hidden: new Set(raw.hidden || []) };
  } catch(e) { return { watched: new Set(), hidden: new Set() }; }
}

function saveState(state) {
  try {
    localStorage.setItem('videolib', JSON.stringify({
      watched: [...state.watched],
      hidden: [...state.hidden]
    }));
  } catch(e) {}
}

function applyState() {
  const state = getState();
  document.querySelectorAll('tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    if(state.hidden.has(id)) row.classList.add('hidden-row');
    if(state.watched.has(id)) {
      row.classList.add('watched');
      const btn = row.querySelector('.btn-watched');
      if(btn) btn.textContent = '↩ Unwatch';
    }
  });
  updateCounts();
}

applyState();
loadPosters();
</script>
</body>
</html>`;

// Write HTML file
try {
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`✅ HTML generated successfully!\n`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`\n🎬 Summary:`);
  console.log(`   📺 Series: ${series.length}`);
  console.log(`   🎬 Movies: ${movies.length}`);
  console.log(`   📊 Total: ${folders.length} items`);
  console.log(`\n🌐 Open the HTML file in your browser to view your video library!`);
} catch (err) {
  console.error(`❌ Error writing file: ${err.message}`);
  process.exit(1);
}
