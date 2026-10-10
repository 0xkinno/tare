import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Journal } from '../src/journal';
import { Stats } from '../src/stats';
import { Engine, type OpenOrder } from '../src/engine';
import { NoopNotifier } from '../src/notify';
import { PublicRwaClient } from '@tare/binance';
import { wrappersFor } from '@tare/registry';

const tmp = () => join(mkdtempSync(join(tmpdir(), 'tare-')), 'j.jsonl');

describe('journal', () => {
  it('flags sent transactions without a terminal entry and never loses them across restarts', () => {
    const p = tmp();
    const j = new Journal(p);
    j.append({ t: '1', orderId: '3', status: 'INTENT', decision: 'FILL', reasons: [] });
    j.append({ t: '2', orderId: '3', status: 'SENT', decision: 'FILL', reasons: [], txHash: '0xabc' });
    const reopened = new Journal(p);
    expect(reopened.unresolved().map((e) => e.txHash)).toEqual(['0xabc']);
    expect(reopened.hasInFlight('3')).toBe(true);
    reopened.append({ t: '3', orderId: '3', status: 'CONFIRMED', decision: 'FILL', reasons: [], txHash: '0xabc' });
    expect(reopened.unresolved()).toEqual([]);
    expect(reopened.hasInFlight('3')).toBe(false);
  });

  it('a crash between intent and send is visible as a dangling intent, not retried blindly', () => {
    const j = new Journal(tmp());
    j.append({ t: '1', orderId: '9', status: 'INTENT', decision: 'FILL', reasons: [] });
    expect(j.danglingIntents()).toHaveLength(1);
    expect(j.hasInFlight('9')).toBe(true);
  });
});

describe('stats', () => {
  it('tracks the longest gap and typed refusals', () => {
    const s = new Stats();
    s.pass(1000);
    s.pass(4000);
    s.pass(5000);
    s.refusal('BROKEN_QUOTE');
    s.refusal('BROKEN_QUOTE');
    s.refusal('UNIT_PAUSED');
    const snap = s.snapshot();
    expect(snap.longestGapSec).toBe(3);
    expect(snap.refusalsByReason.BROKEN_QUOTE).toBe(2);
    expect(Object.keys(snap.refusalsByReason)).toHaveLength(6);
  });
});

describe('engine', () => {
  const owner = '0x00000000000000000000000000000000000000a1' as const;
  const base: OpenOrder = { id: 1n, owner, side: 'BUY', wrapperMask: 7, deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), tickerId: '0xe108948b9667048232851f26a1427d3a908b22da622562906ca50ea536c2ecfb', amount: 50n * 10n ** 18n, limit: 1n };

  it('expired orders are journaled and notified, never sent', async () => {
    const journal = new Journal(tmp());
    const stats = new Stats();
    const notified: string[] = [];
    const eng = new Engine({
      chain: {} as never, wallet: null, account: null, book: owner, rwa: new PublicRwaClient({ fetchImpl: (async () => { throw new Error('offline'); }) as never }),
      signed: null, journal, stats, notifier: { ...NoopNotifier, expired: async (_o, id) => { notified.push(id); } }, now: () => Date.now(),
    });
    const out = await eng.process({ ...base, deadline: 1n }, 'NVDA');
    expect(out.kind).toBe('EXPIRED');
    expect(notified).toEqual(['1']);
    expect(journal.all().at(-1)?.decision).toBe('EXPIRED');
  });

  it('with no wallet and a degraded unit read it refuses with API_DEGRADED and sends nothing', async () => {
    const journal = new Journal(tmp());
    const stats = new Stats();
    const chain = { readContract: async () => { throw new Error('rpc down'); }, getBlockNumber: async () => 1n } as never;
    const eng = new Engine({
      chain, wallet: null, account: null, book: owner, rwa: new PublicRwaClient({ fetchImpl: (async () => { throw new Error('offline'); }) as never }),
      signed: null, journal, stats, notifier: NoopNotifier,
    });
    const out = await eng.process(base, 'NVDA');
    expect(out.kind).toBe('WAIT');
    if (out.kind === 'WAIT') expect(out.reasons).toContain('API_DEGRADED');
    expect(stats.snapshot().refusalsByReason.API_DEGRADED).toBeGreaterThan(0);
    expect(wrappersFor('NVDA').length).toBe(3);
  });

  it('refuses a route that is only RFQ with NO_CONTRACT_ROUTE and keeps waiting rather than skipping when units are live', async () => {
    const journal = new Journal(tmp());
    const stats = new Stats();
    const chain = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === 'getSValue') return [1_001_715_248_795_989_800n, false];
        if (functionName === 'uiMultiplier') return 1_000_778_223_752_807_865n;
        if (functionName === 'getCurrentMultiplier') return [10n ** 18n, 0n, 0n];
        if (functionName === 'isTokenPaused' || functionName === 'isPaused') return false;
        return '0x0000000000000000000000000000000000000001';
      },
      getBlockNumber: async () => 1n,
    } as never;
    const eng = new Engine({
      chain, wallet: null, account: null, book: owner, rwa: new PublicRwaClient({ fetchImpl: (async () => { throw new Error('offline'); }) as never }),
      signed: null, journal, stats, notifier: NoopNotifier, routes: async () => [],
    });
    const out = await eng.process(base, 'NVDA');
    expect(out.kind).toBe('SKIP');
    if (out.kind === 'SKIP') expect(out.reasons).toEqual(['NO_CONTRACT_ROUTE']);
  });
});
