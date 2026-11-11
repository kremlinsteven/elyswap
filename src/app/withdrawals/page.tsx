import { LiveRollup } from "@/components/home/LiveRollup";
import { PageHead } from "@/components/site/PageHead";
import { WithdrawalsView } from "@/components/tools/WithdrawalsView";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/withdrawals",
  title: "Canonical withdrawal tracker and claim | Elyswap",
  description: "Find your Elysium → HyperEVM canonical withdrawals, see the challenge-period countdown read from the rollup on HyperEVM, and claim the ready ones with a proof checked before you sign.",
});

export default function WithdrawalsPage() {
  return (
    <>
      <PageHead eyebrow="Withdrawal tracker" title="Where is my HYPE, and when can I claim it?">
        Canonical withdrawals from Elysium wait for an assertion on HyperEVM to pass its challenge period. Then someone has to send the claim. Paste the receiving address or the withdrawal transaction.
      </PageHead>
      <div className="es-wrap pb-8">
        <LiveRollup />
      </div>
      <WithdrawalsView />
    </>
  );
}
