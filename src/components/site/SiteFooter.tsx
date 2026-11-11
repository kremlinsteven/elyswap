import Link from "next/link";
import { Logo } from "@/components/site/SiteHeader";
import { CaRow } from "@/components/site/CaCopy";
import { GithubIcon, XIcon } from "@/components/site/Icons";
import { BRAND, hasGithub } from "@/config/brand";
import { CANONICAL, CHAINS } from "@/config/chains";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/routes", label: "Route planner" },
      { href: "/withdrawals", label: "Withdrawal tracker" },
      { href: "/track", label: "Hop tracker" },
      { href: "/journeys", label: "Journey book" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/method", label: "Method and sources" },
      { href: "/method#routes", label: "Routes table" },
      { href: "/token", label: `${BRAND.symbol} token` },
    ],
  },
  {
    title: "On chain",
    links: [
      { href: CHAINS.elysium.explorer, label: "Elysium explorer", ext: true },
      { href: CHAINS.hyperevm.addressUrl(CANONICAL.outbox), label: "Outbox on HyperEVM", ext: true },
      { href: CANONICAL.app, label: "Official bridge page", ext: true },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="es-footer">
      <div className="es-wrap">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <Logo />
            <p className="es-small mt-5 max-w-[340px]">
              Compare the ways out of Elysium, track a canonical withdrawal through its challenge period and claim it on HyperEVM. Elyswap holds no funds and charges no fee.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={BRAND.x} target="_blank" rel="noreferrer" className="es-btn ghost sm" aria-label={`${BRAND.name} on X`}>
                <XIcon size={14} /> {BRAND.xHandle}
              </a>
              {hasGithub ? (
                <a href={BRAND.github} target="_blank" rel="noreferrer" className="es-btn ghost sm">
                  <GithubIcon size={14} /> Source
                </a>
              ) : null}
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.title} className="min-w-0">
              <p className="es-eyebrow">{c.title}</p>
              <ul className="m-0 grid list-none gap-3 p-0 text-[14px] text-[var(--mute)]">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {"ext" in l ? (
                      <a href={l.href} target="_blank" rel="noreferrer">
                        {l.label} ↗
                      </a>
                    ) : (
                      <Link href={l.href}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <CaRow testid="ca-footer" network="Elysium" />
        </div>
        <p className="es-small mt-8 max-w-[860px]">
          Elyswap is an independent tool. It is not run by the Elysium team or by any bridge it lists, and it never takes custody: every step is a transaction you sign in your own wallet, sent to the bridge&apos;s own contract. Third-party bridges add their own trust and
          fees, shown next to each route. {BRAND.symbol} is a memecoin; nothing on this site needs it.
        </p>
        <p className="es-small mt-6">© 2026 {BRAND.name}</p>
      </div>
    </footer>
  );
}
