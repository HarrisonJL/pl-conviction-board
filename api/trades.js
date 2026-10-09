// Recent trades across the live Premier League Conviction markets.
//   /api/trades            -> newest trades across every traded PL market
//   /api/trades?event=<id> -> newest trades for one market (used when the live socket fires)
const { mapPool, isPremierLeague, fetchAllConvictions, fetchEventTrades } = require('./_xo');

const byNewest = (a, b) => new Date(b.at) - new Date(a.at);

module.exports = async (req, res) => {
  try {
    const one = req.query?.event;
    if (one) {
      const trades = (await fetchEventTrades(String(one), 10)).sort(byNewest);
      res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10');
      return res.status(200).json({ fetchedAt: new Date().toISOString(), trades });
    }

    const all = await fetchAllConvictions();
    // only markets that have traded can have activity; skips ~2/3 of the calls
    const traded = all.filter((c) => isPremierLeague(c) && Number(c.market?.totalVolumeInUSD) > 0);
    const settled = await mapPool(traded, 6, (c) =>
      fetchEventTrades(c.id, 10).catch(() => [])
    );
    const trades = settled.flat().sort(byNewest).slice(0, 60);

    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    res.status(200).json({ fetchedAt: new Date().toISOString(), marketsScanned: traded.length, trades });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Could not reach XO Market API', detail: String(err.message || err) });
  }
};
