import { NextResponse } from "next/server";
import { rpcOn } from "@/lib/server/multirpc";

export const dynamic = "force-dynamic";

/* Live facts for the header and footer: Elysium block and gas, HyperEVM block. Single-flight, 8 s. */

type Facts = { block: number | null; gasWei: string | null; hyperBlock: number | null; readAt: number };
let cache: { at: number; value: Facts } | null = null;
let inflight: Promise<void> | null = null;

const num = (h: string | null) => (h ? Number(BigInt(h)) : null);

export async function GET() {
  if (!cache || Date.now() - cache.at > 8_000) {
    inflight ??= Promise.all([
      rpcOn<string>("elysium", "eth_blockNumber", []).catch(() => null),
      rpcOn<string>("elysium", "eth_gasPrice", []).catch(() => null),
      rpcOn<string>("hyperevm", "eth_blockNumber", []).catch(() => null),
    ])
      .then(([b, g, h]) => {
        const value: Facts = { block: num(b), gasWei: g ? BigInt(g).toString() : null, hyperBlock: num(h), readAt: Date.now() };
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
