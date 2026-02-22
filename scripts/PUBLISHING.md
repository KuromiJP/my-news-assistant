# Publishing notes

This repo includes a tiny basic-auth static server (`server.js`).

## Goal

Provide a link like:

- http://<SERVER_IP>:8080/

and show:
- `/latest.html`
- `/latest.md`
- `/archive/YYYY-MM-DD-HHMM.html`

## Runtime env

Create `.env` (not committed):

```bash
cp .env.example .env
# edit BASIC_AUTH_USER/BASIC_AUTH_PASS
```

Start:

```bash
set -a; source .env; set +a
node server.js
```

## Where generated summaries live

For MVP we can serve from `./public`.

Recommended: serve from a persistent data dir (not git-tracked):

- `/home/admin/.openclaw/data/my-news-assistant/public`

Set `PUBLIC_DIR` accordingly.
