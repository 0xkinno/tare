# PROGRESS

Author: 0xkinno.

## Session 2, 2026-10-10

### Done
- Phase 2 mechanism: kernel (property tests), registry (75 wrappers, 51 tickers from evidence plus catalogue), typed
  Binance client with degraded states, `WrapperRegistry` and `TareBook` (buy and sell), fork break suite and
  invariant suite, offline verifier CLI.
- Contracts deployed and verified on BSC mainnet (`EVIDENCE.md`).
- Phase 3 agent: keeper with intent-before-effect journal, typed refusals, recorder, Telegram notifier, status
  endpoint; ERC-8004 identity; ERC-8183 certificate job at price zero; x402 certificate endpoint.
- Mainnet autonomy run: two buys and one sell filled by the keeper while the owner wallet was untouched and New
  York was closed; a deliberate refusal reverted on-chain with `ShareFloor`; one cancel. Verifier PASS on each fill.
- Phase 4 product: landing, shelf, ticker with weighing chart and trade panel, standing orders with ledger diary,
  holdings in shares, keeper page, proof, verify, judge path; MCP server and A2A card; market-clock night edition.
- Phase 4b additions: sell orders, typed refusals, Telegram, claims ledger, autonomy proof.
- Phase 5 proof: discovery, counterfactual with random control, calibration, break suite, manifest, claims check.
- Phase 6 QA: Playwright matrix over nine viewports and nine pages against the deployment; axe; no horizontal scroll.
- Web deployed (Vercel, Singapore region).

### Open, and why
- Paid certificates settle through B402, but the pay-to address from onboarding is the owner wallet, not the keeper.
- ERC-8183 job settlement: seven day dispute window; state is Submitted.
- Keeper hosting: runs on Render (Singapore, free plan) with a self-ping and a scheduled keepalive workflow; the web app reads its live status.
- Supabase tables: apply `services/keeper/schema.sql` in the project SQL editor so the recorder can write.
- Demo video: the author's.

### Blockers
None that stop the build. The items above need an account action by the owner.
