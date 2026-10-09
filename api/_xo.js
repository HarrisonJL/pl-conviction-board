// Shared helpers for the XO Market public API (files starting with "_" are not routed by Vercel).
const API = 'https://api-mainnet.xo.market';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; pl-conviction-board/1.0; unofficial)',
  Accept: 'application/json',
};
const PREMIER_LEAGUE_CATEGORY_ID = 27;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(path, attempt = 0) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(API + path, { headers: HEADERS, signal: ctl.signal });
    if (res.status === 429 && attempt < 3) {
      await sleep(1200 * (attempt + 1));
      return getJSON(path, attempt + 1);
    }
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })
  );
  return out;
}

const isPremierLeague = (c) =>
  (c.market?.categoryPath || []).some(
    (p) => p.id === PREMIER_LEAGUE_CATEGORY_ID || p.slug === 'premier-league'
  );

async function fetchAllConvictions() {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    const d = await getJSON(`/api/convictions?page=${page}&take=100`);
    rows.push(...(d.data || []));
    if (!d.meta?.hasNextPage) break;
  }
  return rows;
}

// Turns one XO activity row into the compact shape the dashboard uses.
function shapeTrade(a) {
  const price = Number(a.priceAtExecution) / 1e6;
  return {
    id: a.id,
    tx: a.transactionHash || null,
    at: a.executedAt || a.createdAt,
    type: a.activityType,                 // USER_TRADE, ...
    side: a.positionType,                 // BUY | SELL
    outcome: a.outcome?.title || null,
    price: Number.isFinite(price) ? price : null,
    usd: Number(a.volumeInUSD) || 0,
    user: a.user ? { username: a.user.username, avatar: a.user.profilePictureUrl || null } : null,
    eventId: a.market?.eventId || null,
    slug: a.market?.eventSlug || null,
    title: a.market?.title || null,
  };
}

async function fetchEventTrades(eventId, take = 10) {
  const d = await getJSON(
    `/api/v1/events/${encodeURIComponent(eventId)}/activity?page=1&take=${take}&sortBy=executedAt&sortOrder=DESC`
  );
  return (d.data || []).map(shapeTrade);
}

module.exports = { getJSON, mapPool, isPremierLeague, fetchAllConvictions, fetchEventTrades };
