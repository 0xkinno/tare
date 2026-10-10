'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { WalletButton } from './WalletButton';
import { EditionBanner } from './EditionBanner';

const LINKS: [string, string][] = [['Shelf', '/app'], ['Orders', '/app/orders'], ['Agent', '/app/agent'], ['Proof', '/proof']];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="sticky top-3 z-50 mx-auto w-[min(1180px,calc(100%-24px))]"
      >
        <nav aria-label="Primary" className="flex items-center justify-between gap-2 rounded-[var(--radius-capsule)] bg-[#16130E]/95 px-3 py-2 text-[#F4EFE5] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_18px_40px_-20px_rgba(0,0,0,.55)]">
          <Link href="/" className="flex items-center gap-2 pl-2 font-display text-xl tracking-tight">
            <span className="size-3 rounded-[4px] bg-net shadow-[0_0_14px_var(--color-net)]" /> tare
          </Link>
          <div className="hidden items-center gap-1 rounded-[14px] bg-white/5 p-1 text-sm md:flex">
            {LINKS.map(([l, h]) => (
              <Link key={h} href={h} className="rounded-[10px] px-3 py-1.5 text-[#F4EFE5]/80 transition hover:bg-white/10 hover:text-[#F4EFE5]">
                {l}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <WalletButton />
            <button className="grid size-9 place-items-center rounded-[12px] bg-white/10 md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="mt-2 grid gap-1 rounded-[var(--radius-capsule)] bg-[#16130E]/95 p-2 text-[#F4EFE5] md:hidden">
            {LINKS.map(([l, h]) => (
              <Link key={h} href={h} onClick={() => setOpen(false)} className="rounded-[12px] px-3 py-2 hover:bg-white/10">
                {l}
              </Link>
            ))}
          </div>
        )}
      </motion.header>
      <EditionBanner />
    </>
  );
}
