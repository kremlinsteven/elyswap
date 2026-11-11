import { BRAND, CHAIN } from "@/config/brand";
import { CANONICAL } from "@/config/chains";
import { NO_PROMISE, PLANNED, TRUST_LINE } from "@/lib/content";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description} It never takes custody and charges no fee.`,
    "",
    "## Pages",
    `- ${BRAND.url}/routes: Route planner. Live quotes for the canonical bridge, Relay direct, via Robinhood Chain and via Solana.`,
    `- ${BRAND.url}/withdrawals: Canonical withdrawal tracker with challenge countdown and the claim on HyperEVM.`,
    `- ${BRAND.url}/track: Hop tracker for any source transaction.`,
    `- ${BRAND.url}/journeys: Journey book (ElyswapJourneyBook contract on ${CHAIN.name}).`,
    `- ${BRAND.url}/method: Method, sources, measured times and limits.`,
    "",
    "## Read-only JSON",
    `- GET ${BRAND.url}/api/quote?route=<canonical|relay-direct|via-robinhood|via-solana>&amount=<HYPE>`,
    `- GET ${BRAND.url}/api/withdrawals?address=<0x…> or ?tx=<Elysium tx>`,
    `- GET ${BRAND.url}/api/rollup`,
    `- GET ${BRAND.url}/api/stats`,
    `- GET ${BRAND.url}/api/track?chain=<elysium|hyperevm|robinhood|solana>&tx=<hash>`,
    "",
    "## Limits",
    `- ${NO_PROMISE}`,
    `- ${TRUST_LINE}`,
    `- Canonical bridge contracts on HyperEVM: Rollup ${CANONICAL.rollup}, Outbox ${CANONICAL.outbox}.`,
    "",
    "## Planned",
    ...PLANNED.map((l) => `- ${l.name}: ${l.text}`),
    "",
    `Network: ${CHAIN.name} (chain id ${CHAIN.id}, gas ${CHAIN.nativeSymbol}).`,
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
