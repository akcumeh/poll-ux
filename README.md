# Pollux

Anonymous, real time tracker of Nigerian political sentiment. Vote support, undecided, or oppose on politicians across all 36 states, comment, and explore live rankings and regional insight. Numbers below the minimum sample are withheld, never invented, and everything a machine wrote is labeled.

Pollux started as [Ope-Dada/poll-ux](https://github.com/Ope-Dada/poll-ux) ([@Ope_Ugo](https://x.com/Ope_Ugo)'s original build, live at [pollux-ng.netlify.app](https://pollux-ng.netlify.app)), announced [here](https://x.com/Ope_Ugo/status/2041219111930212575). This repo is my response to the [Dev.to Weekend Challenge Passion Edition](https://dev.to/akcumeh/pollux-lets-explore-nigerian-political-sentiment-ifo), built on top of Ope's original idea and data model.

## Architecture

A single Vercel deployment serves both halves:

- `src/` is a vanilla TypeScript + Vite frontend. Pages render as template strings, event handlers attach to `window`. No framework.
- `api/` is the backend: Vercel Node serverless functions (`cast-vote`, `moderate-comment`, `remoderate`, `comment-status`, `ai-insights`, `briefing`, `report-comment`). They hold the Supabase service role key and the Gemini key, enforce vote cooldowns and daily limits server side, and are the only thing that ever calls Gemini (`gemini-2.5-flash`, via `@google/genai`).
- Supabase is Postgres plus realtime, nothing else. `supabase/migrations` holds the schema. The client only ever reads tables directly with the anon key; every write goes through `api/`.

`src/lib/constants.ts` is the single source for the minimum-sample thresholds and the cooldown and cache windows. Both the frontend rendering and the `api/` functions import from it, so the About and methodology panels can never drift from what the code enforces. Current values: 10 votes overall and 5 per zone before a percentage shows, 5 comments before the Passion Meter runs, a 60 second cooldown between vote changes, and a 60 second window where a held comment stays visible only to its author.

## Comment moderation

Every comment goes through Gemini before anyone but its author can see it, using a system prompt tuned for English, Nigerian Pidgin, Yoruba, Igbo, and Hausa. Clean comments publish immediately, flagged ones get held. If Gemini itself is unreachable, the comment goes to `pending`, not `approved` and not silently dropped, and:

- the next successful classification anywhere on the site triggers a small sweep that retries the oldest pending comments,
- a Vercel cron hits `/api/remoderate` every 10 minutes as a backstop,
- the author's browser polls `/api/comment-status` for its own pending comments and updates in place once one resolves, no refresh needed,
- everyone else sees a comment go from invisible to live the moment it's approved, over the same realtime channel that already pushes new comments and vote counts.

Nothing is ever auto-published on faith that Gemini would have approved it. If Gemini keeps failing, `notifyModerationDown()` in `api/_lib/notify.ts` emails and/or Telegrams a heads up (rate limited to once an hour), so a quota or billing lapse doesn't sit unnoticed.

## Environment variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: public, read only, used by the browser.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: server only, used by `api/` to write.
- `GEMINI_API_KEY`: server only, from Google AI Studio. Never referenced by client code.
- `CRON_SECRET`: locks `/api/remoderate` so only Vercel's own cron can trigger it.
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ALERT_EMAIL_TO`: optional, email alerts when moderation goes down.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: optional, same alert over Telegram.

## Database

Apply the migrations in `supabase/migrations` in order (SQL editor, or `npx supabase db push` once linked): `0001_init_tables.sql`, `0002_trust_redesign.sql`, `0003_system_alerts.sql`.
