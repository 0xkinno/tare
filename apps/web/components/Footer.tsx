import Link from 'next/link';

export function Footer() {
  const book = process.env.NEXT_PUBLIC_TAREBOOK;
  const registry = process.env.NEXT_PUBLIC_REGISTRY;
  return (
    <footer className="mx-auto mt-24 w-[min(1180px,calc(100%-24px))] border-t border-rule py-10 text-sm text-graphite">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <p className="font-display text-xl text-ink">tare</p>
          <p className="mt-2 max-w-xs">Wrappers quote. Shares decide.</p>
        </div>
        <ul className="space-y-1.5">
          <li><Link className="hover:text-ink" href="/app">Shelf</Link></li>
          <li><Link className="hover:text-ink" href="/app/orders">Standing orders</Link></li>
          <li><Link className="hover:text-ink" href="/app/holdings">Holdings in shares</Link></li>
          <li><Link className="hover:text-ink" href="/app/agent">Keeper agent</Link></li>
        </ul>
        <ul className="space-y-1.5">
          <li><Link className="hover:text-ink" href="/judge">Judge path</Link></li>
          <li><Link className="hover:text-ink" href="/proof">Proof</Link></li>
          <li><Link className="hover:text-ink" href="/verify">Verify a fill</Link></li>
          <li><a className="hover:text-ink" href="/api/mcp">MCP endpoint</a></li>
          <li><a className="hover:text-ink" href="/.well-known/agent-card.json">Agent card</a></li>
        </ul>
        <ul className="space-y-1.5 font-mono text-xs">
          <li>{book ? <a className="hover:text-ink" href={`https://bscscan.com/address/${book}`}>TareBook {book.slice(0, 8)}…</a> : 'TareBook: not deployed'}</li>
          <li>{registry ? <a className="hover:text-ink" href={`https://bscscan.com/address/${registry}`}>Registry {registry.slice(0, 8)}…</a> : 'Registry: not deployed'}</li>
          <li>MIT license</li>
          <li>Fonts: Fontshare FFL, JetBrains Mono OFL</li>
        </ul>
      </div>
      <p className="mt-8 text-xs">Spot only. BSC mainnet. Tokenized stocks are not shares; read the issuer terms. Not investment advice.</p>
    </footer>
  );
}
