import { NextResponse } from "next/server";
import { allowPublic, RATE_LIMITS, tooMany } from "@/lib/guard";
import { CHAINS, chainById, type ChainKey } from "@/config/chains";
import { rpcOn } from "@/lib/server/multirpc";
import { rollupState, withStatus, withdrawalsInTx, type TrackedWithdrawal } from "@/lib/server/orbit";
import { relayRequests, relayStatus } from "@/lib/server/relayapi";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * One hop's status from its source transaction: ?chain=<elysium|hyperevm|robinhood|solana>&tx=<hash or signature>, or
 * ?requestId=<Relay request id> for a hop sent from this site.
 * - EVM chains: the receipt (pending / confirmed / failed), its block and time.
 * - Elysium: also any canonical withdrawal in it, with its challenge stage.
 * - Relay: the request that this transaction started, and the delivery transaction on the other chain.
 */

type Receipt = { status: "pending" | "confirmed" | "failed" | "not found"; block: number | null; time: number | null; from: string | null; to: string | null };
type RelayView = { found: boolean; status: string | null; requestId: string | null; inTxs: { chain: string; hash: string }[]; outTxs: { chain: string; hash: string }[]; seconds: number | null; note: string | null };

const isEvmHash = (v: string) => /^0x[0-9a-fA-F]{64}$/.test(v);
const isSolSig = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(v);
const chainName = (id: number | undefined) => (typeof id === "number" ? (chainById(id)?.key ?? String(id)) : "?");

async function receipt(chain: ChainKey, tx: string): Promise<Receipt> {
  const r = await rpcOn<{ status: string; blockNumber: string; from: string; to: string | null } | null>(chain, "eth_getTransactionReceipt", [tx]);
  if (!r) {
    const t = await rpcOn<{ hash: string } | null>(chain, "eth_getTransactionByHash", [tx]).catch(() => null);
    return { status: t ? "pending" : "not found", block: null, time: null, from: null, to: null };
  }
  const block = Number(BigInt(r.blockNumber));
  const b = await rpcOn<{ timestamp: string } | null>(chain, "eth_getBlockByNumber", [r.blockNumber, false]).catch(() => null);
  return { status: r.status === "0x1" ? "confirmed" : "failed", block, time: b ? Number(BigInt(b.timestamp)) : null, from: r.from, to: r.to };
}

const byHash = new Map<string, { at: number; value: RelayView }>();

/** Relay request started by a transaction, from Relay's request log. Cached 60 s per hash (the keyless log is rate-limited). */
async function relayByHash(tx: string): Promise<RelayView> {
  const hit = byHash.get(tx.toLowerCase());
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const value = await relayLookup(tx);
  if (byHash.size > 1000) byHash.clear();
  if (value.note === null) byHash.set(tx.toLowerCase(), { at: Date.now(), value });
  return value;
}

async function relayLookup(tx: string): Promise<RelayView> {
  const r = await relayRequests({ hash: tx }).catch(() => null);
  if (!r) return { found: false, status: null, requestId: null, inTxs: [], outTxs: [], seconds: null, note: "Relay's request log did not answer (its keyless version is rate-limited and retires on 24 Nov 2026). Hops sent from this site are followed by their request id instead." };
  const q = r.list[0];
  if (!q) return { found: false, status: null, requestId: null, inTxs: [], outTxs: [], seconds: null, note: null };
  const ins = q.data?.inTxs ?? [];
  const outs = q.data?.outTxs ?? [];
  const a = ins[0]?.timestamp;
  const b = outs[0]?.timestamp;
  return {
    found: true,
    status: q.status,
    requestId: q.id,
    inTxs: ins.filter((t) => t.hash).map((t) => ({ chain: chainName(t.chainId), hash: t.hash! })),
    outTxs: outs.filter((t) => t.hash).map((t) => ({ chain: chainName(t.chainId), hash: t.hash! })),
    seconds: typeof a === "number" && typeof b === "number" ? b - a : null,
    note: null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") ?? url.searchParams.get("rid") ?? "";
  const chain = (url.searchParams.get("chain") ?? "") as ChainKey;
  const tx = (url.searchParams.get("tx") ?? "").trim();
  if (!(await allowPublic(getStore(), request, "track", RATE_LIMITS.track))) return tooMany();

  if (requestId && !tx) {
    const s = await relayStatus(requestId).catch(() => null);
    if (!s) return NextResponse.json({ error: "Relay does not know this request (yet)." }, { status: 404 });
    return NextResponse.json({ relay: { found: true, status: s.status, requestId, inTxs: s.inTxHashes.map((h) => ({ chain: chainName(s.originChainId), hash: h })), outTxs: s.txHashes.map((h) => ({ chain: chainName(s.destinationChainId), hash: h })), seconds: null, note: null } }, { headers: { "cache-control": "no-store" } });
  }

  if (!(chain in CHAINS)) return NextResponse.json({ error: "Pick the chain the transaction was sent on." }, { status: 400 });
  if (chain === "solana" ? !isSolSig(tx) : !isEvmHash(tx)) return NextResponse.json({ error: chain === "solana" ? "A Solana signature is 64–90 base58 characters." : "A transaction hash is 0x + 64 hex characters." }, { status: 400 });

  try {
    const viaId = async (): Promise<RelayView | null> => {
      const st = requestId ? await relayStatus(requestId).catch(() => null) : null;
      if (!st || st.status === "unknown") return null;
      return { found: true, status: st.status, requestId, inTxs: st.inTxHashes.map((h) => ({ chain: chainName(st.originChainId), hash: h })), outTxs: st.txHashes.map((h) => ({ chain: chainName(st.destinationChainId), hash: h })), seconds: null, note: null };
    };
    const [rcpt, relay] = await Promise.all([chain === "solana" ? Promise.resolve(null) : receipt(chain, tx), viaId().then((v) => v ?? relayByHash(tx))]);
    let canonical: TrackedWithdrawal[] = [];
    if (chain === "elysium" && rcpt?.status === "confirmed") {
      const list = await withdrawalsInTx(tx).catch(() => null);
      if (list?.length) canonical = await withStatus(list, await rollupState());
    }
    return NextResponse.json({ chain, tx, receipt: rcpt, relay, canonical, readAt: Date.now() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: `${CHAINS[chain].name} could not be read right now.` }, { status: 503 });
  }
}
