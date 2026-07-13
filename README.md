# Pollux

Anonymous, real time tracker of Nigerian political sentiment. Vote support, undecided, or oppose on politicians across all 36 states, comment, and explore live rankings and regional insight. Numbers below the minimum sample are withheld, never invented, and everything a machine wrote is labeled.

## Architecture

A single Vercel deployment serves both halves:

- `src/` is a vanilla TypeScript + Vite frontend. Pages render as template strings, event handlers attach to `window`. No framework.
- `api/` is the backend: Vercel Node serverless functions (`cast-vote`, `moderate-comment`, `ai-insights`, `briefing`, `report-comment`). They hold the Supabase service role key and the Gemini key, enforce vote cooldowns and daily limits server side, and are the only thing that ever calls Gemini (`gemini-2.5-flash`, via `@google/genai`).
- Supabase is Postgres plus realtime, nothing else. `supabase/migrations` holds the schema. The client only ever reads tables directly with the anon key; every write goes through `api/`.

`src/lib/constants.ts` is the single source for the minimum-sample thresholds (20 votes overall, 20 per zone, 5 comments for AI) and the cooldown and cache windows. Both the frontend rendering and the `api/` functions import from it, so the methodology panel can never drift from what the code enforces.

## Environment variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: public, read only, used by the browser.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: server only, used by `api/` to write.
- `GEMINI_API_KEY`: server only, from Google AI Studio. Never referenced by client code.

## Database

Apply `supabase/migrations/0001_init_tables.sql` then `0002_trust_redesign.sql` to a Supabase project (SQL editor, or `npx supabase db push` once linked).
