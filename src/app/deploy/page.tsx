import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DeployPanel } from "@/components/tools/DeployPanel";
import { PageHead } from "@/components/site/PageHead";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deploy (local only)", robots: { index: false, follow: false } };

// Owner tool, local only: on any public host this route is a 404.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export default async function DeployPage() {
  const host = (await headers()).get("host") ?? "";
  if (!LOCAL_HOST.test(host)) notFound();
  return (
    <>
      <PageHead eyebrow="Owner tool · localhost only" title="Deploy">
        Deploys ElyswapJourneyBook on Elysium from the connected wallet. No constructor arguments, no owner, no funds. After it lands: put the address in src/config/contracts.ts, run npm run verify-deployment
        with the address and the creation transaction, and remove this page.
      </PageHead>
      <DeployPanel />
    </>
  );
}
