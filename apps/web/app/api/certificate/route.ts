import { NextResponse } from 'next/server';
import { createHash, createHmac } from 'node:crypto';
import { getShelf } from '@/lib/server/shelf';
import { wrappersFor } from '@tare/registry';

export const preferredRegion = ['sin1', 'hkg1'];
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * Tare Certificate: a decomposition of one ticker across every wrapper at a block, hash-committed.
 * Priced per call with B402 (x402 V2) when the merchant is configured; otherwise the state is stated.
 */
const ORIGIN = process.env.BINANCE_WEB3_ORIGIN ?? 'https://web3.binance.com';
// The B402 facilitator on BSC settles in the United Stables token (the `supported` response names it), 18 decimals.
const PRICE_WEI = process.env.CERT_PRICE_WEI ?? '10000000000000000'; // 0.01
const PAY_ASSET = '0xcE24439F2D9C6a2289F741120FE202248B666666';

async function b402(op: 'supported' | 'verify' | 'settle', body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const key = process.env.BINANCE_WEB3_API_KEY, secret = process.env.BINANCE_WEB3_SECRET_KEY;
  if (!key || !secret) return { status: 503, json: { code: 'NOT_CONFIGURED' } };
  const path = `/build/api/v2/b402/${op}`;
  const raw = JSON.stringify({ body });
  const ts = new Date().toISOString();
  const sig = createHmac('sha256', secret).update(ts + 'POST' + path + raw, 'utf8').digest('base64');
  const r = await fetch(`${ORIGIN}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-OC-APIKEY': key, 'X-OC-TIMESTAMP': ts, 'X-OC-SIGN': sig }, body: raw, signal: AbortSignal.timeout(15000) });
  return { status: r.status, json: (await r.json()) as Record<string, unknown> };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get('ticker') ?? '').toUpperCase();
  if (!wrappersFor(ticker).length) return NextResponse.json({ error: 'unknown ticker' }, { status: 400 });

  const payTo = process.env.B402_PAY_TO;
  const requirementsFor = async () => {
    const s = await b402('supported', {});
    const kinds = ((s.json.data as { kinds?: { scheme: string; network: string; extra: Record<string, unknown> }[] } | undefined)?.kinds ?? []).filter((k) => k.network === 'eip155:56');
    const kind = kinds.find((k) => k.scheme === 'exact' && k.extra.assetTransferMethod === 'eip3009') ?? kinds.find((k) => k.scheme === 'exact') ?? kinds[0];
    return kind && payTo
      ? { scheme: kind.scheme, network: 'eip155:56', amount: PRICE_WEI, asset: PAY_ASSET, payTo, maxTimeoutSeconds: 300, extra: kind.extra }
      : null;
  };

  const header = req.headers.get('x-payment') ?? req.headers.get('payment-signature');
  if (!header) {
    const reqs = await requirementsFor();
    if (!reqs) return NextResponse.json({ error: 'B402_NOT_CONFIGURED', message: 'Paid certificates need the B402 merchant configured (API key with B402 permission and a payTo address).' }, { status: 503 });
    return NextResponse.json({ x402Version: 2, accepts: [reqs] }, { status: 402 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'bad payment header' }, { status: 400 });
  }
  const reqs = await requirementsFor();
  if (!reqs) return NextResponse.json({ error: 'B402_NOT_CONFIGURED' }, { status: 503 });
  const accepted = (payload as { accepted?: unknown }).accepted;
  if (JSON.stringify(accepted) !== JSON.stringify(reqs)) return NextResponse.json({ error: 'payment does not match requirements' }, { status: 402 });
  const verified = await b402('verify', { x402Version: 2, paymentPayload: payload, paymentRequirements: reqs });
  if (verified.status !== 200 || (verified.json.data as { isValid?: boolean } | undefined)?.isValid === false) return NextResponse.json({ error: 'payment not valid', detail: verified.json }, { status: 402 });

  const shelf = await getShelf(ticker, 50);
  if (!shelf) return NextResponse.json({ error: 'no shelf' }, { status: 404 });
  const body = { ticker, block: shelf.block, asOf: shelf.asOf, session: shelf.session, referenceUsdPerShare: shelf.referenceUsdPerShare, wrappers: shelf.wrappers.map((w) => ({ symbol: w.symbol, issuer: w.issuer, token: w.token, unitWad: w.unitWad, paused: w.unitPaused, quote: w.quote })) };
  const canonical = JSON.stringify(body);
  const hash = createHash('sha256').update(canonical).digest('hex');
  const settled = await b402('settle', { x402Version: 2, paymentPayload: payload, paymentRequirements: reqs });
  const settlement = settled.json.data as { success?: boolean; transaction?: string; errorReason?: string } | undefined;
  if (settled.status !== 200 || settlement?.success !== true) return NextResponse.json({ error: 'settlement failed', detail: settlement ?? settled.json }, { status: 402 });
  return NextResponse.json({ certificate: body, sha256: hash, settlement: settled.json.data ?? null });
}
