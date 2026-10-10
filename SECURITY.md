# Security

Author: 0xkinno.

## Model

| Actor | Trust | Can do |
|---|---|---|
| Owner | their own funds only | place, cancel; approve exact amounts |
| Keeper / any filler | none | call `fill`; at worst do nothing |
| Registry owner | curation | add wrappers, allowlist routers, deactivate wrappers; cannot touch funds |
| Issuer | external | pause tokens, change units; the book reads both at fill |
| Router | external, allowlisted | receives an exact approval during one call |

## Properties

See `INVARIANTS.md`. The contract has no admin withdrawal, no upgrade path, no custody between transactions, and no unit argument in `fill`.

## Secrets

- Private keys live in `.env.local` locally and in the host secret store only. They are never committed (`.gitignore`) and never sent to the web deployment.
- The web deployment holds the public data API key and public RPC settings only. It has no signing key.
- The keeper key is a dedicated hot wallet funded with gas only.

## Reporting

Open a private security advisory on the repository. Include the transaction hash or fork test that demonstrates the issue.

## Known assumptions

Aggregator router source is unverified (`DECISIONS.md` D5). Issuer unit sources are upgradeable by their issuers; a hostile upgrade is outside the model and visible in the verifier through the event unit versus the `eth_call` at the block.
