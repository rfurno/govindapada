# कथा — Histórias com o seu vocabulário

A board of 141 Sanskrit words from the course. Mark the ones you have not memorized and ask for a Portuguese story, poem, or haiku. Each meaning is highlighted. Tap it to see the Sanskrit headword and its tag.

The site runs on Vercel. Pieces live in Supabase. A process on your laptop pulls the queue and writes them with the local Grok CLI. The site does not call the xAI API.

## Run the board

```bash
npm install
npm run dev
```

Without `KATHA_PASSWORD`, development leaves the gate open. Production requires `KATHA_PASSWORD` and `AUTH_SECRET`. Copy `.env.example`.

Without Supabase env vars the board still loads. Criar explains that the library is not configured.

## Library

Apply `supabase/migrations/0001_katha.sql` in the Supabase SQL editor. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` on Vercel and in `.env.local`.

The same combination (mode, type, size, and the words that qualify) is served from a piece already stored. **Gerar outra** queues a new one and keeps the old.

## Generator

On the laptop, in this repo:

```bash
npm run katha-loop
```

That polls once a minute. `--once` handles a single pending request. `XAI_API_KEY` is removed from the environment before `grok -p`. The skill is `.grok/skills/katha/SKILL.md`.

A request stays pending until this process is running. A claim older than 30 minutes returns to the queue. Two failed attempts mark the request as an error.
