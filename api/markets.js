// Aggregates every ACTIVE Premier League Conviction on XO Market.
//
// Why a server-side function instead of calling XO straight from the browser:
//  - /api/convictions returns a stale 0.50 "currentPrice" for many markets; the
//    per-event endpoint carries the real price the XO site shows, which costs one
//    request per market (~70). Cached here, every visitor shares a single fan-out
//    instead of each browser bursting through XO's rate limit (100 req / 10s).
const { getJSON, mapPool, isPremierLeague, fetchAllConvictions } = require('./_xo');
const { categorise } = require('./_categorise');

const CONCURRENCY = 6;

const price = (o) => {
  const n = Number(o.currentPrice) / 1e6;
  return Number.isFinite(n) ? n : null;
};

function shape(c, liveMarket) {
  const m = liveMarket || c.market;
  const creator = c.market?.creator || m?.creator || null;
  const outcomes = [...(m.outcomes || [])]
    .sort((a, b) => a.index - b.index)
    .map((o) => ({ title: o.title, price: price(o) }));
  return {
    id: c.id,
    slug: c.slug, // the slug XO's /event/<slug> page uses
    contractMarketId: String(c.market?.contractMarketId || '').toLowerCase(), // matches the live socket feed
    title: c.title,
    category: categorise(c.title),
    description: c.description ? String(c.description).slice(0, 220) : null,
    image: c.market?.imageUrl || c.metadata?.imageUrl || null,
    creator: creator
      ? {
          id: creator.id,
          username: creator.username,
          avatar: creator.profilePictureUrl || null,
          verified: !!creator.verified,
        }
      : null,
    volume: Number(m.totalVolumeInUSD) || 0,
    createdAt: c.createdAt,
    expiresAt: m.expiresAt || c.market?.expiresAt || null,
    outcomes,
    liveOdds: !!liveMarket,
  };
}

module.exports = async (req, res) => {
  try {
    const all = await fetchAllConvictions();
    const pl = all.filter(isPremierLeague);

    const markets = await mapPool(pl, CONCURRENCY, async (c) => {
      try {
        const ev = await getJSON(`/api/v1/events/slug/${encodeURIComponent(c.slug)}`);
        const live = ev.data?.markets?.[0]?.market;
        return shape(c, live && live.outcomes?.length ? live : null);
      } catch {
        return shape(c, null); // fall back to list data, flagged liveOdds:false
      }
    });

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=90');
    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      totalConvictions: all.length,
      count: markets.length,
      staleOdds: markets.filter((m) => !m.liveOdds).length,
      markets,
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Could not reach XO Market API', detail: String(err.message || err) });
  }
};
