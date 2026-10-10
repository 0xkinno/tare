import { createServer } from 'node:http';
import { createPublicClient, createWalletClient, http, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { PublicRwaClient, SignedClient } from '@tare/binance';
import { TICKERS, tickerIdOf } from '@tare/registry';
import { bookAbi } from './abi';
import { Engine, type OpenOrder } from './engine';
import { Journal } from './journal';
import { NoopNotifier, TelegramNotifier, type Notifier } from './notify';
import { Recorder } from './recorder';
import { Stats } from './stats';

const env = (k: string): string | undefined => (process.env[k] && process.env[k] !== '' ? process.env[k] : undefined);
const PASS_MS = Number(env('KEEPER_PASS_SEC') ?? 30) * 1000;
const PORT = Number(env('PORT') ?? 8787);
const BOOK = env('NEXT_PUBLIC_TAREBOOK') as `0x${string}` | undefined;

const chain = createPublicClient({ chain: bsc, transport: http(env('BSC_RPC_URL') ?? 'https://bsc-dataseed1.defibit.io') });
const rwa = new PublicRwaClient({ origin: env('BINANCE_API_ORIGIN') });
const apiKey = env('BINANCE_WEB3_API_KEY');
const secret = env('BINANCE_WEB3_SECRET_KEY');
const signed = apiKey && secret ? new SignedClient({ apiKey, secretKey: secret, origin: env('BINANCE_WEB3_ORIGIN') }) : null;
const account: Account | null = env('KEEPER_PRIVATE_KEY') ? privateKeyToAccount(env('KEEPER_PRIVATE_KEY') as `0x${string}`) : null;
const wallet = account ? createWalletClient({ account, chain: bsc, transport: http(env('BSC_RPC_URL') ?? 'https://bsc-dataseed1.defibit.io') }) : null;
const journal = new Journal(env('KEEPER_JOURNAL') ?? 'data/keeper/journal.jsonl');
const stats = new Stats();
const tickerById = new Map(TICKERS.map((t) => [tickerIdOf(t).toLowerCase(), t]));

async function readOrders(): Promise<(OpenOrder & { status: number })[]> {
  if (!BOOK) return [];
  const next = await chain.readContract({ address: BOOK, abi: bookAbi, functionName: 'nextId' });
  const out: (OpenOrder & { status: number })[] = [];
  for (let i = 0n; i < next; i++) {
    const [owner, side, status, wrapperMask, deadline, tickerId, amount, limit] = await chain.readContract({ address: BOOK, abi: bookAbi, functionName: 'orders', args: [i] });
    out.push({ id: i, owner, side: side === 0 ? 'BUY' : 'SELL', status, wrapperMask, deadline, tickerId, amount, limit });
  }
  return out;
}

let notifier: Notifier = NoopNotifier;
let telegram: TelegramNotifier | null = null;
const tg = env('TELEGRAM_BOT_TOKEN');
if (tg) {
  telegram = new TelegramNotifier(tg, env('PUBLIC_WEB_ORIGIN') ?? 'http://localhost:3000', async (owner) => {
    return (await readOrders()).filter((o) => o.owner.toLowerCase() === owner).map((o) => ({ id: o.id.toString(), side: o.side, status: ['open', 'filled', 'cancelled'][o.status] ?? '?' }));
  });
  notifier = telegram;
}

const engine = new Engine({ chain, wallet, account, book: (BOOK ?? '0x0000000000000000000000000000000000000000') as `0x${string}`, rwa, signed, registry: env('NEXT_PUBLIC_REGISTRY') as `0x${string}` | undefined, journal, notifier, stats });

async function resolveUnresolved(): Promise<void> {
  for (const e of journal.unresolved()) {
    try {
      await engine.observe({ owner: '0x0000000000000000000000000000000000000000', id: BigInt(e.orderId) }, e.txHash as string, e);
    } catch (err) {
      stats.error(`unresolved ${e.txHash}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function pass(): Promise<void> {
  try {
    const orders = await readOrders();
    for (const o of orders) {
      if (o.status !== 0) continue;
      const ticker = tickerById.get(o.tickerId.toLowerCase());
      if (!ticker) continue;
      try {
        await engine.process(o, ticker);
      } catch (err) {
        stats.error(`order ${o.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    stats.pass();
    if (telegram) await telegram.pollOnce().catch((err) => stats.error(`telegram: ${String(err)}${err instanceof Error && err.cause ? ` (${String(err.cause)})` : ''}`));
  } catch (err) {
    stats.error(err instanceof Error ? err.message : String(err));
  }
}

const recorder = new Recorder({ chain, rwa, journalPath: env('RECORDER_FILE') ?? 'data/keeper/quotes.jsonl', supabaseUrl: env('SUPABASE_URL'), supabaseKey: env('SUPABASE_SERVICE_ROLE_KEY') });

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  if (url.pathname === '/api/agent/keeper' || url.pathname === '/') {
    res.end(JSON.stringify({ ...stats.snapshot(), keeper: account?.address ?? null, book: BOOK ?? null, mode: wallet ? 'LIVE' : 'OBSERVE', transactionApi: signed ? 'KEYED' : 'ETH_CALL_FALLBACK', recorder: recorder.snapshot(), recent: journal.all().slice(-25) }));
    return;
  }
  if (url.pathname === '/healthz') { res.end('{"ok":true}'); return; }
  res.statusCode = 404;
  res.end('{"error":"not found"}');
}).listen(PORT);

// A free Render web service sleeps after 15 minutes without inbound traffic. Hitting our own public URL while awake
// keeps the loop alive; the scheduled workflow in .github/workflows/keepalive.yml wakes it if it ever slept.
const selfUrl = env('RENDER_EXTERNAL_URL');
if (selfUrl) setInterval(() => { void fetch(`${selfUrl.replace(/\/$/, '')}/healthz`, { signal: AbortSignal.timeout(10_000) }).catch(() => undefined); }, 10 * 60_000);

await resolveUnresolved();
void (async () => { for (;;) { await recorder.cycle().catch((e) => stats.error(`recorder: ${String(e)}`)); await new Promise((r) => setTimeout(r, 60_000)); } })();
for (;;) {
  const s = Date.now();
  await pass();
  await new Promise((r) => setTimeout(r, Math.max(1000, PASS_MS - (Date.now() - s))));
}
