# PGA Leaderboard — Vercel Scaffold (Alias Fix)

This version uses a RELATIVE import in `app/page.jsx`:
```js
import App from "../components/App";
```
and also ships `jsconfig.json` with `@/*` in case you want to use the alias.

## Quick start
```bash
npm i
npm run dev
```

## Deploy
- Push to GitHub → Import on Vercel, or
- `npm i -g vercel && vercel && vercel --prod`
