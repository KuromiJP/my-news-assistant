#!/usr/bin/env node
/*
  Render a briefing markdown into card-style HTML using public/templates/briefing.html.

  Usage:
    PUBLIC_DIR=/path/to/public node scripts/render_from_md.js \
      --md latest.md --out latest.html --h1 "hotdog · 最新新闻摘要" --meta "GLOBAL · AI + hot stocks" \
      --title "hotdog · 最新新闻摘要"

  Notes:
    - Parses sections like:
        ## 1) Title
        - 摘要：...
        - 影响/评价...：...
        - 来源：
          - https://...
*/

const fs = require('fs');
const path = require('path');

function arg(name, def=null){
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i+1] ?? def;
}

const PUBLIC_DIR = process.env.PUBLIC_DIR || '/home/admin/.openclaw/data/my-news-assistant/public';
const mdRel = arg('--md');
const outRel = arg('--out');
if (!mdRel || !outRel) {
  console.error('Missing --md or --out');
  process.exit(1);
}

const H1 = arg('--h1', 'hotdog · 新闻摘要');
const META = arg('--meta', '');
const TITLE = arg('--title', H1);

const mdPath = path.isAbsolute(mdRel) ? mdRel : path.join(PUBLIC_DIR, mdRel);
const outPath = path.isAbsolute(outRel) ? outRel : path.join(PUBLIC_DIR, outRel);
const tplPath = path.join(__dirname, '..', 'public', 'templates', 'briefing.html');

function read(p){return fs.readFileSync(p,'utf8');}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

// Highlight important keywords in the analysis block.
// Configure via env: HIGHLIGHT_WORDS (comma-separated)
const DEFAULT_HIGHLIGHTS = [
  '关注', '重点看', '后续', '风险', '利好', '利空', '催化', '不确定性',
  '监管', '政策', '出口管制', '合规', '反垄断',
  '财报', '指引', 'Capex', '订单', '交付', '良率',
  '并购', '融资', '估值', '供给', '需求', '价格', '毛利'
];
const HIGHLIGHT_WORDS = (process.env.HIGHLIGHT_WORDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const HIGHLIGHTS = (HIGHLIGHT_WORDS.length ? HIGHLIGHT_WORDS : DEFAULT_HIGHLIGHTS)
  .filter(Boolean);

function highlight(text){
  if (!text) return '';
  // Escape first, then inject spans (safe because we only add our own tags)
  let out = esc(text);
  // Longest first to avoid partial overlaps
  const words = [...new Set(HIGHLIGHTS)].sort((a,b)=> b.length - a.length);
  for (const w of words) {
    const re = new RegExp(escRe(esc(w)), 'g');
    out = out.replace(re, `<span class="hl">${esc(w)}</span>`);
  }
  return out;
}

const md = read(mdPath);
const tpl = read(tplPath);

// Extract generated time (last line like: 生成时间：...)
let generatedAt = '';
const genMatch = md.match(/生成时间：(.+)$/m);
if (genMatch) generatedAt = genMatch[1].trim();

const itemBlocks = md.split(/\n##\s+\d+\)\s+/).slice(1);
const headings = (md.match(/\n##\s+\d+\)\s+.+/g) || []).map(s => s.replace(/^\n##\s+\d+\)\s+/,'').trim());

const items = itemBlocks.map((block, idx) => {
  const title = headings[idx] || `Item ${idx+1}`;
  const summary = (block.match(/\n-\s*摘要：\s*([^\n]+)/) || [,''])[1].trim();
  // accept either 影响/评价（hotdog） or 影响/评价
  const analysis = (block.match(/\n-\s*影响\/评价[^：]*：\s*([\s\S]*?)(\n-\s*来源：|\n---|$)/) || [,''])[1].trim();
  const srcSection = (block.match(/\n-\s*来源：\s*\n([\s\S]*?)(\n\n##\s+|\n---|$)/) || [,''])[1];
  const urls = (srcSection || '').split(/\n/)
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^-\s+/,'').trim())
    .filter(u => /^https?:\/\//.test(u));

  return { title, summary, analysis, urls };
});

const itemsHtml = items.map((it, i) => {
  const urlsHtml = it.urls.length
    ? `<div class="section sources"><div class="label">来源</div><ul>` + it.urls.map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></li>`).join('') + `</ul></div>`
    : '';

  const summaryHtml = it.summary ? `<div class="section summary"><div class="label">摘要</div><div>${esc(it.summary)}</div></div>` : '';
  const analysisHtml = it.analysis ? `<div class="section analysis"><div class="label">评价 / 影响分析</div><div>${highlight(it.analysis)}</div></div>` : '';

  return `\n<div class="item">` +
    `<h2 class="item-title">${i+1}. ${esc(it.title)}</h2>` +
    summaryHtml +
    analysisHtml +
    urlsHtml +
    `</div>`;
}).join('\n');

const html = tpl
  .replaceAll('{{TITLE}}', esc(TITLE))
  .replaceAll('{{H1}}', esc(H1))
  .replaceAll('{{META}}', esc(META))
  .replaceAll('{{ITEMS_HTML}}', itemsHtml || '<div class="small">暂无内容</div>')
  .replaceAll('{{GENERATED_AT}}', esc(generatedAt || new Date().toISOString()));

fs.writeFileSync(outPath, html);
console.log('Wrote', outPath);
