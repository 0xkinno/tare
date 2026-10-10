'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { bscscan, dec } from '@/lib/format';

interface Row { ticker: string; symbol: string; issuer: string; token: string; tokensWad: string; unitWad: string | null; sharesWad: string | null; paused: boolean | null; error: string | null }
interface Payload { rows: Row[]; byTicker: Record<string, { sharesWad: string; wrappers: number }>; scanned: number }

export function HoldingsClient() {
  const { address, isConnected } = useAccount();
  const [d, setD] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    setD(null); setErr(null);
    fetch(`/api/holdings?owner=${address}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message ?? 'holdings unavailable'); if (alive) setD(j as Payload); })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : 'holdings unavailable'));
    return () => { alive = false; };
  }, [address]);

  if (!isConnected) return <div className="rounded-[var(--radius-card)] border border-rule bg-paper-3 p-8 text-center"><p className="mb-4">Connect a wallet to read its holdings.</p><div className="flex justify-center"><ConnectButton /></div></div>;
  if (err) return <p role="alert" className="rounded-[14px] bg-gross/10 p-4">Holdings unavailable: {err}</p>;
  if (!d) return <div className="skeleton h-40 w-full" aria-label="Loading holdings" />;
  if (d.rows.length === 0) return <p className="rounded-[14px] bg-paper-2 p-4">This wallet holds none of the {d.scanned} wrappers on the Shelf.</p>;

  return (
    <div className="grid gap-6">
      {Object.entries(d.byTicker).map(([t, v]) => (
        <section key={t} className="rounded-[var(--radius-card)] border border-rule bg-paper-3 p-5 shadow-[var(--shadow-lift)]">
          <h2 className="font-display text-2xl font-semibold">You own <span className="num">{dec(v.sharesWad, 4)}</span> {t} shares{v.wrappers > 1 ? ` across ${v.wrappers} wrappers` : ''}</h2>
          <ul className="mt-3 divide-y divide-rule text-sm">
            {d.rows.filter((r) => r.ticker === t).map((r) => (
              <li key={r.token} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <a className="font-medium underline" href={bscscan('token', r.token)} target="_blank" rel="noreferrer">{r.symbol}</a>
                <span className="num">{dec(r.tokensWad, 6)} tokens</span>
                <span className="text-graphite">unit {r.unitWad ? dec(r.unitWad, 6) : 'unread'}</span>
                <span className="num ml-auto font-medium">{r.sharesWad ? `${dec(r.sharesWad, 4)} shares` : <span className="text-gross">{r.error ?? 'unreadable'}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
