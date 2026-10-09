// One category per market, decided from its title. First matching rule wins, so a market
// can never sit in two boxes (e.g. "FPL points" is FPL, not "table & points").
// Deterministic: the same title always lands in the same category.
// To make it smarter later, replace categorise() with an LLM call and cache the result by
// market id; nothing else in the app needs to change.
const RULES = [
  ['FPL (fantasy)',             /\bFPL\b|\bfantasy\b/i],
  ['Sanctions & deductions',    /\b(sanctions?|deduct\w*|docked|stripped|banned|breach\w*)\b/i],
  ['Managers & sackings',       /\b(sack(ed|ing)?|fired|manager|head coach|coach|interim)\b|lose their job/i],
  ['Transfers & contracts',     /\b(contract|transfer|signs?|signed|signing|loan|joins?|release clause|new deal|extension)\b/i],
  ['Title, table & relegation', /\b(title|relegat\w*|top (four|4|six|6|half)|bottom (three|3)|champions|league table|in the table|points clear|clear at the top|promoted)\b|\bwin the (20\d\d.?\d*)? ?premier league\b/i],
  ['Availability & injuries',   /\b(start(s|ed)?|minutes|injur\w*|play(s|ed)? (at least|more|\d)|play \d)\b|\bstart (a|for)\b/i],
  ['Team & match stats',        /\b(possession|shots?|corners?|clean[- ]sheets?|VAR|concede[sd]?|distance|lowest-scoring|first[- ]half|half-time)\b/i],
  ['Goals & scorers',           /\b(score[sd]?|scorer|goals?|assists?|hat-?trick|brace|penalt(y|ies)|G\/A|outscore|scoring)\b/i],
  ['Results & points',          /\b(win|wins|lose|loss|beat|draw|points?|earn)\b/i],
];

function categorise(title) {
  const t = String(title || '');
  for (const [name, re] of RULES) if (re.test(t)) return name;
  return 'Other';
}

module.exports = { categorise };
