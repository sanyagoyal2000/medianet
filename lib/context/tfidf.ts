// Small TF-IDF implementation used for relevance (page text vs. brief) and the
// "Semantic representation" panel. Deterministic and dependency-free.

const STOP = new Set(
  "a an and are as at be but by for from has have i if in into is it its of on or our so than that the their them then there these they this to was we were what when which who will with you your not no can more most all also just one out up about over only very new how get got do does".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function tf(tokens: string[]) {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  const n = tokens.length || 1;
  for (const [k, v] of m) m.set(k, v / n);
  return m;
}

export class TfIdf {
  private idf = new Map<string, number>();
  constructor(docs: string[]) {
    const N = docs.length || 1;
    const df = new Map<string, number>();
    for (const d of docs) for (const t of new Set(tokenize(d))) df.set(t, (df.get(t) ?? 0) + 1);
    for (const [t, c] of df) this.idf.set(t, Math.log((N + 1) / (c + 1)) + 1);
  }
  vector(text: string) {
    const v = new Map<string, number>();
    for (const [t, f] of tf(tokenize(text))) v.set(t, f * (this.idf.get(t) ?? Math.log(2) + 1));
    return v;
  }
  cosine(a: string, b: string) {
    const va = this.vector(a), vb = this.vector(b);
    let dot = 0, na = 0, nb = 0;
    for (const [, x] of va) na += x * x;
    for (const [t, y] of vb) {
      nb += y * y;
      const x = va.get(t);
      if (x) dot += x * y;
    }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }
  topTerms(text: string, k = 8) {
    return [...this.vector(text)].sort((a, b) => b[1] - a[1]).slice(0, k).map(([term, w]) => ({ term, weight: Number(w.toFixed(3)) }));
  }
}

/** Fake 8-dimension embedding preview (illustrative only): a stable hash of the top terms. */
export function illustrativeVector(text: string, idx: TfIdf) {
  const terms = idx.topTerms(text, 16);
  const v = Array.from({ length: 8 }, () => 0);
  terms.forEach(({ term, weight }) => {
    let h = 0;
    for (const c of term) h = (h * 31 + c.charCodeAt(0)) | 0;
    v[Math.abs(h) % 8] += weight * (h % 2 === 0 ? 1 : -1);
  });
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number((x / norm).toFixed(3)));
}
