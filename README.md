<p align="center">
  <img src="docs/media/mark.svg" width="72" alt="Tare mark" />
</p>

<h1 align="center">Tare</h1>

<p align="center">
  <a href="https://tare-olive.vercel.app"><img alt="live" src="https://img.shields.io/badge/live-tare--olive.vercel.app-16130E"></a>
  <a href="https://bscscan.com/address/0xa440a217B64c01659A1c911b795371C3C2e1A13e"><img alt="TareBook" src="https://img.shields.io/badge/BscScan-TareBook-F0B90B"></a>
  <a href="https://tare-olive.vercel.app/api/agent/keeper"><img alt="keeper" src="https://img.shields.io/badge/keeper-status-00B07A"></a>
  <img alt="tests" src="https://img.shields.io/badge/tests-66%20passing-00B07A">
  <img alt="hackathon" src="https://img.shields.io/badge/built%20for-BNB%20Hack%3A%20Tokenized%20Stocks-16130E">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-16130E">
</p>

**Tare lets first-time on-chain investors set a standing order for a US stock once, in real shares, and have it filled at any hour of the week without handing over their keys, because the chain itself refuses any fill that gives them fewer shares than they signed for.**

<p align="center"><img src="docs/media/qa/desktop/landing.png" alt="Tare landing page" width="100%"></p>

Amara saves in USDT and wants a little Nvidia every month. On BNB Chain she finds three tokens called Nvidia, each priced in a different unit, and a market that has been shut since Friday night. Tare weighs the three in real shares, takes her limit once, and lets an agent fill it at any hour from the wrapper that delivers the most shares. The contract reads the issuer's unit in the same transaction and reverts if the shares fall short.

## Links

| What | Where |
|---|---|
| Live app | https://tare-olive.vercel.app |
| Judge path (about two minutes, no wallet) | https://tare-olive.vercel.app/judge |
| Proof | https://tare-olive.vercel.app/proof |
| Keeper status | https://tare-olive.vercel.app/api/agent/keeper |
| TareBook (verified) | [0xa440a217B64c01659A1c911b795371C3C2e1A13e](https://bscscan.com/address/0xa440a217B64c01659A1c911b795371C3C2e1A13e#code) |
| WrapperRegistry (verified) | [0xdDf50D8e6C4283eAD3A28878AF2bb604c1F6B2ea](https://bscscan.com/address/0xdDf50D8e6C4283eAD3A28878AF2bb604c1F6B2ea#code) |
| Agentic Wallet skill | [`skills/tare/SKILL.md`](skills/tare/SKILL.md) |
| MCP endpoint | https://tare-olive.vercel.app/api/mcp |
| A2A agent card | https://tare-olive.vercel.app/.well-known/agent-card.json |
| Discovery | [`DISCOVERY.md`](DISCOVERY.md) |
| Developer experience log | [`docs/DX_LOG.md`](docs/DX_LOG.md) |

## The problem

Tokenized stocks trade all week on BNB Chain, but a buyer meets four traps.

1. **One ticker, three units.** Every ticker has a bStocks, an Ondo and an xStocks token. One token is 0.9473 percent more than a share at most today, and two tokens of the same ticker differ by up to 77.30 bps from unit alone, before any premium exists.
2. **The reference is not a second opinion.** 10 of 10 bStocks have no equity reference in the public response, and for Ondo the derived reference is the same feed times the unit.
3. **The clock stops.** New York is closed 28.57 percent of the week. Tokens keep trading against a reference that is hours or days old.
4. **Quotes break.** 2,475 of 6,750 recorded quotes were more than five percent from the equity reference.

## The solution

A standing order in shares. The owner signs once: how many dollars, and the fewest shares acceptable. Any keeper may fill it. `TareBook` pulls USDT only at fill, executes an allowlisted route, reads the unit from the issuer in the same transaction, checks the shares and pays the owner. Anything below the floor reverts.

## Explore in two minutes

1. Open [`/judge`](https://tare-olive.vercel.app/judge): a live shelf, then the retained mainnet records, each with a BscScan link.
2. Open [`/app/t/NVDA`](https://tare-olive.vercel.app/app/t/NVDA): the three wrappers weighed in shares, the session, the chart.
3. Open [`/proof`](https://tare-olive.vercel.app/proof): every claim, the command that reproduces it, and what it does not show.
4. Open [`/verify`](https://tare-olive.vercel.app/verify) and enter an order id from the judge page.
5. From a terminal:

```bash
curl -s https://tare-olive.vercel.app/api/agent/keeper | jq '{mode, passes, fills, refusalsByReason}'
curl -s https://tare-olive.vercel.app/api/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
```

## What was discovered

Short version of [`DISCOVERY.md`](DISCOVERY.md), regenerated from files:

- All 10 measured tickers have three wrappers on BSC (30 in total). The unit lives in the token for bStocks (`uiMultiplier`), in a separate oracle for Ondo (`getSValue`), and in a rebasing balance for xStocks.
- The public catalogue serves three provider types on BSC; the skill file documents only one.
- The API multiplier for xStocks differs from the token on 5 of 10.
- Median deepest pool: bStocks 739,184 USD, Ondo 6,508 USD, xStocks 392 USD.
- With a contract as taker the aggregator returns executable SWAP calldata for bStocks and for Ondo wrappers, although its documentation calls Ondo RFQ only.

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md).

```mermaid
flowchart LR
  U[Owner wallet / Agentic Wallet / MCP agent] --> W[Web app and /api/plan]
  W --> K[Share-Equivalence Kernel]
  B[(Binance Web3 API)] --> K
  R[Wrapper Registry] --> K
  K --> P{Policy}
  P -- standing order --> TB[TareBook.sol]
  P -- instant --> SW[Owner wallet swap]
  KP[Keeper agent] -->|simulate then fill| TB
  TB -->|unit read in-tx, share floor| CH[(BSC mainnet)]
  CH --> V[Offline verifier]
```

## One fill

```
 quote ──> kernel ──> simulate ──> fill ──> unit read ──> share floor ──> receipt
```

## The guarantee

**Wrappers quote. Shares decide.** Twelve named invariants, each checked twice, in [`INVARIANTS.md`](INVARIANTS.md).

| ID | Invariant | Test |
|---|---|---|
| T2 | A buy never delivers fewer shares than signed | `test_shareFloorRevert` |
| T2b | A sell never pays less than the signed USDT per share | `test_sellFloorRevert` |
| T3 | The unit is read on-chain in the fill transaction | `test_keeperCannotPassUnit` |
| T4 | No fill while the issuer has paused the token | `test_corporatePause*` |
| T6 | The book holds nothing between transactions | `testFuzz_noResidual` |
| T7 | Output reaches the owner only | `test_maliciousRecipient` |
| T8 | An order fills at most once | `test_replay` |

## The numbers

Generated from `data/**/summary.json` by `scripts/render_docs.ts`.

### Autonomy, on BSC mainnet

| | |
|---|---|
| Orders placed (two buys, one sell) | 3 |
| Fills made by the keeper | 3 |
| Fills with no owner transaction in between | 3 |
| Fills while New York was closed | 3 |
| Seconds from placing to the first fill | 45 |
| Distinct refusals logged by the keeper | 1 |

### Counterfactual: shares per $50

| Arm | Mean shares | Median shares |
|---|---:|---:|
| Naive (lowest token price) | 0.1796 | 0.2168 |
| Random wrapper (control) | 0.1784 | 0.2138 |
| Tare (most shares) | 0.1796 | 0.2168 |

Tare minus random: 67.31 bps. Tare minus naive on direct pools: 0 bps. With the aggregator, the two picks differ in 8 of 28 ticker-size groups, by 1.25 bps on average and 8.97 bps at most. The pick matters less than the guarantee, and the files say so.

### Break suite and tests

| Suite | Result |
|---|---|
| Contracts on a BSC mainnet fork | 18 passed, 0 failed |
| Kernel, registry, client, verifier, keeper | 48 passed |

## How the Binance Web3 API is used

| Module | Use in Tare |
|---|---|
| RWA Data | Catalogue by provider type, per-token price, multiplier, equity reference and status, market session |
| Market | Hourly and daily candles for the weighing chart and the weekend calibration |
| Trading | Aggregated quotes and swap calldata with the book as taker (E6) |
| Transaction | Simulation before send (the keeper falls back to `eth_call` and records which it used) |
| Wallet | Holdings in shares |
| B402 | The paid certificate endpoint; needs a B402-enabled key |

The combination that looks like it should not work but does: the RWA reference, the on-chain unit factor, a Trading API quote and a simulation, ranked in shares.

## Agentic Wallet and BNB Agent Studio

| Item | State |
|---|---|
| Wallet Skills installed, skill written | Done: [`skills/tare/SKILL.md`](skills/tare/SKILL.md) |
| Agentic Wallet mainnet run | See [`docs/spikes/agentic-wallet.md`](docs/spikes/agentic-wallet.md) |
| ERC-8004 identity | Agent #370049 on BSC mainnet |
| ERC-8183 certificate job | Job 56961, state SUBMITTED, settles after the dispute window |
| Self-funding via B402 | Endpoint implemented; paid settlement needs a B402-enabled key |

## What is real and what is not

| Thing | Status |
|---|---|
| Contracts on BSC mainnet, verified | Real |
| Keeper fills, refusals, cancel on mainnet | Real, cents in size |
| Verifier PASS on the filled orders | Real, outputs in `evidence/mainnet` |
| Keeper hosted on a worker | Not yet: ran on the author machine |
| Agentic Wallet mainnet run | Needs the owner's app confirmation |
| Paid certificate settlement | Needs a B402-enabled key |
| ERC-8183 completion | Needs the seven day dispute window |

Full list in [`LIMITATIONS.md`](LIMITATIONS.md).

## Developer experience report

[`docs/DX_LOG.md`](docs/DX_LOG.md) is the raw log. `DX_REPORT.md` is written by the author from it.

## Run it

```bash
pnpm install
pnpm -r test
cd contracts && forge test -vvv          # needs BSC_RPC_URL; an archive RPC is better for long runs
cd .. && pnpm --filter @tare/web dev
npx tsx scripts/run_keeper.ts            # keeper and recorder, reads .env.local
pnpm discover                            # regenerate the discovery data
```

Environment variables are listed in `.env.example`.

## Repository map

```
contracts/    TareBook, WrapperRegistry, fork break suite, deploy script
packages/     kernel, registry, binance, verify
services/     keeper, agent
apps/web/     Next.js app, API routes, MCP, A2A, x402 endpoint
skills/tare/  Agentic Wallet skill
scripts/      discovery, counterfactual, calibration, autonomy, manifest, claims
data/         generated evidence (each file states source and range)
evidence/     fork logs and mainnet records
docs/         DX log, vendor documentation snapshots, spikes, claims ledger
```

## Roadmap

Hosted keeper worker, B402-enabled paid certificates, more issuer wrappers as pools deepen, notification delivery by more channels, a per-order tolerance written on-chain.

## Security

See [`SECURITY.md`](SECURITY.md).

## License and attribution

MIT. Fonts: Clash Display, General Sans and Gambetta by Fontshare (Indian Type Foundry, Fontshare Free Font License); JetBrains Mono (OFL). Photograph on the landing page: Namnso Ukpanah, Unsplash. Libraries: viem, wagmi, RainbowKit, Next.js, Tailwind CSS, framer-motion, lightweight-charts (Apache 2.0), OpenZeppelin Contracts, Foundry.

Built by 0xkinno.
