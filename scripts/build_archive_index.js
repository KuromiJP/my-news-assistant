#!/usr/bin/env node
/* Build /archive/index.html from existing archive/*.html
 * No deps.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = process.env.PUBLIC_DIR || '/home/admin/.openclaw/data/my-news-assistant/public';
const ARCHIVE_DIR = path.join(PUBLIC_DIR, 'archive');
const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'archive_index.html');

function read(p){return fs.readFileSync(p,'utf8');}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

const tpl = read(TEMPLATE_PATH);
let files = [];
try {
  files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => f !== 'index.html')
    .sort((a,b)=> b.localeCompare(a));
} catch (e) {
  console.error('Archive dir missing:', ARCHIVE_DIR);
  process.exit(1);
}

const links = files.map(f=>{
  const label = f.replace(/\.html$/,'');
  return `<a href="/archive/${encodeURIComponent(f)}"><span>${esc(label)}</span><span class="stamp">HTML</span></a>`;
}).join('\n');

const out = tpl.replace('{{ARCHIVE_LINKS}}', links || '<div class="small">暂无归档</div>');
fs.writeFileSync(path.join(ARCHIVE_DIR, 'index.html'), out);
console.log('Wrote', path.join(ARCHIVE_DIR, 'index.html'));
