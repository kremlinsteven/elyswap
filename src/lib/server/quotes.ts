import "server-only";
import { CHAINS } from "@/config/chains";
import { hopCurrency, routeById, type Hop, type RouteDef } from "@/lib/routes";
import { relayQuote, type RelayQuote } from "@/lib/server/relayapi";

/*
 * Quotes a route hop by hop from Relay's own quote API. The second hop is quoted with the first hop's quoted output, so a
 * route's end amount is what the bridge itself says today. The canonical route needs no quote: you receive the same HYPE,
 * minus gas, after the challenge period.
 *
 * A preview quote (no wallet) uses a fixed placeholder sender, which is how Relay prices a route for anyone; the
 * transaction to sign is only built for the connected address, for one hop at a time, right before signing.
 */

const PREVIEW_EVM = "0x000000000000000000000000000000000000dEaD";
/** A valid Solana system account used only to price hops that end on Solana. Never used to send anything. */
const PREVIEW_SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

export const isSolAddress = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
export const isEvmAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v);

export type TxRequest = { chain: string; chainId: number; to: string; data: string; value: string };

export type HopQuote = {
  index: number;
  from: string;
  to: string;
  tokenIn: string;
  tokenOut: string;
  exec: Hop["exec"];
  amountIn: string;
  amountOut: string | null;
  decimalsOut: number;
  minimumOut: string | null;
  inUsd: number | null;
  outUsd: number | null;
  relayerFeeUsd: number | null;
  gasUsd: number | null;
  swapImpactPct: number | null;
  timeEstimateSec: number | null;
  requestId: string | null;
  txs: TxRequest[];
  error: string | null;
};

const n = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));

function readQuote(q: RelayQuote, hop: Hop, index: number, amountIn: bigint): HopQuote {
  const d = q.details;
  const txs: TxRequest[] = [];
  let requestId: string | null = null;
  for (const step of q.steps) {
    requestId ??= step.requestId ?? null;
    for (const item of step.items) {
      const c = Object.values(CHAINS).find((x) => x.id === item.data.chainId);
      txs.push({ chain: c?.key ?? String(item.data.chainId), chainId: item.data.chainId, to: item.data.to, data: item.data.data, value: item.data.value ?? "0" });
    }
  }
  return {
    index,
    from: hop.from,
    to: hop.to,
    tokenIn: hop.tokenIn,
    tokenOut: hop.tokenOut,
    exec: hop.exec,
    amountIn: amountIn.toString(),
    amountOut: d.currencyOut.amount,
    decimalsOut: d.currencyOut.currency.decimals,
    minimumOut: d.currencyOut.minimumAmount ?? null,
    inUsd: n(d.currencyIn.amountUsd),
    outUsd: n(d.currencyOut.amountUsd),
    relayerFeeUsd: n(q.fees.relayer?.amountUsd),
    gasUsd: n(q.fees.gas?.amountUsd),
    swapImpactPct: n(d.swapImpact?.percent),
    timeEstimateSec: d.timeEstimate ?? null,
    requestId,
    txs,
    error: null,
  };
}

export async function quoteHop(route: RouteDef, index: number, amountIn: bigint, who: { user?: string; solana?: string }): Promise<HopQuote> {
  const hop = route.hops[index];
  const base: HopQuote = {
    index,
    from: hop.from,
    to: hop.to,
    tokenIn: hop.tokenIn,
    tokenOut: hop.tokenOut,
    exec: hop.exec,
    amountIn: amountIn.toString(),
    amountOut: null,
    decimalsOut: 18,
    minimumOut: null,
    inUsd: null,
    outUsd: null,
    relayerFeeUsd: null,
    gasUsd: null,
    swapImpactPct: null,
    timeEstimateSec: null,
    requestId: null,
    txs: [],
    error: null,
  };
  if (hop.bridge === "canonical") return { ...base, amountOut: amountIn.toString(), decimalsOut: 18 };
  const fromSolana = hop.from === "solana";
  const user = fromSolana ? (who.solana && isSolAddress(who.solana) ? who.solana : PREVIEW_SOL) : who.user && isEvmAddress(who.user) ? who.user : PREVIEW_EVM;
  const recipient = hop.to === "solana" ? (who.solana && isSolAddress(who.solana) ? who.solana : PREVIEW_SOL) : who.user && isEvmAddress(who.user) ? who.user : undefined;
  const r = await relayQuote({
    user,
    ...(recipient ? { recipient } : {}),
    originChainId: CHAINS[hop.from].id,
    destinationChainId: CHAINS[hop.to].id,
    originCurrency: hopCurrency(hop.from, hop.tokenIn),
    destinationCurrency: hopCurrency(hop.to, hop.tokenOut),
    amount: amountIn.toString(),
    tradeType: "EXACT_INPUT",
  });
  if (!r.ok) return { ...base, error: r.error };
  const q = readQuote(r.quote, hop, index, amountIn);
  // Transactions are returned only for a real sender on an EVM hop Elyswap executes; a preview never carries one.
  const real = Boolean(who.user && isEvmAddress(who.user)) && hop.exec === "api" && !fromSolana && (hop.to !== "solana" || Boolean(who.solana && isSolAddress(who.solana)));
  if (!real) q.txs = [];
  // Every transaction must go out on this hop's own origin chain.
  if (q.txs.some((t) => t.chainId !== CHAINS[hop.from].id)) return { ...base, error: "The bridge returned a transaction for another chain; refused." };
  return q;
}

export type RouteQuote = { route: string; amountIn: string; hops: HopQuote[]; amountOut: string | null; lossPct: number | null; readAt: number };

/** All hops of a route, each fed with the previous hop's quoted output. Preview only (no transactions). */
export async function quoteRoute(routeId: string, amountIn: bigint): Promise<RouteQuote | null> {
  const route = routeById(routeId);
  if (!route) return null;
  const hops: HopQuote[] = [];
  let amount = amountIn;
  for (let i = 0; i < route.hops.length; i++) {
    const q = await quoteHop(route, i, amount, {});
    hops.push(q);
    if (q.error || !q.amountOut) break;
    amount = BigInt(q.amountOut);
  }
  const last = hops[hops.length - 1];
  const done = hops.length === route.hops.length && !last.error && last.amountOut !== null;
  const out = done ? BigInt(last.amountOut!) : null;
  // Every route starts and ends in 18-decimal HYPE, so the loss is a plain ratio.
  const lossPct = out !== null ? Number(((amountIn - out) * 1_000_000n) / amountIn) / 10_000 : null;
  return { route: routeId, amountIn: amountIn.toString(), hops, amountOut: out?.toString() ?? null, lossPct, readAt: Date.now() };
}
