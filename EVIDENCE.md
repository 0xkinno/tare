# EVIDENCE

Author: 0xkinno. Updated after every deployment and transaction. Amounts are small by design.

## Deployment (BSC mainnet, chain 56)

| Item | Value |
|---|---|
| WrapperRegistry | [0xdDf50D8e6C4283eAD3A28878AF2bb604c1F6B2ea](https://bscscan.com/address/0xdDf50D8e6C4283eAD3A28878AF2bb604c1F6B2ea#code) |
| TareBook | [0xa440a217B64c01659A1c911b795371C3C2e1A13e](https://bscscan.com/address/0xa440a217B64c01659A1c911b795371C3C2e1A13e#code) |
| Deployer | 0xAc543626f964bc06883C0b58911DA308A122fa49 |
| Deploy script | `contracts/script/Deploy.s.sol`, log `evidence/mainnet/deploy_log.txt`, broadcast `contracts/broadcast/Deploy.s.sol/56/run-latest.json` |
| Registry creation tx | [0xd9d10573...](https://bscscan.com/tx/0xd9d105734078a7470224a03d5108a41542dabafad44551fdefdf54442a5fbcd5) |
| TareBook creation tx | [0xf4153bb3...](https://bscscan.com/tx/0xf4153bb36435d9c9484284ed2013241727a3e00db257f2297761380620ad3967) |
| Wrappers registered | 75 across 51 tickers, 2 routers allowlisted (PancakeSwap v3 SmartRouter, v2 router) |
| Total deploy cost | about 0.00049 BNB (79 transactions, 0 failed) |
| Verification | BscScan (Etherscan v2 API): passed for both. Sourcify: attempted |

## Autonomy run (BSC mainnet)

| Step | Transaction |
|---|---|
| place buy-1 | [0xb9e3732002440184dd6e1e3dce9a698a8c6bae87a1e3df6e95a3761a4cc7fe9d](https://bscscan.com/tx/0xb9e3732002440184dd6e1e3dce9a698a8c6bae87a1e3df6e95a3761a4cc7fe9d) |
| place buy-2 | [0x609f1ea8ed86d9c0a0aeb839cdb755c6130933645fdeb1efc145390e84cd85d0](https://bscscan.com/tx/0x609f1ea8ed86d9c0a0aeb839cdb755c6130933645fdeb1efc145390e84cd85d0) |
| place sell-1 | [0x93400783b582541ab38e02c1e3d59dbe740be5442fefa946ee7f0de9a870f26e](https://bscscan.com/tx/0x93400783b582541ab38e02c1e3d59dbe740be5442fefa946ee7f0de9a870f26e) |
| fill, order 0 (CLOSED_WEEKEND) | [0x25201e459dff174275b60c9c14d91af1029915d8952f4481e5a8752f67a25e5f](https://bscscan.com/tx/0x25201e459dff174275b60c9c14d91af1029915d8952f4481e5a8752f67a25e5f) |
| fill, order 1 (CLOSED_WEEKEND) | [0x0cce0c2d122133e43ca7e760c08d233449bbc514a480c309ff1f516089384cf7](https://bscscan.com/tx/0x0cce0c2d122133e43ca7e760c08d233449bbc514a480c309ff1f516089384cf7) |
| fill, order 2 (CLOSED_WEEKEND) | [0xff0e3df3178c9d2ba38fbd3e78958e182dd70d87a470174a57a01feaaa15e073](https://bscscan.com/tx/0xff0e3df3178c9d2ba38fbd3e78958e182dd70d87a470174a57a01feaaa15e073) |
| deliberate refusal (manual fill reverted, ShareFloor), order 3 | [0x85047053106d890df200de6eba5f82e1064941d8228543234b29287f8b0483a9](https://bscscan.com/tx/0x85047053106d890df200de6eba5f82e1064941d8228543234b29287f8b0483a9) |
| place order to cancel | [0x771ed708c35ac3ec687c36cf5d6895f88a0df3cab96984ecf00b82b5938838f0](https://bscscan.com/tx/0x771ed708c35ac3ec687c36cf5d6895f88a0df3cab96984ecf00b82b5938838f0) |
| cancel, order 4 | [0x54e1ddb7e97cc38e8016524e8dcbf70bc5402787fee41cacf495da1da4cdf4c0](https://bscscan.com/tx/0x54e1ddb7e97cc38e8016524e8dcbf70bc5402787fee41cacf495da1da4cdf4c0) |

Verifier output per order: `evidence/mainnet/verify_order_0.txt`, `_1`, `_2`. Owner nonce at the fill blocks equals the nonce after placing: `data/autonomy/summary.json`.

## Agent Studio

| Item | Value |
|---|---|
| ERC-8004 agent id | 370049 |
| Registration tx | [0xbb53249d22b9979389b2694955f2c0aebcca93876672ba60bf9fb84eee7ea9b8](https://bscscan.com/tx/0xbb53249d22b9979389b2694955f2c0aebcca93876672ba60bf9fb84eee7ea9b8) |
| ERC-8183 job id | 56961 (SUBMITTED) |
| Job manifest hash | `0x2ded7e54931a907cd88aba40b2f3ee17aa32c4b8be477f632b14c680ec593460` |
| Allowlist of the aggregator router | [0xc04e7c28...](https://bscscan.com/tx/0xc04e7c280a6766f8114d420c061bc391fec8bbfb76cf86039e5ce777a36c56c3) |
