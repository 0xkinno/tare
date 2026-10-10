import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc } from 'wagmi/chains';
import { http } from 'wagmi';

// Injected wallets work without a WalletConnect project id; WalletConnect and mobile deep links need it.
export const config = getDefaultConfig({
  appName: 'Tare',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '00000000000000000000000000000000',
  chains: [bsc],
  transports: { [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed1.defibit.io') },
  ssr: true,
});
