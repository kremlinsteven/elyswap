import { NextResponse } from "next/server";
import { allowPublic, RATE_LIMITS, tooMany } from "@/lib/guard";
import { rollupState, withStatus, withdrawalsInTx, withdrawalsTo, type TrackedWithdrawal } from "@/lib/server/orbit";
import { getStore } from "@/lib/server/store";
import { isTxHash } from "@/lib/withdrawal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * Canonical withdrawals for ?address=0x… (withdrawals whose HyperEVM destination is that address) or ?tx=0x… (one Elysium
 * transaction). Each comes with its stage: claimed, ready, in the challenge period (with a countdown), or waiting for an
 * assertion. Answers are cached 20 s per query.
 */

type Answer = { query: string; total: number; shown: number; withdrawals: TrackedWithdrawal[]; confirmedSendCount: number; readAt: number; found: boolean };
const cache = new Map<string, { at: number; value: Answer }>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  const tx = url.searchParams.get("tx") ?? "";
  const isAddr = /^0x[0-9a-fA-F]{40}$/.test(address);
  if (!isAddr && !isTxHash(tx)) return NextResponse.json({ error: "Give an address (0x + 40 hex) or an Elysium transaction hash (0x + 64 hex)." }, { status: 400 });
  const query = isAddr ? `a:${address.toLowerCase()}` : `t:${tx.toLowerCase()}`;
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < 20_000) return NextResponse.json(hit.value, { headers: { "cache-control": "no-store" } });
  if (!(await allowPublic(getStore(), request, "withdrawals", RATE_LIMITS.withdrawals))) return tooMany();
  try {
    const state = await rollupState();
    let list;
    let total = 0;
    let found = true;
    if (isAddr) {
      const r = await withdrawalsTo(address);
      list = r.list;
      total = r.total;
    } else {
      const r = await withdrawalsInTx(tx);
      found = r !== null;
      list = r ?? [];
      total = list.length;
    }
    const withdrawals = await withStatus(list, state);
    const value: Answer = { query: isAddr ? address : tx, total, shown: withdrawals.length, withdrawals, confirmedSendCount: state.confirmed.sendCount, readAt: Date.now(), found };
    if (cache.size > 500) cache.clear();
    cache.set(query, { at: Date.now(), value });
    return NextResponse.json(value, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Elysium or HyperEVM could not be read right now. Try again in a minute." }, { status: 503 });
  }
}
