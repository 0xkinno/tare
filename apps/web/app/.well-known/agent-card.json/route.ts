import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** A2A agent card for the Tare planner and certificate seller. */
export async function GET(req: Request) {
  const origin = process.env.PUBLIC_WEB_ORIGIN ?? new URL(req.url).origin;
  return NextResponse.json({
    name: 'Tare',
    description: 'Real shares per dollar for tokenized stocks on BNB Smart Chain. Wrappers quote. Shares decide.',
    url: `${origin}/api/mcp`,
    version: '0.1.0',
    provider: { organization: '0xkinno' },
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      { id: 'tare_shelf', name: 'Shelf', description: 'Every wrapper of a ticker with unit, route and net premium, in shares.' },
      { id: 'tare_decompose', name: 'Decompose', description: 'Split a wrapper price into gross, unit and net.' },
      { id: 'tare_best_route', name: 'Best route', description: 'The wrapper that delivers the most shares for an amount.' },
      { id: 'tare_verify_fill', name: 'Verify fill', description: 'Recompute a fill from chain logs.' },
      { id: 'tare_session', name: 'Session', description: 'Market session and reference age for a ticker.' },
    ],
    identity: process.env.KEEPER_AGENT_ID ? { standard: 'ERC-8004', chainId: 56, agentId: process.env.KEEPER_AGENT_ID } : null,
    payments: { standard: 'x402', endpoint: `${origin}/api/certificate` },
  });
}
