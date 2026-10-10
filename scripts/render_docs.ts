// Renders README.md and PROOF.md from docs/templates and the generated summary files. No number is typed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import './mainnet/lib';

const J = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null);
const disc = J<Record<string, unknown>>('data/discovery/summary.json') ?? {};
const auto = J<Record<string, unknown>>('data/autonomy/summary.json') ?? {};
const counter = J<Record<string, unknown>>('data/counterfactual/summary.json') ?? {};
const agg = J<Record<string, unknown>>('data/counterfactual/aggregator_snapshot.json') ?? {};
const job = J<Record<string, unknown>>('evidence/mainnet/erc8183_job.json') ?? {};
const identity = J<Record<string, unknown>>('evidence/mainnet/identity.json') ?? {};
const forgeLog = existsSync('evidence/fork/forge_test_full.txt') ? readFileSync('evidence/fork/forge_test_full.txt', 'utf8') : '';
const forgeMatch = [...forgeLog.matchAll(/(\d+) tests passed, (\d+) failed/g)].pop();

// unit tests: sum "Tests  N passed" over package logs recorded by scripts/run_unit_tests.ts
const unit = J<{ total: number }>('data/tests/unit_summary.json');

const bqs = disc.brokenQuotes as { flaggedTotal?: number; observations?: number } | undefined;
const brokenTotal = bqs?.flaggedTotal ?? 0;
const brokenObs = bqs?.observations ?? 0;

const ctx: Record<string, unknown> = {
  discovery: disc, ...disc, autonomy: auto, counter, agg, job, brokenTotal, brokenObservations: brokenObs,
  forge: { passed: forgeMatch?.[1] ?? '–', failed: forgeMatch?.[2] ?? '–' },
  unitTests: unit?.total ?? '–',
  testsTotal: (Number(forgeMatch?.[1] ?? 0) + (unit?.total ?? 0)) || '–',
  origin: process.env.PUBLIC_WEB_ORIGIN ?? '',
  book: process.env.NEXT_PUBLIC_TAREBOOK ?? '',
  registry: process.env.NEXT_PUBLIC_REGISTRY ?? '',
  agentId: String(identity.agentId ?? '–'),
};

const get = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ctx);
const fmt = (v: unknown): string => {
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toLocaleString('en-US');
    return Math.abs(v) >= 100 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2);
  }
  return v === undefined || v === null ? '–' : String(v);
};

for (const [tpl, out] of [['docs/templates/README.template.md', 'README.md'], ['docs/templates/PROOF.template.md', 'PROOF.md']] as const) {
  if (!existsSync(tpl)) continue;
  const text = readFileSync(tpl, 'utf8').replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, k: string) => {
    const v = get(k);
    if (v === undefined) throw new Error(`${tpl}: missing key ${k}`);
    return fmt(v);
  });
  writeFileSync(out, text);
  console.log('wrote', out, text.length);
}
