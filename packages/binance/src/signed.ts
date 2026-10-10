import { createHmac } from 'node:crypto';
import { classify, type RawEnvelope, type Result } from './result';

/** Keyed Binance Web3 API (HMAC-SHA256). Base URL carries the fixed /build prefix, which is also signed. */
export interface SignedClientOptions {
  apiKey: string;
  secretKey: string;
  origin?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}

export interface QuoteRoute {
  quoteId: string;
  vendorName: string | null;
  executionMode: 'SWAP' | 'RFQ' | string;
  toTokenAmount: string;
  approveTarget: string | null;
  raw: Record<string, unknown>;
}

export interface BuiltSwap {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string | null;
  gasPrice: string | null;
}

export interface Simulation {
  status: string | null;
  raw: Record<string, unknown>;
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null);

export const BUILD_PREFIX = '/build';

/** Exposed for tests: the pre-hash string is timestamp + METHOD + requestPath(with /build) + body. */
export function sign(secret: string, timestamp: string, method: string, requestPath: string, body: string): string {
  return createHmac('sha256', secret).update(timestamp + method.toUpperCase() + requestPath + body).digest('base64');
}

export class SignedClient {
  private readonly o: Required<Omit<SignedClientOptions, 'fetchImpl' | 'now'>> & { fetchImpl: typeof fetch; now: () => Date };

  constructor(opts: SignedClientOptions) {
    this.o = {
      apiKey: opts.apiKey,
      secretKey: opts.secretKey,
      origin: opts.origin ?? 'https://web3.binance.com',
      timeoutMs: opts.timeoutMs ?? 20000,
      fetchImpl: opts.fetchImpl ?? fetch,
      now: opts.now ?? (() => new Date()),
    };
  }

  private async call<T>(method: 'GET' | 'POST', path: string, params: Record<string, string>, body: unknown, parse: (d: unknown) => T | null): Promise<Result<T>> {
    const qs = new URLSearchParams(params).toString();
    const requestPath = `${BUILD_PREFIX}${path}${qs ? `?${qs}` : ''}`;
    const bodyStr = body === undefined ? '' : JSON.stringify(body);
    const ts = this.o.now().toISOString();
    const t0 = Date.now();
    try {
      const res = await this.o.fetchImpl(`${this.o.origin}${requestPath}`, {
        method,
        headers: {
          'X-OC-APIKEY': this.o.apiKey,
          'X-OC-TIMESTAMP': ts,
          'X-OC-SIGN': sign(this.o.secretKey, ts, method, requestPath, bodyStr),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : bodyStr,
        signal: AbortSignal.timeout(this.o.timeoutMs),
      });
      let env: RawEnvelope | null = null;
      try {
        env = (await res.json()) as RawEnvelope;
      } catch {
        env = null;
      }
      return classify(res.status, env, Date.now() - t0, parse);
    } catch (e) {
      return { ok: false, degraded: { kind: 'UNREACHABLE', message: e instanceof Error ? e.message : String(e) }, latencyMs: Date.now() - t0 };
    }
  }

  /** Aggregated quote. Routes come back sorted by toTokenAmount, each with a ~30s quoteId. */
  quote(p: { from: string; to: string; amountRaw: string; taker: string; vendor?: string }): Promise<Result<QuoteRoute[]>> {
    return this.call('GET', '/api/v1/dex/aggregator/quote', {
      binanceChainId: '56', fromTokenAddress: p.from, toTokenAddress: p.to, amount: p.amountRaw, userWalletAddress: p.taker, ...(p.vendor ? { vendor: p.vendor } : {}),
    }, undefined, (d) => {
      const list = Array.isArray(d) ? d : obj(d) && Array.isArray(obj(d)?.routes) ? (obj(d)?.routes as unknown[]) : null;
      if (!list) return null;
      return list.flatMap((x): QuoteRoute[] => {
        const o = obj(x);
        const quoteId = s(o?.quoteId), toTokenAmount = s(o?.toTokenAmount);
        if (!o || !quoteId || !toTokenAmount) return [];
        return [{ quoteId, vendorName: s(o.vendorName), executionMode: s(o.executionMode) ?? 'SWAP', toTokenAmount, approveTarget: s(o.approveTarget), raw: o }];
      });
    });
  }

  swap(p: { quoteId: string; from: string; to: string; amountRaw: string; taker: string; slippagePercent: string }): Promise<Result<BuiltSwap>> {
    return this.call('GET', '/api/v1/dex/aggregator/swap', {
      binanceChainId: '56', quoteId: p.quoteId, fromTokenAddress: p.from, toTokenAddress: p.to, amount: p.amountRaw, userWalletAddress: p.taker, slippagePercent: p.slippagePercent,
    }, undefined, (d) => {
      const tx = obj(obj(d)?.tx);
      const to = s(tx?.to), data = s(tx?.data), from = s(tx?.from);
      if (!tx || !to || !data || !from) return null;
      return { from, to, data, value: s(tx.value) ?? '0', gas: s(tx.gas), gasPrice: s(tx.gasPrice) };
    });
  }

  /** Off-chain simulation before any broadcast (T9). Body shape follows the documented `evmTx` field. */
  simulate(evmTx: { from: string; to: string; data: string; value?: string }): Promise<Result<Simulation>> {
    return this.call('POST', '/api/v1/dex/pre-transaction/simulate', {}, { binanceChainId: '56', evmTx }, (d) => {
      const o = obj(d);
      if (!o) return null;
      return { status: s(o.status) ?? s(o.executionStatus), raw: o };
    });
  }

  walletBalances(address: string): Promise<Result<unknown[]>> {
    return this.call('GET', '/api/v1/dex/balance/all-token-balances-by-address', { binanceChainId: '56', address }, undefined, (d) => {
      const o = obj(d);
      const list = Array.isArray(d) ? d : Array.isArray(o?.tokenAssets) ? (o?.tokenAssets as unknown[]) : Array.isArray(o?.list) ? (o?.list as unknown[]) : null;
      return list;
    });
  }
}
