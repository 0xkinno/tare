# Developer Experience Report

**Project:** Tare, BNB Hack: Tokenized Stocks Edition. **Author:** 0xkinno.
Every item below comes from my own calls, with the raw, timestamped entries in [`docs/DX_LOG.md`](docs/DX_LOG.md),
the data in [`data/discovery`](data/discovery), and the scripts that produced it in [`scripts/discovery`](scripts/discovery).

## Summary: three findings that changed what I built

1. **The unit lives in a different place for each issuer, and the API hides that.** bStocks keep it on the token
   (`uiMultiplier`, ERC-8056), Ondo keeps it in a separate `SyntheticSharesOracle` (`getSValue`), and xStocks rebase
   the balance and can charge a fee through the multiplier. The public API returns a "multiplier" for all three
   without saying which mechanism stands behind it, and for xStocks it did not match the token.
2. **The documented provider list and the served one disagree.** The skill file says one provider is supported.
   The catalogue serves three provider types on BSC, and the trading documentation says Ondo is always RFQ while
   the keyed `quote` with a contract as taker returned executable SWAP calldata for Ondo.
3. **A reference price you can trust is not available for every wrapper.** bStocks have no equity reference in the
   public per-token response, the Ondo "reference" is the same feed multiplied by the unit, and xStocks prices are
   pool prints that sit up to twenty percent from the equity.

## 1. Onboarding

- **Time to first successful call: 22 minutes, all of it network diagnosis.** From my home network (Nigeria) the
  RWA endpoints hung until the client timeout with zero bytes and no HTTP status. The TCP connection to the API host
  never completes, so it looks like an outage, not a geo-refusal. The prohibited-regions page lists countries that
  are refused; it does not say that unlisted regions may be unreachable at the network level. A VPN fixed it.
- **The docs index for agents is not fetchable by an agent.** `llms.txt` and `llms-full.txt` answer `202` with an
  empty body to plain HTTP and `ECONNRESET` to a hosted fetcher, because of a bot challenge. A browser context passes
  it. I saved both under `docs/vendor/` with `scripts/vendor_docs.mjs`.
- **Keyed access needs a portal round trip** and the key's capability domains must be chosen at creation. My key had
  no B402 permission; the first call returned `40104 No permission: B402` and nothing in the key list said so.
- **Wallet Skills install** worked through `npx skills add`; on Windows one target failed with `EBUSY: unlink` on a
  symlinked directory while the others completed. The `baw` CLI came from npm (`@binance/agentic-wallet`).
- **Hosting.** The default Vercel region is a US one that the API refuses; every route that calls it needs
  `preferredRegion = ['sin1','hkg1']`. Vercel also refused to deploy a Next.js version with a published advisory.

## 2. Documentation issues

| Where | Issue |
|---|---|
| `binance-tokenized-securities-info` skill, API 1 | States `type=1` is the only supported provider and "omit to return all". The unfiltered list returns three provider types on BSC; `type=2` is xStocks and `type=3` is bStocks, which I established by joining with on-chain symbols. Types 0, 6, 7, 8 and 10 return an empty array. |
| `trading-api/introduction` | Says Ondo is "always routed via 3-vendor RFQ". Measured with the book contract as taker: LiquidMesh, `executionMode: SWAP`, at every size from $10 to $1,000. |
| `/quote` parameter table | Does not list the Ondo minimum order. Below five dollars: `40375 Minimum order amount is 5 USD`. |
| xStocks dividend page | Describes the rebasing multiplier but not the management fee that also moves it, nor any function name. |
| Chainlink Ondo feed page | Names `SyntheticSharesOracle` and sValue but gives neither the BSC address nor the function signature. The address is on the issuer's own addresses page. |
| `tokenInfo.volume24h` | Documented as misleading (US equity volume). It is, and the note is helpful; the field should not carry that name. |
| `referencePrice` | Documented as `tokenPrice / sharesMultiplier`. That is a definition, not a measurement, and the docs should say the reference is derived. |

## 3. API pitfalls

- **HTTP 200 on failure.** Errors come as `200` with a failure `code` in the body (`40001`, `40374`, `40375`).
  Status-code-only handling swallows them. My client treats a 200 with a non-success code as a typed degraded state.
- **`stockInfo.price` is `null` for all ten bStocks** in the dynamic response and the asset status says `TRADING`
  while the market status says `closed` at the weekend close. The two endpoints disagree about the same moment.
- **xStocks multiplier mismatch.** The list endpoint says `"1"`, the dynamic endpoint returns another value, and the
  token's own `getCurrentMultiplier()` returns a third. Five of ten differed by up to 13 bps at my snapshot.
- **Simulating a contract-taker swap in isolation fails by design.** The built `swap` has `from` = the contract,
  which holds no USDT, so `pre-transaction/simulate` returns `BEP20: transfer amount exceeds balance`. The correct
  unit to simulate is the contract's own `fill` call. This is not stated anywhere.
- **The approve target.** `approveTarget` for the aggregator is a router with no verified source on the explorer.
  I allowlisted it with an exact approval and the on-chain share floor as the backstop, and recorded the decision.
- **Log scanning.** `eth_getLogs` on the public dataseed endpoint returns `limit exceeded` for any range; one public
  endpoint allowed 4,999-block windows and served a 30-day scan (692 windows).
- **Latency** from the VPN egress, 15 samples each: market status p50 217 ms / p95 879 ms, dynamic p50 222 ms /
  p95 858 ms, list p50 288 ms / p95 557 ms.

## 4. AI stack feedback

- The Agentic Wallet skill is precise about confirmation, Developer Mode and the rule that an order id is not a
  completed swap. The contract-call path (`preview` then `execute`) is what a share-denominated order needs, and it
  is documented well. Sign-in is the one step an unattended agent cannot do: it requires a QR confirmation in the
  app within five minutes, and the code expires if a long-running command is started late.
- The BNB Agent Studio SDK covered ERC-8004 registration and ERC-8183 jobs with little code. Details worth stating
  up front: mainnet ERC-8183 pays in "United Stables", the dispute window is seven days, zero-price jobs are
  supported, and ERC-8004 registration on mainnet was gas-sponsored.
- Feeding `llms-full.txt` to a coding agent worked once the challenge was passed, and the file is a good primer.

## 5. Tokenized-stock specifics

- **Liquidity is asymmetric.** Median deepest pool: bStocks about 739 thousand dollars, Ondo about 6.5 thousand,
  xStocks about 390 dollars (`data/discovery/summary.json`). Seven of ten Ondo and all ten xStocks tokens have no
  pool above ten thousand dollars.
- **Off-hours behaviour.** Hourly Ondo vs bStocks per-share spread had a median of 13.6 bps over weekend hours and
  about 7.5 bps in the other sessions. Direct-pool quotes more than five percent from the equity reference were
  common for Ondo and xStocks and absent for bStocks.
- **Differences in practice.** bStocks quote tightly and carry a stable, readable unit. Ondo needs the oracle read
  and a five-dollar minimum, and its corporate actions are scheduled pauses with an oracle log. xStocks show a
  usable token and an unusable market on BNB Chain.
- **A decoding trap.** bStocks emit `TransferWithUIAmount` with the same indexed shape as `Transfer`. A shape-based
  decoder double counts. My verifier did, on real mainnet data; it now filters on the `Transfer` topic.
- **Corporate actions are visible on-chain.** A 30-day scan of the Ondo oracle found scheduled and applied
  corporate-action events and 106 value updates.

## 6. Redesign suggestions

1. Return, per token, the unit source (address and selector) and its mechanism next to `multiplier`.
2. Serve the same reference field for every provider, or say plainly that none exists.
3. Make the provider type an enum in the list response (`ONDO`, `XSTOCKS`, `BSTOCKS`) instead of an integer.
4. Put route kinds and minimums in the quote parameter table, and return the minimum in the error payload as data.
5. Return a retryable-or-not flag with every body error code.
6. Give the contract-taker case a documented simulation path (for example, simulate the caller's transaction, not
   the swap).

## 7. Requested capabilities

- A unit-change or pause event feed (webhook or log filter) for tokenized equities.
- Per-token pause state and next scheduled corporate action in the list response.
- Keyless read-only quotes for agents, rate-limited, for discovery work.
- Self-serve B402 onboarding and a permission check endpoint that says which domains a key holds.
- A sandbox for the Agentic Wallet sign-in that does not expire in five minutes.

## Reproduce

```bash
pnpm install
pnpm discover          # E1 to E12 data and DISCOVERY.md
npx tsx scripts/discovery/e6_keyed.ts   # keyed legs, needs BINANCE_WEB3_API_KEY and SECRET
npx tsx scripts/discovery/b402_supported.ts
```
