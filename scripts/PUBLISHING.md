# Publishing notes

This repo includes a tiny static server (`server.js`) with optional HTTP Basic Auth.

## Goal

Provide a link like:

- http://<SERVER_IP>:9090/

and show:
- `/latest.html`
- `/latest.md`
- `/archive/YYYY-MM-DD-HHMM.html`

## Runtime env

Create `.env` (not committed):

```bash
cp .env.example .env
# For MVP without password:
#   DISABLE_AUTH=1
# For password protection (recommended on public Internet):
#   DISABLE_AUTH=0
#   BASIC_AUTH_USER=...
#   BASIC_AUTH_PASS=...
```

Start:

```bash
set -a; source .env; set +a
node server.js
# visit: http://<SERVER_IP>:9090/
```

## Where generated summaries live

For MVP we can serve from `./public`.

Recommended: serve from a persistent data dir (not git-tracked):

- `/home/admin/.openclaw/data/my-news-assistant/public`

Set `PUBLIC_DIR` accordingly.
