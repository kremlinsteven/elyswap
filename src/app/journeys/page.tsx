import { PageHead } from "@/components/site/PageHead";
import { BookView } from "@/components/tools/BookView";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/journeys",
  title: "Journey book on Elysium | Elyswap",
  description: "Write a multi-hop journey (route, hop transactions, status) to ElyswapJourneyBook on Elysium so it can be shared and checked. The contract holds no funds and has no admin.",
});

export default function JourneysPage() {
  return (
    <>
      <PageHead eyebrow="Journey book" title="A public record of your route.">
        Open a journey with its planned hops, then record each hop&apos;s source and delivery transaction. Anyone with the number can read it and check every hash on its own chain. One transaction can prove only one hop of one journey.
      </PageHead>
      <BookView />
    </>
  );
}
