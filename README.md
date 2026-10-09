# PL Conviction Board

An unofficial dashboard of every live **Premier League Conviction** market on [XO Market](https://beta.xo.market): odds, creator, volume, countdowns to expiry, a closing calendar and a live trades feed. Markets by TheBallQuant are pinned to the top.

> **Not an official XO Market affiliate.** Independent fan-made project; not affiliated with or endorsed by XO Market, SenseLabs or the Premier League. Not financial advice.

Live site: https://pl-conviction-board.vercel.app

## How it works

- `index.html`: the whole front end (no build step).
- `api/markets.js`: fetches XO's public convictions list, keeps the Premier League category, then fetches each market's real price (the list endpoint returns stale 0.50 prices). Cached at the edge for 30s.
- `api/trades.js`: recent trades for the traded markets; the browser also listens to XO's live socket feed.
- `api/_xo.js`, `api/_categorise.js`: shared API helpers and the one-category-per-market classifier.

Data comes from XO Market's public API (`https://api-mainnet.xo.market`).

## Deploy

```bash
npx vercel deploy --prod
```

No environment variables are needed.
