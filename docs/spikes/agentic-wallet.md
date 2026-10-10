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

## What needs the owner

Sign-in is a QR confirmation in the Binance app, and Developer Mode (contract calls) must be enabled in the app
security settings. Commands, from the repository root:

```powershell
baw auth signin --json     # shows pairingCode and urlForWeb
baw auth verify --qrCodeId <qrCodeId> --json   # blocks until confirmed in the app, up to five minutes
baw wallet settings --json # devMode.enabled must be true
```

Then ask the agent: "Set a standing order: buy $0.20 of Nvidia, never more than 0.5% over the real price."

## Findings so far (DX log)

- The skill routes contract calls through `contract-call preview` then `execute`, and requires Developer Mode.
- The skill states an order id is not a completed swap; the Tare skill repeats this rule.
- Nothing is claimed as proven until a transaction hash is recorded below.

## Mainnet run

Not recorded yet. When it exists: the approve and placeBuy transaction hashes go here, with the verifier output for
the resulting order.
