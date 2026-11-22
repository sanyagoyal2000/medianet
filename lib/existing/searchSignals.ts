// SIMULATED: stands in for Media.net's existing system
// SearchSignals: commercial intent by topic (0..1). Used as a pCTR prior by the matcher.

const INTENT: Record<string, number> = {
  Shopping: 0.62,
  "Shopping > Gifts": 0.78,
  "Shopping > Gifts > Holiday": 0.84,
  "Shopping > Gifts > Kids": 0.76,
  "Shopping > Home & Office": 0.66,
  "Shopping > Home & Kitchen": 0.64,
  "Shopping > Electronics": 0.7,
  "Shopping > Electronics > Chargers": 0.72,
  "Shopping > Electronics > Audio": 0.71,
  "Shopping > Electronics > Computers": 0.69,
  "Shopping > Deals": 0.8,
  Travel: 0.55,
  Finance: 0.45,
  News: 0.18,
  Entertainment: 0.2,
};

export function intentScore(topicPath: string): number {
  const parts = topicPath.split(" > ");
  for (let i = parts.length; i > 0; i--) {
    const key = parts.slice(0, i).join(" > ");
    if (INTENT[key] != null) return INTENT[key];
  }
  return 0.3;
}
