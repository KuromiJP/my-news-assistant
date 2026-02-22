#!/usr/bin/env node
/* Build public/index.html dashboard
 * Features:
 *  (1) latest preview (titles)
 *  (2) today focus (short conclusion box)
 *  (4) recent archive links
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = process.env.PUBLIC_DIR || '/home/admin/.openclaw/data/my-news-assistant/public';
const tplPath = path.join(__dirname, '..', 'public', 'templates', 'home.html');

function read(p){return fs.readFileSync(p,'utf8');}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

const now = new Date();
const nowStr = now.toISOString().replace('T',' ').slice(0,16) + 'Z';

// LATEST: prefer latest.md if exists (even if not served)
let md = '';
try { md = read(path.join(PUBLIC_DIR, 'latest.md')); } catch {}

// Extract titles from markdown: lines like "## 1) Title"
const titles = (md.match(/^##\s+\d+\)\s+.+$/gm) || [])
  .map(s => s.replace(/^##\s+\d+\)\s+/, '').trim())
  .slice(0, 8);

const latestPreview = titles.length
  ? titles.map((t,i)=>`<a href="/latest.html#item-${i+1}"><b>${i+1}.</b> ${esc(t)}<div class="muted">点击查看该条详情</div></a>`).join('\n')
  : '<div class="note">暂无最新预览（等待下一次生成）。</div>';

// Today focus: lightweight heuristic from analysis blocks
let focus = `建议：今天先从最新摘要里看“政策/监管”“财报/指引”“重大合作/并购”“异常波动的催化”，再判断是否需要加仓/减仓或跟踪。

（后续我会在每次生成时把更像“结论”的 3–5 条写进这里。）`;
if (md) {
  // pick up to 3 sentences containing cues
  const cues = ['关注','重点看','后续','风险','催化','监管','政策','出口管制','财报','指引','订单','交付','并购','融资','估值','Capex'];
  const lines = md.split(/\n/).map(s=>s.trim()).filter(Boolean);
  const picked = [];
  for (const ln of lines) {
    if (!ln.startsWith('- ')) continue;
    if (!ln.includes('影响/评价')) continue;
    const txt = ln.replace(/^-\s*影响\/评价[^：]*：\s*/,'');
    if (cues.some(c=>txt.includes(c))) picked.push(txt);
    if (picked.length >= 4) break;
  }
  if (picked.length) {
    focus = picked.map((t,i)=>`${i+1}) ${t}`).join('\n');
  }
}

// Recent archive: list last N html files
const archiveDir = path.join(PUBLIC_DIR, 'archive');
let recent = [];
try {
  recent = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.html'))
    .filter(f => f !== 'index.html')
    .sort((a,b)=> b.localeCompare(a))
    .slice(0, 10);
} catch {}

const recentHtml = recent.length
  ? recent.map(f=>{
      const label = f.replace(/\.html$/,'');
      return `<a href="/archive/${encodeURIComponent(f)}"><span>${esc(label)}</span><span class="stamp">HTML</span></a>`;
    }).join('\n')
  : '<div class="note">暂无归档</div>';

// latest stamp: from markdown header if present
let latestStamp = '暂无';
const stampMatch = md.match(/^#\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/m);
if (stampMatch) latestStamp = `${stampMatch[1]} ${stampMatch[2]}`;

const tpl = read(tplPath);
const out = tpl
  .replace('{{NOW}}', esc(nowStr))
  .replace('{{LATEST_STAMP}}', esc(latestStamp))
  .replace('{{LATEST_PREVIEW}}', latestPreview)
  .replace('{{TODAY_FOCUS}}', esc(focus))
  .replace('{{RECENT_ARCHIVE}}', recentHtml);

fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), out);
console.log('Wrote', path.join(PUBLIC_DIR, 'index.html'));
