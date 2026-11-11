import { PageHead } from "@/components/site/PageHead";
import { PlannerView } from "@/components/tools/PlannerView";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/routes",
  title: "Route planner: HYPE from Elysium to HyperEVM | Elyswap",
  description: "Compare the canonical bridge with Relay direct, via Robinhood Chain and via Solana: live quotes with every fee, measured delivery times and the trust each route adds.",
});

export default function RoutesPage() {
  return (
    <>
      <PageHead eyebrow="Route planner" title="Every way out of Elysium, side by side.">
        Enter an amount. Each route shows the HYPE you end with, the measured time with its sample, the token you hold between hops and whom you trust. Then send the first hop from your own wallet.
      </PageHead>
      <PlannerView />
    </>
  );
}
