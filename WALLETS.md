# Wallets to fund (BSC mainnet, chain 56)

Keys live only in `.env.local` (gitignored). These are addresses, safe to share.

| Role | Address | Fund with | Used for |
|---|---|---|---|
| Deployer | `0xAc543626f964bc06883C0b58911DA308A122fa49` | 0.02 BNB | Deploy and verify WrapperRegistry + TareBook, register wrappers, set routers (about 0.01 BNB of gas at normal BSC prices; the rest is headroom for redeploys) |
| Keeper | `0x440860e5Dfb8E7d3E1903A0eC3d3589e2fC5CF73` | 0.01 BNB (add 5 to 10 USDT later for the self-funding loop) | Fills and refusals gas, ERC-8004 identity registration, ERC-8183 certificate job |
| User (owner test wallet) | `0x39397C8dFE8608b2C1Ce84504a798d6b39363Ed5` | 0.005 BNB + 25 to 40 USDT (BEP-20) | Approve, place, cancel, instant buy, Agentic Wallet run. Leave it untouched during the autonomy window |

Total: about 0.035 BNB and 25 to 40 USDT. Do not send more; mainnet spend beyond this needs your approval first.
