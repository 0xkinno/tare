import Link from 'next/link';
import { LiveShelfStrip } from '@/components/LiveShelfStrip';
import { LiveCounters } from '@/components/LiveCounters';
import { readData } from '@/lib/server/data';
import { bscscan } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Judge path' };

interface Entry { kind: 'instant' | 'fill' | 'refusal' | 'sell' | 'cancel' | 'agentic' | 'agentic-pay' | 'agentic-cancel' | 'identity' | 'certificate'; tx: string | null; orderId?: string; note: string; at?: string }

const ORDER: Entry['kind'][] = ['fill', 'refusal', 'sell', 'cancel', 'instant', 'agentic', 'agentic-cancel', 'agentic-pay', 'identity', 'certificate'];
const TITLE: Record<Entry['kind'], string> = {
  fill: 'A real standing order, filled by the keeper',
  refusal: 'A real refusal: ShareFloor on-chain',
  sell: 'A real sell order, filled with a USDT floor',
  cancel: 'A cancel',
  instant: 'An instant buy from the web app',
  agentic: 'The same order from an Agentic Wallet',
  'agentic-cancel': 'An order cancelled from the Agentic Wallet',
  'agentic-pay': 'The Agentic Wallet paying for a certificate over x402',
  identity: 'The keeper identity (ERC-8004)',
  certificate: 'A paid certificate (x402)',
};

export default async function JudgePage() {
  const ledger = (await readData<{ entries: Entry[] }>('../evidence/mainnet/ledger.json'))?.entries ?? [];
  const book = process.env.NEXT_PUBLIC_TAREBOOK;
  return (
    <div className="mx-auto w-[min(1180px,calc(100%-24px))] py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-graphite">About two minutes, no wallet needed</p>
      <h1 className="h2 mt-1">Judge path</h1>
      <div className="mt-6"><LiveCounters heading="Alive while you read" /></div>

      <ol className="mt-10 space-y-12">
        <li>
          <h2 className="font-display text-2xl font-semibold">1. A live shelf</h2>
          <p className="mt-1 text-graphite">One ticker across issuers, in shares. If New York is closed the reference is labelled aged.</p>
          <div className="mt-4"><LiveShelfStrip /></div>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">2. Retained mainnet records</h2>
          <p className="mt-1 text-graphite">Each step links to BscScan and to the verifier.</p>
          <ul className="mt-4 grid gap-3">
            {ORDER.map((k) => {
              const e = ledger.find((x) => x.kind === k);
              return (
                <li key={k} className="rounded-[var(--radius-card)] border border-rule bg-paper-3 p-5">
                  <p className="font-medium">{TITLE[k]}</p>
                  {e ? (
                    <p className="mt-1 text-sm">
                      {e.note}{' '}
                      {e.tx ? <a className="font-mono text-xs underline" href={bscscan('tx', e.tx)} target="_blank" rel="noreferrer">{e.tx.slice(0, 14)}…</a> : null}
                      {e.orderId ? <> · <Link className="underline" href="/verify">verify order {e.orderId}</Link></> : null}
                    </p>
                  ) : <p className="mt-1 text-sm text-graphite">Not recorded yet. This line fills in when the transaction exists; nothing is shown in its place.</p>}
                </li>
              );
            })}
          </ul>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">3. Ask it yourself</h2>
          <pre className="mt-3 overflow-x-auto rounded-[var(--radius-card)] bg-ink p-5 font-mono text-[13px] leading-6 text-paper" tabIndex={0}>{`curl -s $ORIGIN/api/agent/keeper | jq .
curl -s $ORIGIN/api/mcp -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'`}</pre>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">4. Try it with one dollar</h2>
          <p className="mt-1 text-graphite">{book ? <>Open any ticker, choose <em>Standing buy</em>, and sign a one dollar order. The book is at <a className="underline font-mono text-xs" href={bscscan('address', book)}>{book}</a>.</> : 'Standing orders open as soon as the book address is configured. Buy now works today.'} <Link className="underline" href="/app">Open the Shelf</Link>.</p>
        </li>
      </ol>
    </div>
  );
}
