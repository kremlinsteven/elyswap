import { NextResponse } from "next/server";
import { chainById } from "@/config/chains";
import { RELAY_SNAPSHOT, relaySeconds, spread, type Spread } from "@/lib/measured";
import { relayRequests, type RelayRequest } from "@/lib/server/relayapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * Measured Relay delivery times for HYPE leaving Elysium, from Relay's own request log: origin transaction time to
 * destination transaction time, per destination chain. Up to 150 recent requests, recomputed every 30 minutes (Relay rate-limits its keyless log) and
 * shared by every visitor. Falls back to the dated snapshot when the log cannot be read.
 */

type Stats = { source: "live" | "snapshot"; api: string | null; sample: number; from: string | null; to: string | null; byDestination: Record<string, Spread>; readAt: number };
let cache: { at: number; value: Stats } | null = null;
let inflight: Promise<Stats> | null = null;

async function compute(): Promise<Stats> {
  const all: RelayRequest[] = [];
  let continuation: string | null = null;
  let api: string | null = null;
  for (let page = 0; page < 3; page++) {
    const r = await relayRequests({ originChainId: "99901", limit: "50", ...(continuation ? { continuation } : {}) });
    if (!r) break;
    api = r.version;
    all.push(...r.list);
    continuation = r.continuation;
    if (!continuation) break;
  }
  const hype = all.filter((r) => r.data?.metadata?.currencyIn?.currency?.symbol === "HYPE");
  const groups: Record<string, number[]> = {};
  for (const r of hype) {
    const s = relaySeconds(r);
    const dest = r.data?.outTxs?.[0]?.chainId;
    const key = typeof dest === "number" ? chainById(dest)?.key : undefined;
    if (s === null || !key || key === "elysium") continue;
    (groups[key] ??= []).push(s);
  }
  const byDestination: Record<string, Spread> = {};
  for (const [k, v] of Object.entries(groups)) {
    const sp = spread(v);
    if (sp) byDestination[k] = sp;
  }
  if (Object.keys(byDestination).length === 0) {
    return { source: "snapshot", api, sample: 0, from: RELAY_SNAPSHOT.from, to: RELAY_SNAPSHOT.to, byDestination: RELAY_SNAPSHOT.byDestination, readAt: Date.now() };
  }
  const times = hype.map((r) => r.createdAt).filter(Boolean).sort();
  return { source: "live", api, sample: hype.length, from: times[0] ?? null, to: times[times.length - 1] ?? null, byDestination, readAt: Date.now() };
}

export async function GET() {
  if (!cache || Date.now() - cache.at > 30 * 60_000) {
    inflight ??= compute().finally(() => {
      inflight = null;
    });
    try {
      cache = { at: Date.now(), value: await inflight };
    } catch {
      if (!cache) cache = { at: Date.now() - 25 * 60_000, value: { source: "snapshot", api: null, sample: 0, from: RELAY_SNAPSHOT.from, to: RELAY_SNAPSHOT.to, byDestination: RELAY_SNAPSHOT.byDestination, readAt: Date.now() } };
    }
  }
  return NextResponse.json(cache.value, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
