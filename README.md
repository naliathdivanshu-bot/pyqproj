# PYQ Predictor

Paste previous year questions (PYQs) for any class, subject or batch, and get:
- an AI-predicted question paper
- topic-wise breakdown of all questions
- a ranked list of highly-predicted questions

**Engine:** Anthropic Claude API (called securely from a server route, not the browser)
**Storage:** Supabase (Postgres) — every analysis is saved to a `pyq_sessions` table
**Hosting:** Vercel

---

## 1. Push this project to GitHub

```bash
cd pyq-predictor
git init
git add .
git commit -m "Initial commit: PYQ Predictor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pyq-predictor.git
git push -u origin main
```

(Create the empty `pyq-predictor` repo on github.com first, under your account, before running the last two commands.)

## 2. Set up Supabase (storage)

1. Go to [supabase.com](https://supabase.com) → create a new project.
2. Once it's ready, open **SQL Editor** → paste the contents of `supabase/schema.sql` from this repo → **Run**. This creates the `pyq_sessions` table.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (under "Project API keys", click reveal) → this is `SUPABASE_SERVICE_ROLE_KEY`. **Keep this secret** — never put it in client-side code, only in Vercel's environment variables.

## 3. Get an Anthropic API key (engine)

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) → create a key.
2. This becomes `ANTHROPIC_API_KEY`.

## 4. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo you just pushed.
2. Before deploying, add these Environment Variables (Project Settings → Environment Variables):
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click **Deploy**. Vercel builds and hosts the site — you'll get a live `.vercel.app` URL.

## Running locally (optional)

```bash
npm install
cp .env.example .env.local   # then fill in your real keys
npm run dev
```

Open http://localhost:3000

## Project structure

```
app/
  page.js              → the UI (form + 3 result tabs)
  layout.js            → fonts + page shell
  globals.css          → all styling
  api/analyze/route.js → POST: calls Claude, saves to Supabase, returns result
                          GET: returns your 10 most recent sessions
  api/session/[id]/route.js → GET: fetches one full saved session
lib/
  supabaseAdmin.js     → server-only Supabase client (uses service role key)
supabase/
  schema.sql           → run this once in Supabase's SQL editor
```

## Notes

- The `pyq_sessions` table has Row Level Security **enabled with no public policies** — only your server route (using the service role key) can read/write it. This keeps everyone's pasted PYQs private by default.
- If you want a "my past papers" page for users to browse their own history, that needs a login system (e.g. Supabase Auth) added on top of this — happy to help wire that in next.
