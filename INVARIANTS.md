# Invariants

Each invariant is named, independently checkable, and checked twice: by the service or contract, and by the offline verifier or a test.

| ID | Invariant | Checked by |
|---|---|---|
| T1 | **Unit normalisation.** No comparison, ranking or enforced limit uses raw token units. | Branded kernel types (`packages/kernel/src/units.ts`), `packages/kernel/test`, `TareBook._fillBuy`, verifier |
| T2 | **Share floor.** A buy never delivers fewer share-equivalents than `order.minShares`. | `TareBook` revert `ShareFloor`, `test_shareFloorRevert`, `invariant_floorAndExactlyOnce`, verifier |
| T2b | **Sell floor.** A sell never pays less than `shares x floor` in USDT. | `TareBook` revert `SellFloor`, `test_sellFloorRevert`, verifier |
| T3 | **Live unit.** The unit used at fill is read on-chain in the same transaction; `fill` has no unit argument. | `TareBook.fill`, `test_keeperCannotPassUnit`, verifier compares the event unit with `eth_call` at the block |
| T4 | **Corporate-action freeze.** No fill while the issuer pause source reports paused. | `WrapperRegistry.isPaused`, `test_corporatePauseBStock`, `test_corporatePauseOndoOracle`, kernel policy |
| T5 | **Allowlist.** Only registered wrappers of the order ticker and only allowlisted routers. | `TareBook.fill`, `test_unlistedRouter`, `test_wrongWrapper`, verifier |
| T6 | **No custody.** Funds stay in the owner wallet until the fill transaction; the book holds nothing between transactions. | `testFuzz_noResidual`, `invariant_bookHoldsNothing`, verifier |
| T7 | **Recipient lock.** Output reaches the owner; routes that send it elsewhere deliver zero and revert. | `test_maliciousRecipient`, verifier |
| T8 | **Exactly once.** An order fills at most once; replay reverts. | `test_replay`, `invariant_floorAndExactlyOnce`, verifier |
| T9 | **Simulate before send.** The keeper never broadcasts without a passing simulation; the source is recorded. | `services/keeper` journal (`simSource`, `simResult`) |
| T10 | **Stale is labelled.** A reference older than the last live session is never presented or used as live. | `packages/kernel/test` (T10), UI session badge |
| T11 | **Decomposition closure.** `(1 + gross) = unit x (1 + net)` within 1e-9 for every stored quote. | Property test, verifier `--quote` |
| T12 | **Degraded is distinct.** "Source unavailable" and "no wrapper" are different typed states everywhere. | `packages/binance/test`, `packages/kernel/test`, UI states |

## Named failure mode

A limit expressed in tokens is filled wrongly after a unit change. `test_unitJump` writes the bStocks multiplier storage on a fork: the token-denominated baseline still fills, the share-denominated order reverts with `ShareFloor`.
