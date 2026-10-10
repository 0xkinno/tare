import { REFUSAL_REASONS, type RefusalReason } from '@tare/kernel';

/** Counters published at /api/agent/keeper: passes, longest gap, fills, refusals by reason, last error. */
export class Stats {
  passes = 0;
  fills = 0;
  longestGapMs = 0;
  lastPassAt: number | null = null;
  lastError: { at: string; message: string } | null = null;
  startedAt = Date.now();
  readonly refusals: Record<RefusalReason, number> = Object.fromEntries(REFUSAL_REASONS.map((r) => [r, 0])) as Record<RefusalReason, number>;
  earnedUsdt = 0n;
  gasSpentWei = 0n;

  pass(now = Date.now()): void {
    if (this.lastPassAt !== null) this.longestGapMs = Math.max(this.longestGapMs, now - this.lastPassAt);
    this.lastPassAt = now;
    this.passes++;
  }
  fill(): void {
    this.fills++;
  }
  refusal(r: RefusalReason): void {
    this.refusals[r]++;
  }
  error(message: string): void {
    this.lastError = { at: new Date().toISOString(), message: message.slice(0, 300) };
  }
  snapshot() {
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      passes: this.passes,
      fills: this.fills,
      longestGapSec: Math.round(this.longestGapMs / 1000),
      lastPassAt: this.lastPassAt ? new Date(this.lastPassAt).toISOString() : null,
      refusalsByReason: this.refusals,
      lastError: this.lastError,
      selfFunding: { earnedUsdtWei: this.earnedUsdt.toString(), gasSpentWei: this.gasSpentWei.toString() },
    };
  }
}
