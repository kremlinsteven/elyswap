"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useFocusTrap } from "@/components/site/useFocusTrap";
import { NavWallet } from "@/components/wallet/WalletButton";
import { CaPill } from "@/components/site/CaCopy";
import { CloseIcon, MenuIcon } from "@/components/site/Icons";
import { ASSETS } from "@/config/assets";
import { BRAND } from "@/config/brand";
import { MORE, NAV } from "@/lib/content";

export function Logo() {
  return (
    <Link href="/" className="es-logo" aria-label={`${BRAND.name} home`}>
      {/* Plain img: next/image blanks tiny icons. */}
      <img src={ASSETS.mark} alt="" width={28} height={28} />
      <span className="es-logo-word">{BRAND.name}</span>
      <span className="es-logo-sub">
        HYPE routes
        <br />
        out of Elysium
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useFocusTrap(sheet, open, close);

  const [seen, setSeen] = useState(path);
  if (seen !== path) {
    setSeen(path);
    setOpen(false);
  }

  return (
    <header className="es-header">
      <div className="es-wrap es-header-row">
        <Logo />
        <nav className="es-links" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="es-link" aria-current={path === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="es-header-end">
          <span className="hidden sm:inline-flex">
            <CaPill />
          </span>
          <NavWallet />
          <button type="button" className="es-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="nav-burger">
            {open ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <div ref={sheet} className="es-sheet" role="dialog" aria-modal="true" aria-label="Menu" data-testid="nav-sheet">
          {[...NAV, ...MORE].map((n) => (
            <Link key={n.href} href={n.href} onClick={close}>
              {n.label}
            </Link>
          ))}
          <div className="mt-6">
            <CaPill testid="ca-pill-sheet" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
