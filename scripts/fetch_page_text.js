#!/usr/bin/env node
/**
 * Fetch readable page text using Playwright (Chromium).
 *
 * Why: many news pages are JS-rendered; curl won't capture content.
 *
 * Usage:
 *   node scripts/fetch_page_text.js --url https://example.com
 *
 * Env:
 *   CHROMIUM_PATH=/usr/bin/chromium  (optional)
 *   TIMEOUT_MS=30000
 */

import { chromium } from 'playwright';

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] ?? def;
}

const url = arg('--url');
if (!url) {
  console.error('Missing --url');
  process.exit(1);
}

const timeoutMs = parseInt(process.env.TIMEOUT_MS || '30000', 10);
let executablePath = process.env.CHROMIUM_PATH || undefined;
if (!executablePath) {
  // Prefer system-installed Chromium on RHEL-like distros
  const candidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  for (const p of candidates) {
    try {
      if (p && await (await import('fs')).promises.stat(p)) { executablePath = p; break; }
    } catch {}
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});

const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  // Give client JS a moment if needed
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const title = document.title || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || location.href;

    // Prefer <article>
    const article = document.querySelector('article');
    const root = article || document.body;

    // Remove obvious noise
    for (const sel of ['script', 'style', 'noscript', 'header', 'footer', 'nav', 'aside']) {
      root.querySelectorAll(sel).forEach(n => n.remove());
    }

    const text = (root.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    return { title, canonical, text };
  });

  // Print as JSON (easy to post-process)
  process.stdout.write(JSON.stringify(data, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}
