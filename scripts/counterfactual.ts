// Counterfactual (7.2): at every recorded timestamp where at least two wrappers of a ticker have a live quote,
// for a $50 buy compare three arms: naive (lowest token price), random (seeded control), Tare (most shares).
// Source: the discovery recorder (direct-pool quotes, on-chain unit). Output: data/counterfactual/summary.json.
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { nyseSessionAt } from '@tare/kernel';

const SRC = process.argv[2] ?? 'data/discovery/e4_session_basis.jsonl';
const BROKEN = 0.05;

interface Row { ticker: string; issuer: string; token: string; stockPrice: string | null; unit: string | null; tokensOut: string | null; quoteUsd: number }
interface Rec { t: string; rows: Row[] }

// mulberry32, seeded per timestamp so the control arm is reproducible
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const sessions: Record<string, { n: number; naive: number[]; random: number[]; tare: number[]; differs: number }> = {};
const lastRef: Record<string, number> = {};
let observations = 0;
const rl = createInterface({ input: createReadStream(SRC) });
for await (const line of rl) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line) as Rec;
  const ts = Date.parse(rec.t);
  const session = nyseSessionAt(ts);
  for (const r of rec.rows) if (r.issuer === 'ONDO' && r.stockPrice) lastRef[r.ticker] = Number(r.stockPrice);
  const byTicker: Record<string, Row[]> = {};
  for (const r of rec.rows) (byTicker[r.ticker] ??= []).push(r);
  for (const [ticker, rows] of Object.entries(byTicker)) {
    const ref = lastRef[ticker];
    const live = rows.flatMap((r) => {
      if (!r.tokensOut || !r.unit) return [];
      const tokens = Number(BigInt(r.tokensOut)) / 1e18;
      const unit = r.issuer === 'XSTOCKS' ? 1 : Number(BigInt(r.unit)) / 1e18;
      const shares = tokens * unit;
      if (shares <= 0) return [];
      // a quote more than 5% from the reference is a broken quote, not a candidate for any arm
      if (ref && Math.abs(r.quoteUsd / shares / ref - 1) > BROKEN) return [];
      return [{ tokens, shares }];
    });
    if (live.length < 2) continue;
    observations++;
    const naive = live.reduce((a, b) => (b.tokens > a.tokens ? b : a)); // lowest USD per token
    const tare = live.reduce((a, b) => (b.shares > a.shares ? b : a));
    const rnd = live[Math.floor(rng(ts % 2147483647 ^ ticker.length)() * live.length)]!;
    const s = (sessions[session] ??= { n: 0, naive: [], random: [], tare: [], differs: 0 });
    s.n++;
    s.naive.push(naive.shares);
    s.random.push(rnd.shares);
    s.tare.push(tare.shares);
    if (naive !== tare) s.differs++;
  }
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : null; };
const bps = (a: number | null, b: number | null) => (a !== null && b !== null && b !== 0 ? (a / b - 1) * 1e4 : null);
const all = { n: 0, naive: [] as number[], random: [] as number[], tare: [] as number[], differs: 0 };
const bySession: Record<string, unknown> = {};
for (const [k, s] of Object.entries(sessions)) {
  all.n += s.n; all.naive.push(...s.naive); all.random.push(...s.random); all.tare.push(...s.tare); all.differs += s.differs;
  bySession[k] = { n: s.n, naiveDiffersFromTare: s.differs, mean: { naive: mean(s.naive), random: mean(s.random), tare: mean(s.tare) }, tareMinusNaiveBps: bps(mean(s.tare), mean(s.naive)), tareMinusRandomBps: bps(mean(s.tare), mean(s.random)) };
}
const out = {
  generatedAt: new Date().toISOString(), source: SRC, quoteUsd: 50, observations,
  arms: { naive: { meanShares: mean(all.naive), medianShares: median(all.naive) }, random: { meanShares: mean(all.random), medianShares: median(all.random) }, tare: { meanShares: mean(all.tare), medianShares: median(all.tare) } },
  naiveDiffersFromTare: all.differs,
  tareMinusNaiveBps: bps(mean(all.tare), mean(all.naive)),
  tareMinusRandomBps: bps(mean(all.tare), mean(all.random)),
  bySession,
  note: 'Direct PancakeSwap quotes only; broken quotes (>5% from the equity reference) excluded from all arms. If Tare does not beat random, this file says so.',
};
mkdirSync('data/counterfactual', { recursive: true });
writeFileSync('data/counterfactual/summary.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({ observations, tareMinusNaiveBps: out.tareMinusNaiveBps, tareMinusRandomBps: out.tareMinusRandomBps, differs: out.naiveDiffersFromTare, sessions: Object.keys(bySession) }));
