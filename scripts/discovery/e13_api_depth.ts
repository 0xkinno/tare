// E13: the five depth endpoints Tare wires into the product: gas-limit, transaction-detail-by-txhash, top-liquidity,
// address portfolio and broadcast. Records the exact request that worked and the shape of the answer.
import { writeFileSync } from 'node:fs';
import '../mainnet/lib';
import { SignedClient } from '@tare/binance';
import { wrappersFor } from '@tare/registry';

const key = process.env.BINANCE_WEB3_API_KEY, secret = process.env.BINANCE_WEB3_SECRET_KEY;
if (!key || !secret) throw new Error('keys required');
const c = new SignedClient({ apiKey: key, secretKey: secret, origin: process.env.BINANCE_WEB3_ORIGIN });
const BOOK = process.env.NEXT_PUBLIC_TAREBOOK as string;
const KEEPER = process.env.KEEPER_ADDRESS as string;
const nvdab = wrappersFor('NVDA').find((w) => w.issuer === 'BSTOCKS')!;
const FILL = '0xca034f5a82ca44aca76508def94b30ca6827ccd4ac17d309d454ebc91b08c73d';
const out: Record<string, unknown> = {};
const show = (k: string, r: unknown) => { out[k] = r; console.log(k, JSON.stringify(r).slice(0, 700)); };

show('gasPrice', await c.raw('GET', '/api/v1/dex/pre-transaction/gas-price', { binanceChainId: '56' }));
show('gasLimit_cancel', await c.raw('POST', '/api/v1/dex/pre-transaction/gas-limit', {}, { binanceChainId: '56', evmTx: { from: KEEPER, to: BOOK, data: '0x40e58ee50000000000000000000000000000000000000000000000000000000000000001' } }));
show('txDetail', await c.raw('GET', '/api/v1/dex/post-transaction/transaction-detail-by-txhash', { binanceChainId: '56', txHash: FILL }));
show('topLiquidity', await c.raw('GET', '/api/v1/dex/market/token/top-liquidity', { binanceChainId: '56', tokenContractAddress: nvdab.token }));
show('portfolioChains', await c.raw('GET', '/api/v1/dex/market/portfolio/supported/chain', {}));
show('portfolioOverview', await c.raw('GET', '/api/v1/dex/market/portfolio/overview', { binanceChainId: '56', address: process.env.USER_ADDRESS as string, timeFrame: '3' }));
show('tokenLatestPnl', await c.raw('GET', '/api/v1/dex/market/portfolio/token/latest-pnl', { binanceChainId: '56', address: process.env.USER_ADDRESS as string, tokenContractAddress: nvdab.token }));
show('dexHistory', await c.raw('GET', '/api/v1/dex/market/portfolio/dex-history', { binanceChainId: '56', address: process.env.USER_ADDRESS as string, limit: '5' }));
// Broadcast with a deliberately invalid raw transaction: reveals the request contract without sending anything.
show('broadcastInvalid', await c.raw('POST', '/api/v1/dex/pre-transaction/broadcast-transaction', {}, { binanceChainId: '56', signedTransaction: '0x00', evmTx: { from: KEEPER } }));
writeFileSync('data/discovery/e13_api_depth.json', JSON.stringify(out, null, 1));
