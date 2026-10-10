# Limitations

Said plainly. Nothing here is hidden in the README.

1. **The floor is a floor, not the best price.** The book accepts any fill at or above the signed shares. An untrusted filler could deliver exactly the floor. The keeper picks the most shares among allowlisted routes; the contract only guarantees the minimum. Set a tight floor.
2. **Mostly one wrapper family is deep.** On BNB Chain the bStocks pools are orders of magnitude deeper than Ondo and xStocks pools (measured in `DISCOVERY.md`). Standing orders in practice fill from bStocks; Ondo through the aggregator when the order is large enough; xStocks have no usable route.
3. **Ondo minimum order.** The aggregator enforces a 5 USD minimum order on Ondo names. Smaller orders can only use direct pools, which are thin for Ondo.
4. **One xStocks unit assumption.** That one xStocks balance unit equals one share follows issuer documentation; the pools are too thin to confirm it from price.
5. **The aggregator router is not verified source.** The allowlisted aggregator router has no verified source on the explorer. The exact-amount approval and the share floor bound the damage to a refused fill; the decision is recorded in `DECISIONS.md`.
6. **Keeper hosting.** The keeper runs on Render's free plan in Singapore. A free web service sleeps without inbound traffic, so a self-ping and a scheduled GitHub workflow keep it awake. GitHub schedules can be delayed, so a short gap is possible and the keeper catches up on the next pass. The mainnet autonomy evidence itself was produced earlier, on the author machine.
7. **ERC-8183 settlement.** The reference policy has a seven day dispute window, so the certificate job cannot settle before the submission deadline. It is shown as Submitted, not Completed.
8. **Paid certificates.** The x402 endpoint settled a real payment through B402, but the pay-to address fixed at onboarding is the owner test wallet, not the keeper, so the keeper does not earn from it yet. Re-onboarding with the keeper address makes the loop self-funding.
9. **History.** Unit history of bStocks multipliers beyond the scanned window is not reconstructed; the oracle log scan covers the recent window only.
10. **Calendar.** NYSE holidays and half days are encoded for 2026 and 2027 and cross-checked against the API session; they are not a trading calendar service.
11. **Not advice.** Tokenized stocks are certificates or tracker tokens, not shares. Read the issuer terms.
