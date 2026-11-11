import { NextResponse } from "next/server";
import { rpc } from "@/lib/feeds/rpc";
import { quoteUsd } from "@/lib/server/pools";

export const dynamic = "force-dynamic";

/* Live facts for the header and footer: block, gas price, HYPE in dollars (with source). Single-flight, 8 s. */

type Facts = { block: number | null; gasWei: string | null; hypeUsd: { value: number; source: string } | null; readAt: number };
let cache: { at: number; value: Facts } | null = null;
let inflight: Promise<void> | null = null;

export async function GET() {
  if (!cache || Date.now() - cache.at > 8_000) {
    inflight ??= Promise.all([rpc<string>("eth_blockNumber", []).catch(() => null), rpc<string>("eth_gasPrice", []).catch(() => null), quoteUsd()])
      .then(([b, g, q]) => {
        const value: Facts = { block: b ? Number(BigInt(b)) : null, gasWei: g ? BigInt(g).toString() : null, hypeUsd: q.hype, readAt: Date.now() };
        if (value.block !== null || !cache) cache = { at: Date.now(), value };
      })
      .finally(() => {
        inflight = null;
      });
    await inflight;
  }
  if (!cache) return NextResponse.json({ error: "Chain data is not available yet." }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json(cache.value, { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
