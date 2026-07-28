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

## License

MIT
