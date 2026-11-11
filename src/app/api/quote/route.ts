import { NextResponse } from "next/server";
import { allowPublic, RATE_LIMITS, readBody, tooMany, badBody } from "@/lib/guard";
import { routeById, toUnits } from "@/lib/routes";
import { isEvmAddress, isSolAddress, quoteHop, quoteRoute, type RouteQuote } from "@/lib/server/quotes";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * GET  ?route=<id>&amount=<HYPE>  preview quote of a whole route (no transaction), shared for 20 s per route and amount.
 * POST {route, hop, amountWei, user, solana?}  a fresh quote for ONE hop with the transaction(s) to sign from `user`.
 */

const cache = new Map<string, { at: number; value: RouteQuote }>();
const inflight = new Map<string, Promise<RouteQuote | null>>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const route = url.searchParams.get("route") ?? "";
  const amount = toUnits(url.searchParams.get("amount") ?? "");
  if (!routeById(route)) return NextResponse.json({ error: "Unknown route." }, { status: 400 });
  if (amount === null) return NextResponse.json({ error: "Enter an amount of HYPE, like 1 or 25.5." }, { status: 400 });
  const key = `${route}:${amount}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 20_000) return NextResponse.json(hit.value, { headers: { "cache-control": "no-store" } });
  if (!(await allowPublic(getStore(), request, "quote", RATE_LIMITS.quote))) return tooMany();
  let p = inflight.get(key);
  if (!p) {
    p = quoteRoute(route, amount).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  const value = await p.catch(() => null);
  if (!value) return NextResponse.json({ error: "The bridge could not be asked for a quote right now." }, { status: 503 });
  if (cache.size > 400) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return NextResponse.json(value, { headers: { "cache-control": "no-store" } });
}

type Body = { route?: string; hop?: number; amountWei?: string; user?: string; solana?: string };

export async function POST(request: Request) {
  const read = await readBody<Body>(request, 2048);
  if (!read.ok) return badBody();
  const b = read.value;
  const route = routeById(b.route ?? "");
  if (!route || !Number.isInteger(b.hop) || b.hop! < 0 || b.hop! >= route.hops.length) return NextResponse.json({ error: "Unknown route or hop." }, { status: 400 });
  if (!b.amountWei || !/^\d{1,40}$/.test(b.amountWei) || BigInt(b.amountWei) === 0n) return NextResponse.json({ error: "Bad amount." }, { status: 400 });
  if (!b.user || !isEvmAddress(b.user)) return NextResponse.json({ error: "Connect a wallet first." }, { status: 400 });
  if (b.solana !== undefined && b.solana !== "" && !isSolAddress(b.solana)) return NextResponse.json({ error: "That is not a Solana address." }, { status: 400 });
  if (route.hops[b.hop!].to === "solana" && !b.solana) return NextResponse.json({ error: "Enter the Solana address that should receive this hop." }, { status: 400 });
  if (!(await allowPublic(getStore(), request, "quote", RATE_LIMITS.quote))) return tooMany();
  const q = await quoteHop(route, b.hop!, BigInt(b.amountWei), { user: b.user, solana: b.solana || undefined }).catch(() => null);
  if (!q) return NextResponse.json({ error: "The bridge could not be asked for a quote right now." }, { status: 503 });
  return NextResponse.json(q, { headers: { "cache-control": "no-store" } });
}
