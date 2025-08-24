# PGA Leaderboard — Vercel Scaffold

This is a ready-to-deploy Next.js (App Router) + Tailwind project for your Fantasy Draft Order leaderboard.

## Quick start

```bash
npm i
npm run dev
# open http://localhost:3000
```

Paste your Canvas code into `components/App.jsx` (replace the stub), then:

```bash
npm run build
npm start
```

## Deploy to Vercel (2 ways)

### A) Import repo
1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new and **Import Project**.
3. Framework: **Next.js** (auto-detected). No env vars required.
4. Deploy.

### B) Vercel CLI
```bash
npm i -g vercel
vercel
# answer prompts (defaults are fine)
```

## ESPN Proxy (optional but recommended)
The app includes an Edge function at `/api/espn?target=leaderboard|scoreboard` that relays ESPN JSON to avoid CORS and add caching.
In your UI, fetch:
- `/api/espn?target=leaderboard`
- `/api/espn?target=scoreboard`

## Notes
- Uses Next.js 14 App Router, React 18, Tailwind 3.
- No environment variables needed.
- Adjust caching in `app/api/espn/route.js` during tournaments.
- For audio on iOS, trigger/resume `AudioContext` on a user gesture (click/tap).
