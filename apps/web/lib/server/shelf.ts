import 'server-only';
import { PublicRwaClient, type MarketStatus, type RwaDynamic } from '@tare/binance';
import {
  USDT,
  WRAPPERS,
  directRoutes,
  makeClient,
  readUnit,
  registryIndex,
  tickerIdOf,
  wrappersFor,
  TICKERS,
  type WrapperRecord,
} from '@tare/registry';
import {
  BROKEN_QUOTE_THRESHOLD,
  WAD,
  decompose,
  readSession,
  referenceIsLive,
  sharesFor,
  sharesPerToken,
  tokens as tokensBrand,
  usd as usdBrand,
  effectiveUsdPerShare,
  usdPerShare,
  usdPerToken,
  wadFromDecimal,
  type SessionRead,
} from '@tare/kernel';

const rwa = new PublicRwaClient({ origin: process.env.BINANCE_API_ORIGIN });
export const chain = makeClient(process.env.BSC_RPC_URL);

export type Degradation = { kind: 'UNREACHABLE' | 'GEO_BLOCKED' | 'AUTH' | 'RATE_LIMITED' | 'BODY_ERROR' | 'MALFORMED'; message: string };

export interface WrapperView {
  symbol: string;
  token: `0x${string}`;
  issuer: WrapperRecord['issuer'];
  registryIndex: number;
  contractReceive: WrapperRecord['contractReceive'];
  unitWad: string | null;
  unitPaused: boolean | null;
  unitError: string | null;
  apiTokenPriceUsd: string | null;
  apiMultiplier: string | null;
  apiMultiplierMatchesChain: boolean | null;
  /** best direct-pool route at the quote size */
  quote: null | { venue: string; pool: string | null; tokensOutWad: string; sharesWad: string; usdPerShare: string; netVsReferenceBps: number | null; brokenQuote: boolean };
  /** explains a missing quote: no pool, or only an RFQ route */
  quoteNote: string | null;
  deepestPoolUsd: number | null;
  icon: string | null;
}

export interface ShelfView {
  ticker: string;
  tickerId: `0x${string}`;
  quoteUsd: number;
  session: SessionRead;
  referenceUsdPerShare: string | null;
  referenceNote: string;
  wrappers: WrapperView[];
  /** registry index of the wrapper that delivers the most shares for the quote size, if any is not broken */
  bestIndex: number | null;
  degraded: Degradation | null;
  asOf: string;
  block: string | null;
}

const cache = new Map<string, { at: number; v: unknown }>();
async function memo<T>(key: string, ttlMs: number, f: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as T;
  const v = await f();
  cache.set(key, { at: Date.now(), v });
  return v;
}

export const marketStatus = (): Promise<MarketStatus | Degradation> =>
  memo('market', 15_000, async () => {
    const r = await rwa.marketStatus();
    if (r.ok) return r.data;
    return 'degraded' in r ? { kind: r.degraded.kind, message: r.degraded.message } : { kind: 'BODY_ERROR' as const, message: 'no market status' };
  });

export async function currentSession(): Promise<SessionRead & { degraded: Degradation | null }> {
  const m = await marketStatus();
  if ('kind' in m) return { ...readSession(Date.now(), null), degraded: m };
  return {
    ...readSession(Date.now(), { marketStatus: m.marketStatus, openState: m.openState, reasonCode: m.reasonCode, reasonMsg: m.reasonMsg, nextOpenTime: m.nextOpenTime }),
    degraded: null,
  };
}

async function dynamicFor(token: string): Promise<RwaDynamic | Degradation | null> {
  return memo(`dyn:${token}`, 20_000, async () => {
    const r = await rwa.dynamic(token);
    if (r.ok) return r.data;
    if ('notFound' in r) return null;
    return { kind: r.degraded.kind, message: r.degraded.message };
  });
}

export async function getShelf(ticker: string, quoteUsd = 50): Promise<ShelfView | null> {
  const T = ticker.toUpperCase();
  const ws = wrappersFor(T);
  if (ws.length === 0) return null;
  return memo(`shelf:${T}:${quoteUsd}`, 20_000, async () => {
    const session = await currentSession();
    let degraded: Degradation | null = session.degraded;
    const block = await chain.getBlockNumber().catch(() => null);

    const dyns = await Promise.all(ws.map((w) => dynamicFor(w.token)));
    const ondoIdx = ws.findIndex((w) => w.issuer === 'ONDO');
    const ondoDyn = ondoIdx >= 0 ? dyns[ondoIdx] : null;
    let referenceUsdPerShare: bigint | null = null;
    let referenceNote = 'No equity reference is exposed for this ticker.';
    if (ondoDyn && 'stockPrice' in ondoDyn && ondoDyn.stockPrice) {
      referenceUsdPerShare = wadFromDecimal(ondoDyn.stockPrice);
      referenceNote = referenceIsLive(session)
        ? 'Equity reference from the Ondo equity feed, live.'
        : `Equity reference from the Ondo equity feed. New York is closed; it is ${Math.round(session.referenceAgeSec / 3600)}h old.`;
    } else if (ondoDyn && 'kind' in ondoDyn) {
      degraded = degraded ?? ondoDyn;
      referenceNote = 'The reference could not be read: the data source is unreachable.';
    }

    const views: WrapperView[] = [];
    await Promise.all(
      ws.map(async (w, i) => {
        const dyn = dyns[i];
        let unit: bigint | null = null;
        let paused: boolean | null = null;
        let unitError: string | null = null;
        try {
          const u = await readUnit(chain, w);
          unit = u.unit;
          paused = u.paused;
        } catch (e) {
          unitError = e instanceof Error ? e.message.split('\n')[0] ?? 'read failed' : 'read failed';
        }
        const apiMult = dyn && 'sharesMultiplier' in dyn ? dyn.sharesMultiplier : null;
        const apiPrice = dyn && 'tokenPrice' in dyn ? dyn.tokenPrice : null;
        let apiMatches: boolean | null = null;
        if (apiMult && unit !== null && w.issuer !== 'XSTOCKS') apiMatches = Math.abs(Number(wadFromDecimal(apiMult) - unit)) < 1e3;

        let quote: WrapperView['quote'] = null;
        let quoteNote: string | null = null;
        if (unit !== null) {
          const routes = await directRoutes(chain, {
            tokenIn: USDT, tokenOut: w.token, amountIn: wadFromDecimal(String(quoteUsd)), recipient: w.token, deadline: BigInt(Math.floor(Date.now() / 1000) + 300),
          }).catch(() => []);
          const top = routes[0];
          if (top) {
            const sh = sharesFor(tokensBrand(top.amountOut), sharesPerToken(unit));
            const ups = effectiveUsdPerShare(usdBrand(wadFromDecimal(String(quoteUsd))), tokensBrand(top.amountOut), sharesPerToken(unit));
            const net = referenceUsdPerShare ? ((ups * WAD) / referenceUsdPerShare) - WAD : null;
            quote = {
              venue: top.venue, pool: null, tokensOutWad: top.amountOut.toString(), sharesWad: sh.toString(), usdPerShare: ups.toString(),
              netVsReferenceBps: net === null ? null : Number((net * 10000n) / WAD),
              brokenQuote: net !== null && (net < 0n ? -net : net) > BROKEN_QUOTE_THRESHOLD,
            };
          } else {
            quoteNote = w.issuer === 'ONDO' ? 'Ondo names fill by owner-signed RFQ through the aggregator; no direct pool has depth.' : 'No direct pool route.';
          }
        }
        views.push({
          symbol: w.symbol, token: w.token, issuer: w.issuer, registryIndex: registryIndex(w), contractReceive: w.contractReceive,
          unitWad: unit?.toString() ?? null, unitPaused: paused, unitError,
          apiTokenPriceUsd: apiPrice, apiMultiplier: apiMult, apiMultiplierMatchesChain: apiMatches,
          quote, quoteNote, deepestPoolUsd: w.deepestDirectPool?.reserveUsd ?? null,
          icon: null,
        });
      }),
    );
    views.sort((a, b) => a.registryIndex - b.registryIndex);

    const live = views.filter((v) => v.quote && !v.quote.brokenQuote && v.unitPaused === false);
    const best = live.sort((a, b) => (BigInt(b.quote!.sharesWad) > BigInt(a.quote!.sharesWad) ? 1 : -1))[0];

    return {
      ticker: T, tickerId: tickerIdOf(T), quoteUsd, session,
      referenceUsdPerShare: referenceUsdPerShare?.toString() ?? null, referenceNote, wrappers: views,
      bestIndex: best ? best.registryIndex : null, degraded, asOf: new Date().toISOString(), block: block?.toString() ?? null,
    } satisfies ShelfView;
  });
}

export const allTickers = (): string[] => TICKERS;
export { WRAPPERS, decompose, usdPerShare, usdPerToken };
