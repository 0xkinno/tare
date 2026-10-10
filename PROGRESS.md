# PROGRESS

Author: 0xkinno.

## Session 1, 2026-10-10 (Phase 0 and Phase 1)

### Done
- Repository scaffolding, `.gitignore` (research material and secrets excluded), TASK.md, LICENSE, `package.json`.
- Phase 0: research material cloned and studied (kept outside the committed tree); developer docs, skill file,
  issuer docs and on-chain verified sources read; `docs/DX_LOG.md` started.
- Phase 1 experiments, all scripts under `scripts/discovery`, outputs under `data/discovery`:
  E1 wrapper map (30 wrappers, API catalog by type), E2 unit factors per issuer at one block,
  E3 API vs chain vs reference, E8 unit history (30 days), E5 direct-pool depth curves, E7 contract-recipient transfer simulation,
  E9 latency from the VPN egress, E11 pools by DEX, E12 broken-quote counts, E4 hourly backfill.
- `DISCOVERY.md` rendered from `data/discovery/summary.json`.

### In progress
- E4 live recorder (`pnpm discover:record`) is capturing every 60s through the weekend close.


### Next
- Re-run `pnpm discover:render` after the weekend capture; finalise E4 and E12.
- With an API key: E3 keyed leg, E5 aggregator depth, E6 contract taker, E11 route detail.
- With Foundry: E7 fork test, then Phase 2.

### Blockers
- Binance Web3 API key and secret (keyed Trading, Transaction, Wallet endpoints).
- Owner wallet with Agentic Wallet enabled (E10).
- Foundry not installed on this machine; archive RPC for fork tests.
- The home network cannot connect to Binance hosts; a VPN must stay on for every discovery script and the recorder.
