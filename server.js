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
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, 'public'));

if (!USER || !PASS) {
  console.error('[my-news-assistant] Missing BASIC_AUTH_USER/BASIC_AUTH_PASS env vars. Refusing to start.');
  process.exit(1);
}

function unauthorized(res) {
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="my-news-assistant"' });
  res.end('Authentication required.');
}

function isAuthed(req) {
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
        if (e2) {
          res.writeHead(403);
          return res.end('Forbidden');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buf);
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
  console.log(`[my-news-assistant] Serving ${PUBLIC_DIR} on http://0.0.0.0:${PORT} (basic auth enabled)`);
});
