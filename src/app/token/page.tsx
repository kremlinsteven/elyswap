import Link from "next/link";
import { CaRow } from "@/components/site/CaCopy";
import { PageHead } from "@/components/site/PageHead";
import { BRAND, LAUNCHPAD, TOKEN, buyUrl } from "@/config/brand";
import { PLANNED } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/token",
  title: `${BRAND.symbol} token | Elyswap`,
  description: `${BRAND.symbol} is a memecoin on Elysium (gas HYPE). Planning, tracking and claiming on Elyswap are free and need no token. Fee discounts are planned only if Elyswap ever charges a fee.`,
});

export default function TokenPage() {
  const buy = buyUrl();
  return (
    <>
      <PageHead eyebrow={BRAND.symbol} title="A memecoin. The tool works without it.">
        {BRAND.symbol} launches on Elysium, where gas is paid in HYPE. The launchpad is to be announced. Nothing on this site needs the token, and no value is promised.
      </PageHead>
      <div className="es-wrap grid gap-6 pb-24">
        <CaRow testid="ca-token" network="Elysium" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="es-card">
            <p className="es-eyebrow">Today</p>
            <ul className="es-body m-0 grid gap-2 pl-5">
              <li>Route planner, withdrawal tracker, claim, hop tracker and journey book: free, no token needed.</li>
              <li>Elyswap charges no fee. The fees you pay go to the bridge you choose (shown before you sign) and to gas.</li>
              <li>Holding {BRAND.symbol} gives no share of anything and no say over the bridges.</li>
              <li>Contract address: {TOKEN.isLive ? "published above" : "TBA, published here at launch"}. Launchpad: {LAUNCHPAD.name}.</li>
            </ul>
          </div>
          <div className="es-card">
            <p className="es-eyebrow">Planned, not built</p>
            <ul className="es-body m-0 grid gap-2 pl-5">
              {PLANNED.map((p) => (
                <li key={p.name}>
                  <b className="font-normal text-white">{p.name}.</b> {p.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="es-warn">Only trust the address shown on this page and on {BRAND.xHandle}. Elyswap never sends direct messages first and never asks for a seed phrase.</div>
        <div className="flex flex-wrap gap-3">
          {buy ? (
            <a className="es-btn" href={buy} target="_blank" rel="noreferrer">
              View {BRAND.symbol} on the explorer
            </a>
          ) : (
            <button type="button" className="es-btn" disabled>
              At launch
            </button>
          )}
          <Link href="/routes" className="es-btn ghost">
            Use the route planner
          </Link>
        </div>
      </div>
    </>
  );
}
