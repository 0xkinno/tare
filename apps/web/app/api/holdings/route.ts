import { NextResponse } from 'next/server';
import { parseAbi } from 'viem';
import { WRAPPERS, makeClient, readUnit } from '@tare/registry';
import { shares, sharesFor, sharesPerToken, tokens } from '@tare/kernel';

export const preferredRegion = ['sin1', 'hkg1'];
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const chain = makeClient(process.env.BSC_RPC_URL);
const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)']);

/** Holdings in shares across all wrappers of each ticker, read straight from the chain. */
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get('owner') ?? '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) return NextResponse.json({ error: 'owner must be an address' }, { status: 400 });
  try {
    const balances = await Promise.all(
      WRAPPERS.map((w) => chain.readContract({ address: w.token, abi: erc20, functionName: 'balanceOf', args: [owner as `0x${string}`] }).then((b) => ({ w, b }))),
    );
    const held = balances.filter((x) => x.b > 0n);
    const rows = await Promise.all(
      held.map(async ({ w, b }) => {
        try {
          const u = await readUnit(chain, w);
          const sh = w.issuer === 'XSTOCKS' ? shares(b) : sharesFor(tokens(b), sharesPerToken(u.unit));
          return { ticker: w.ticker, symbol: w.symbol, issuer: w.issuer, token: w.token, tokensWad: b.toString(), unitWad: u.unit.toString(), sharesWad: sh.toString(), paused: u.paused, error: null as string | null };
        } catch (e) {
          return { ticker: w.ticker, symbol: w.symbol, issuer: w.issuer, token: w.token, tokensWad: b.toString(), unitWad: null, sharesWad: null, paused: null, error: e instanceof Error ? e.message.split('\n')[0]! : 'unit unreadable' };
        }
      }),
    );
    const byTicker: Record<string, { sharesWad: string; wrappers: number }> = {};
    for (const r of rows) {
      if (r.sharesWad === null) continue;
      const t = (byTicker[r.ticker] ??= { sharesWad: '0', wrappers: 0 });
      t.sharesWad = (BigInt(t.sharesWad) + BigInt(r.sharesWad)).toString();
      t.wrappers++;
    }
    return NextResponse.json({ owner, rows, byTicker, scanned: WRAPPERS.length });
  } catch (e) {
    return NextResponse.json({ error: 'UNREACHABLE', message: e instanceof Error ? e.message : 'chain read failed' }, { status: 502 });
  }
}
