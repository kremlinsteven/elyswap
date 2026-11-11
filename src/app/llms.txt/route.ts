import { BRAND, CHAIN } from "@/config/brand";
import { LIMITS, PLANNED, TOOLS } from "@/lib/content";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description} Read-only: it never moves funds and shows no single yield figure.`,
    "",
    "## Pages",
    ...TOOLS.map((t) => `- ${BRAND.url}${t.href}: ${t.word}. ${t.line}`),
    `- ${BRAND.url}/book: Range plan book (ElyearnRangeBook contract)`,
    `- ${BRAND.url}/method: Method, sources and limits`,
    "",
    "## Read-only JSON",
    `- GET ${BRAND.url}/api/pools`,
    `- GET ${BRAND.url}/api/pool?id=<v4 pool id>`,
    `- GET ${BRAND.url}/api/positions?owner=<0x address>`,
    "",
    "## Limits",
    ...LIMITS.map((l) => `- ${l}`),
    "",
    "## Planned",
    ...PLANNED.map((l) => `- ${l}`),
    "",
    `Network: ${CHAIN.name} (chain id ${CHAIN.id}, gas ${CHAIN.nativeSymbol}).`,
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
