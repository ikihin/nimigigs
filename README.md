# NimGigs

Bounty / quest / job board Mini App for **Nimiq Pay**.

Sponsors lock rewards (USDT / NIM). Freelancers submit work using **credits**. Winners get paid via Nimiq Pay and earn bonus credits.

## Stack

| Package | Role |
|---------|------|
| `web/` | Vite + React + `@nimiq/mini-app-sdk` (Mini App UI) |
| `server/` | Hono API + in-memory store (swap Postgres later) |

## Quick start

```bash
cd nimigigs
npm install
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:8787  

Demo mode works in a normal browser (mock wallet). Full wallet features need [Nimiq Pay](https://nimiq.dev/mini-apps/load-local-mini-app).

### Demo accounts

After signup, or use seeded demo:

| Email | Password | Notes |
|-------|----------|--------|
| `sponsor@nimigigs.demo` | `demo1234` | Has open listings |
| `talent@nimigigs.demo` | `demo1234` | Has credits |

## Product rules (v1)

- Dual role (Freelance / Sponsor) on one account  
- **4 credits / calendar month** (UTC) — leftover does not stack  
- Submit cost **1 credit**  
- Win → **+1 credit**  
- Referral: **2 valid invites = +1 credit**, max **+5 / month**  
- Multi-winner: 1st / 2nd / 3rd  
- Submit profile: wallet + OAuth Twitter / GitHub (OAuth stubs in scaffold)

## Scripts

```bash
npm run dev          # web + api
npm run build        # production build
npm run dev:web
npm run dev:server
```

## Database (Supabase)

Without Supabase env vars the API uses **in-memory** storage (data resets on restart).

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste & run `supabase/schema.sql`
3. **Project Settings → API** copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
4. Put them in `server/.env` (see `.env.example`)
5. Restart API — log should say `Database: Supabase`

Login/password are stored as **bcrypt hashes** in the `users` table (not plain text).

## OAuth (Twitter / GitHub)

Copy `.env.example` → `server/.env` (or export env vars), then restart the API.

### GitHub

1. [New OAuth App](https://github.com/settings/developers)
2. Homepage: `http://localhost:5173`
3. Callback: `http://localhost:8787/api/v1/oauth/github/callback`
4. Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`

### X / Twitter

1. [Developer Portal](https://developer.x.com/en/portal/dashboard) → OAuth 2.0 app
2. Callback: `http://localhost:8787/api/v1/oauth/twitter/callback`
3. Scopes: `tweet.read` `users.read` `offline.access`
4. Set `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET`

Without keys, Profile still allows **stub** handle linking when `OAUTH_ALLOW_STUB=true`.

## License

MIT
