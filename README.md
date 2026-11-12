# कथा — Histórias com o seu vocabulário

A board of 141 Sanskrit words from the course. Mark the ones you have not memorized and ask for a Portuguese story, poem, or haiku. Each meaning is highlighted. Tap it to see the Sanskrit headword and its tag.

The site is [govindapada.vercel.app](https://govindapada.vercel.app). Pieces live in Supabase. A process on your laptop pulls the queue and writes them with the local Grok CLI. The site does not call the xAI API.

While a piece is queued, the page says: “Na fila. A peça aparece quando o gerador pegar o pedido.”

## Run the board locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. Without `KATHA_PASSWORD`, development leaves the gate open. Without the Supabase variables, the board still loads and Criar explains that the library is not configured.

## Sign-in

`KATHA_PASSWORD` is the shared door. Anyone who knows it can mark words and create pieces. There are no separate accounts. It keeps strangers off the public site from filling the laptop queue. Everyone who signs in shares one library.

`AUTH_SECRET` signs the login cookie. Nobody types it. Use a long random string, the same value in `.env.local` and on Vercel:

```bash
openssl rand -base64 32
```

Production requires both. Changing `AUTH_SECRET` signs everybody out.

## Library

`supabase/migrations/0001_katha.sql` is the schema, and it is already applied. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` and on the Vercel project, for Production and Preview.

The same combination (mode, type, size, and the words that qualify) is served from a piece already stored. **Gerar outra** queues a new one and keeps the old.

## Deploy

The Vercel project `govindapada` is linked in `.vercel/` and connected to `rfurno/govindapada`. A push to `main` deploys. `npx vercel --prod` deploys the local folder instead.

The four variables on that project are `KATHA_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SECRET_KEY`.

## Generator

On the laptop, in this repo:

```bash
npm run katha-loop
```

Restart it after changing this script. It polls every 30 seconds. `--once` handles a single pending request. `--interval 10s` is the fastest poll; `--interval 1m` slows it.

Generation uses `grok-4.7-build-fast` with reasoning effort `low`, web search off, and subagents off. If `GROK_MODEL` or `GROK_EFFORT` are unset, those defaults apply. Check the current shell with `echo "$GROK_MODEL"`. A blank line means unset. Other models on this CLI are `grok-4.7`, `grok-4.6`, and `grok-4.5`. Effort is `low`, `medium`, `high`, or `xhigh`.

```bash
export GROK_MODEL=grok-4.7
export GROK_EFFORT=medium
```

The script reads `.env.local` when that file is present, and removes `XAI_API_KEY` before `grok -p`. The skill is `.grok/skills/katha/SKILL.md`.

A request stays pending until this process is running. A claim older than 30 minutes returns to the queue. Two failed attempts mark the request as an error.
