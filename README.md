# my-news-assistant

This repo stores the *human-readable* configuration + long-term preferences/memory notes for 李强’s daily news briefing (assistant name: **hotdog**).

## What it does

- **Every day at 09:00 (Asia/Shanghai)**, push a short briefing to DingTalk group chat
- Focus:
  - **AI** (global)
  - **Global stock-market hot / high-potential companies** (earnings, financing, M&A, product launches, regulation, major moves)
- Default **3 items**, but can exceed when there is a clear market-moving / must-explain event
- Each item includes: title + 1-sentence summary + 1-sentence why-it-matters + source links
- Ends with **@Kuromi**

> Scheduling/execution is handled by OpenClaw cron; this repo is the source-of-truth for preferences.

## Files

- `news_config.yaml` — the briefing preferences

## How to update

1. Edit `news_config.yaml`
2. Commit and push
3. (Optional) Tell the assistant what changed so it can align cron/prompt behavior

## Security

Do **not** store secrets here:
- tokens
- webhook URLs
- private chat IDs

Use your secret manager / environment variables for credentials.
