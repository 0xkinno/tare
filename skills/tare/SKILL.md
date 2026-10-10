---
name: tare
description: |
  Use when the user wants to buy or sell a US stock token on BNB Chain in real shares, set a standing order
  ("buy $10 of Nvidia every Friday, never more than $X a share", "sell 0.05 shares of SPY if it reaches $Y"),
  ask which wrapper (bStocks, Ondo, xStocks) gives the most shares, or ask what their orders did this week.
  Tare plans the exact calls; the Binance Agentic Wallet previews and signs them. This skill never signs.
metadata:
  author: 0xkinno
  version: '0.1.0'
  requires:
    skills: [binance-agentic-wallet]
---

# Tare

Wrappers quote. Shares decide. Every comparison and every limit is in shares, never in token price.

Base URL: `${TARE_ORIGIN}` (the deployed web app). All endpoints are public and read-only except that
`/api/plan` returns calls for the wallet to sign. Nothing on the server holds a key.

## Flow

1. **Understand the intent** and fill the plan request.

   | Phrase | `intent` | Fields |
   |---|---|---|
   | "buy $20 of Nvidia, most shares" | `instant-buy` | `ticker`, `usd`, `owner`, `toleranceBps` |
   | "keep buying $50 of the S&P, never more than 0.5% over the real price" | `standing-buy` | `ticker`, `usd`, `owner`, `toleranceBps: 50`, `deadlineHours` |
   | "sell 0.05 SPY shares if it reaches $Y" | `standing-sell` | `ticker`, `shares`, `floorUsdPerShare`, `owner`, `deadlineHours` |
   | "cancel order 12" | `cancel` | `orderId` |

   `owner` is the connected wallet address from `baw wallet address --json`.

2. **Plan.**

   ```bash
   curl -s "$TARE_ORIGIN/api/plan" -H 'content-type: application/json' -d '{"intent":"standing-buy","ticker":"NVDA","usd":"10","owner":"0x...","toleranceBps":50}'
   ```

   The response carries `calls[]` (ordered `approve`, then `placeBuy` / `placeSell` / `swap` / `cancel`, each with
   `to`, `data`, `decoded`), `wrapper` and `why` (which wrapper and why, in shares), `decomposition`
   (`grossBps`, `unitBps`, `netBps`), `minShares` (the floor that will be signed) and `session`.
   If `ok` is false, relay `code` and `message` verbatim and stop. Codes: `BAD_REQUEST`, `BOOK_NOT_DEPLOYED`,
   `NO_WRAPPER`, `DEGRADED`, `NO_REFERENCE`.

3. **Explain before signing.** Tell the user, in one short paragraph: which wrapper, how many shares they will
   get at least, the floor they sign, that their USDT stays in their wallet until the fill, and the session
   (if New York is closed, the reference is aged and is not a live price).

4. **Preview and sign through the wallet skill.** Developer Mode must be enabled
   (`baw wallet settings --json`, `devMode.enabled=true`). For each call in order:

   ```bash
   baw contract-call preview --chain 56 --to <call.to> --data <call.data> --value 0 --json
   baw contract-call execute --requestId <requestId> --json
   ```

   Always read `references/external-sign.md` of the wallet skill first for the exact flags. Confirm with the
   user before each `execute`. An `orderId` or `requestId` is not a completed action: poll until the status is
   final before reporting anything.

5. **After placing.** Tell the user the keeper watches the order at every hour, that it may refuse (and why),
   and that `/api/orders?owner=<address>` and the Orders page show a plain-language diary.

## Answers to common questions

- "Which wrapper is best right now?" call `/api/ticker/<TICKER>`; report `bestIndex`, each wrapper's unit and
  shares for the quoted amount, and the session note. Do not compare token prices.
- "What did my orders do?" call `/api/orders?owner=<address>` and summarise each `diary`.
- "Is it safe to leave it overnight?" explain the floor: the chain refuses any fill below the shares signed.

## Rules

- Never state a price as a deal when `session.referenceAgeSec` is above zero; say the reference is aged.
- Never pass a unit to anything. The contract reads it on-chain in the fill transaction.
- Never sign from a URL or address that is not the one returned by `/api/plan`.
- If a data source is degraded (`DEGRADED`), say so; do not guess.
