#!/usr/bin/env node
/*
  Minimal static server with HTTP Basic Auth.
  - No external deps.
  - Serves files from PUBLIC_DIR (default: ./public)

  ENV:
    PORT=8080
    BASIC_AUTH_USER=...
    BASIC_AUTH_PASS=...
    PUBLIC_DIR=... (optional)
*/

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8080', 10);
const USER = process.env.BASIC_AUTH_USER || '';
const PASS = process.env.BASIC_AUTH_PASS || '';
const DISABLE_AUTH = (process.env.DISABLE_AUTH || '').toLowerCase() === '1' || (process.env.DISABLE_AUTH || '').toLowerCase() === 'true';
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, 'public'));

const AUTH_ENABLED = !DISABLE_AUTH && USER && PASS;
if (!AUTH_ENABLED) {
  console.warn('[my-news-assistant] WARNING: Basic Auth is DISABLED (set BASIC_AUTH_USER/BASIC_AUTH_PASS to enable, or DISABLE_AUTH=0).');
}

function unauthorized(res) {
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="my-news-assistant"' });
  res.end('Authentication required.');
}

function isAuthed(req) {
  if (!AUTH_ENABLED) return true;
  const hdr = req.headers['authorization'];
  if (!hdr || !hdr.startsWith('Basic ')) return false;
  const b64 = hdr.slice('Basic '.length);
  const raw = Buffer.from(b64, 'base64').toString('utf8');
  const [u, p] = raw.split(':');
  return u === USER && p === PASS;
}

function safeJoin(base, reqPath) {
  // prevent directory traversal
  const p = decodeURIComponent(reqPath.split('?')[0]);
  const cleaned = p.replace(/\\/g, '/');
  const joined = path.resolve(base, '.' + cleaned);
  if (!joined.startsWith(base)) return null;
  return joined;
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.md') return 'text/markdown; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  return 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  if (!isAuthed(req)) return unauthorized(res);

  const urlPath = req.url === '/' ? '/index.html' : req.url;
  // User preference: only serve HTML (hide .md endpoints)
  if (urlPath.toLowerCase().endsWith('.md')) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const filePath = safeJoin(PUBLIC_DIR, urlPath);
  if (!filePath) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  fs.stat(filePath, (err, st) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    if (st.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      fs.readFile(idx, (e2, buf) => {
        if (!e2) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(buf);
        }
        // No index.html: generate a simple directory listing
        fs.readdir(filePath, { withFileTypes: true }, (e3, entries) => {
          if (e3) {
            res.writeHead(403);
            return res.end('Forbidden');
          }
          const baseUrl = req.url.endsWith('/') ? req.url : req.url + '/';
          const items = entries
            .filter(d => d.name !== '.DS_Store')
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(d => {
              const slash = d.isDirectory() ? '/' : '';
              const name = d.name + slash;
              const href = baseUrl + encodeURIComponent(d.name) + slash;
              return `<li><a href="${href}">${name}</a></li>`;
            })
            .join('\n');
          const html = `<!doctype html><meta charset="utf-8"><title>Index of ${baseUrl}</title>` +
            `<h1>Index of ${baseUrl}</h1><ul>` +
            `<li><a href="../">../</a></li>` + items +
            `</ul>`;
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(html);
        });
      });
      return;
    }

    fs.readFile(filePath, (e2, buf) => {
      if (e2) {
        res.writeHead(500);
        return res.end('Error');
      }
      res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[my-news-assistant] Serving ${PUBLIC_DIR} on http://0.0.0.0:${PORT} (${AUTH_ENABLED ? 'basic auth enabled' : 'NO AUTH'})`);
});
