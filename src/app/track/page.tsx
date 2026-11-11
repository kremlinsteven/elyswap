import { PageHead } from "@/components/site/PageHead";
import { TrackView } from "@/components/tools/TrackView";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/track",
  title: "Hop tracker for HYPE bridge transfers | Elyswap",
  description: "Follow each hop of a transfer out of Elysium from its source transaction: the receipt on its chain, the bridge's own status and the delivery transaction, with explorer links.",
});

export default function TrackPage() {
  return (
    <>
      <PageHead eyebrow="Hop tracker" title="Every hop, from send to land.">
        Paste the source transaction of each hop. Elyswap reads the receipt on that chain, asks the bridge which request it started, and links the delivery on the other side. Canonical withdrawals show their challenge stage.
      </PageHead>
      <TrackView />
    </>
  );
}
