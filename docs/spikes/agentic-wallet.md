# Spike: Agentic Wallet (E10)

Goal: sign `TareBook.placeBuy` through the Binance Agentic Wallet in Developer Mode, preview it, and run it on
mainnet with a small amount.

## What was set up

| Step | State | Evidence |
|---|---|---|
| Wallet Skills installed in the project | Done | `.agents/skills/binance-agentic-wallet` (installed from the Skills Hub), not committed |
| `baw` CLI 1.10.0 installed | Done | `baw --version` |
| Wallet connection status | `UNCONNECTED` before sign-in | `baw wallet status --json` |
| Tare skill written | Done | `skills/tare/SKILL.md` |
| Plan endpoint returns exact calls | Done | `POST /api/plan` |

## Mainnet run (done)

The owner signed in with the QR confirmation and enabled Developer Mode. Through `baw` only, in the order the skill
prescribes (`contract-call preview`, read the parsed result, then `execute`):

| Step | Result |
|---|---|
| Plan | `POST /api/plan`, standing buy of $0.20 of NVDA, 1% tolerance, owner = the Agentic Wallet address |
| Approve USDT to TareBook | preview parsed as `Approve`, no risks; [0xdbc1aacbb517cae00028170504e6dcde708c7a6814ff6e642d2e4fe5a5816bc8](https://bscscan.com/tx/0xdbc1aacbb517cae00028170504e6dcde708c7a6814ff6e642d2e4fe5a5816bc8) |
| `placeBuy` | preview parsed as a contract interaction on TareBook, simulation code `000000000`; [0xf4e2bdf75d643db18396e740eb2354b79cd73348f1f217f4c3c8e08c2c6d4b45](https://bscscan.com/tx/0xf4e2bdf75d643db18396e740eb2354b79cd73348f1f217f4c3c8e08c2c6d4b45) |
| Order | id 7, owned by the Agentic Wallet address `0x6914c90EA6F8760910971af6e2fCE8850659542A` |
| Fill | by the keeper, no further action by the owner; [0xca034f5a82ca44aca76508def94b30ca6827ccd4ac17d309d454ebc91b08c73d](https://bscscan.com/tx/0xca034f5a82ca44aca76508def94b30ca6827ccd4ac17d309d454ebc91b08c73d) |
| Verifier | every invariant PASS, `evidence/mainnet/verify_order_7.txt` |

## Findings

- `devMode.enabled` was false after sign-in; `contract-call preview` then returned `351801 Developer mode is not
  enabled`. The switch exists only in the app.
- The parsed `Approve` preview is readable and names the spender; the `placeBuy` preview shows only the selector
  (`action: 0xc407b0c7`) because the book ABI is not known to the parser. A published ABI hook would make the preview
  say "place standing buy".
- The skill's rule that an order id is not a completed swap held: `execute` returned `BROADCASTED` with an `orderId`
  and a `txHash`, and the order was confirmed on-chain afterwards.
