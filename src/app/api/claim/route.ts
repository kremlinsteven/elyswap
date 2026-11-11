import { NextResponse } from "next/server";
import { allowPublic, RATE_LIMITS, tooMany } from "@/lib/guard";
import { RpcFail } from "@/lib/server/multirpc";
import { buildClaim, isSpent, rollupState, withdrawalsInTx } from "@/lib/server/orbit";
import { getStore } from "@/lib/server/store";
import { isTxHash } from "@/lib/withdrawal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * The claim transaction for one canonical withdrawal: ?tx=<Elysium tx>&position=<n>&from=<address that will send it>.
 * The withdrawal is re-read from its own transaction (never taken from the caller), the proof is built against the
 * confirmed send count and checked against Outbox.roots(), and the call is simulated on HyperEVM before it is returned.
 * Anyone may send the claim; the HYPE always goes to the destination written in the withdrawal.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tx = url.searchParams.get("tx") ?? "";
  const position = Number(url.searchParams.get("position"));
  const from = url.searchParams.get("from") ?? "";
  if (!isTxHash(tx) || !Number.isSafeInteger(position) || position < 0 || !/^0x[0-9a-fA-F]{40}$/.test(from)) return NextResponse.json({ error: "Need tx, position and from." }, { status: 400 });
  if (!(await allowPublic(getStore(), request, "claim", RATE_LIMITS.claim))) return tooMany();
  try {
    const list = await withdrawalsInTx(tx);
    const w = list?.find((x) => x.position === position);
    if (!w) return NextResponse.json({ error: "No withdrawal with that position in this transaction." }, { status: 404 });
    if (await isSpent(position)) return NextResponse.json({ error: "Already claimed on HyperEVM." }, { status: 409 });
    const state = await rollupState();
    const claim = await buildClaim(w, state, from);
    return NextResponse.json({ ...claim, withdrawal: w }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const msg = e instanceof RpcFail && e.revert ? e.message : "The claim could not be prepared right now. Try again in a minute.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
