import { BRAND, isAddress } from "@/config/brand";
import { CONTRACTS } from "@/config/contracts";
import { ALL_POSITION_MANAGERS } from "@/config/chain";

/*
 * Rules for the read-only JSON-RPC relay, kept apart from the route so they can be tested. Every request is priced in units; each network
 * has a budget and the whole site has a ceiling. Only the exact request shapes the site itself issues pass:
 *   - eth_call to the contracts the site reads (the token, ElyearnRangeBook, the v4 PositionManagers), or to ANY address when the call
 *     is one of a few plain read functions with a low gas cap;
 *   - eth_estimateGas for ElyearnRangeBook only;
 *   - no eth_getLogs at all: chain logs are read on the server, where one answer can be cached for everyone. The book's state is in its views.
 * A signed transaction is never forwarded.
 */

export const MAX_CALLS = 20;
export const MAX_GAS = 5_000_000;
/** Gas cap for a read sent to an address the site does not know. */
export const MAX_FOREIGN_GAS = 200_000;
export const MAX_BODY = 131_072;
export const BUDGET = { units: 2_000, windowSec: 600, siteUnits: 40_000 };
/** Call data limit in hex characters. A plan's first write, with a long link, is the largest. */
export const MAX_CALL_DATA = 8_000;

const GAS_CAP_HEX = `0x${MAX_GAS.toString(16)}`;
const FOREIGN_GAS_HEX = `0x${MAX_FOREIGN_GAS.toString(16)}`;
const CALL_KEYS = new Set(["from", "to", "gas", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas", "value", "data", "input", "nonce", "type", "chainId"]);
const BLOCK_TAG = /^(latest|pending|safe|finalized|0x[0-9a-fA-F]{1,16})$/;

/** Read functions any address may answer: selector => largest call data in hex characters. */
export const READ_SELECTORS: Record<string, number> = {
  "0x95d89b41": 2 + 8, // symbol()
  "0x313ce567": 2 + 8, // decimals()
  "0x06fdde03": 2 + 8, // name()
  "0x18160ddd": 2 + 8, // totalSupply()
  "0x8da5cb5b": 2 + 8, // owner()
  "0x70a08231": 2 + 8 + 64, // balanceOf(address)
};

/** True when `data` is one of the plain reads above, within its size. */
export function isPlainRead(data: unknown): boolean {
  if (typeof data !== "string" || !/^0x[0-9a-fA-F]*$/.test(data) || data.length < 10) return false;
  const max = READ_SELECTORS[data.slice(0, 10).toLowerCase()];
  return max !== undefined && data.length <= max;
}

/**
 * Normalises a call object before it is checked and forwarded. The node reads `input` as well as `data`, so `input` is folded into `data`
 * (refused when the two disagree) and every check sees the bytes that will run; a call without `gas` gets the relay cap.
 */
function shapeTx(tx: Record<string, unknown>, cap = GAS_CAP_HEX): string | null {
  // The node decodes field names case-insensitively ("TO" would override "to"), so only these exact names pass.
  for (const k of Object.keys(tx)) if (!CALL_KEYS.has(k)) return `Unsupported call field: ${k.slice(0, 32)}`;
  if (tx.input !== undefined) {
    if (tx.data !== undefined && tx.data !== tx.input) return "data and input disagree.";
    tx.data = tx.input;
    delete tx.input;
  }
  if (tx.data !== undefined && (typeof tx.data !== "string" || !/^0x[0-9a-fA-F]*$/.test(tx.data))) return "Call data must be hex.";
  if (tx.value !== undefined && !(typeof tx.value === "string" && /^0x0*$/.test(tx.value))) return "Calls with value are not relayed.";
  if (tx.gas === undefined) tx.gas = cap;
  return null;
}

export const COST: Record<string, number> = {
  eth_call: 2,
  eth_getTransactionReceipt: 1,
  eth_getTransactionByHash: 1,
  eth_blockNumber: 1,
  eth_getBalance: 1,
  eth_chainId: 1,
  eth_gasPrice: 1,
  eth_getBlockByNumber: 1,
  eth_getTransactionCount: 1,
  eth_maxPriorityFeePerGas: 1,
  eth_getCode: 1,
  eth_estimateGas: 3,
};

/** Contracts the browser reads through the relay by address. eth_getCode and receipts are answered for any address. */
export function readTargets() {
  const list: string[] = ALL_POSITION_MANAGERS.map((p) => p.positionManager);
  if (isAddress(BRAND.ca)) list.push(BRAND.ca);
  if (isAddress(CONTRACTS.book)) list.push(CONTRACTS.book);
  return new Set(list.map((a) => a.toLowerCase()));
}

export type Call = { jsonrpc?: string; id?: unknown; method: string; params?: unknown[] };

const gasOf = (g: unknown) => (typeof g === "string" && /^0x[0-9a-fA-F]{1,16}$/.test(g) ? Number(BigInt(g)) : Infinity);

/** Checks a batch and returns its cost in units, or the reason it is refused. */
export function checkBatch(calls: Call[], targets = readTargets(), bookAddress: string = CONTRACTS.book): { units: number } | { error: string } {
  if (calls.length === 0 || calls.length > MAX_CALLS) return { error: `Between 1 and ${MAX_CALLS} calls per request.` };
  let units = 0;
  for (const c of calls) {
    if (!c || typeof c.method !== "string" || !Object.hasOwn(COST, c.method)) return { error: `Method not allowed: ${String(c?.method)}` };
    if (c.params !== undefined && !Array.isArray(c.params)) return { error: "params must be an array." };
    const params = c.params ?? [];
    units += COST[c.method];
    if (c.method === "eth_call" || c.method === "eth_estimateGas") {
      if (params.length > 2) return { error: "State overrides are not relayed." };
      const tx = params[0] as { to?: unknown; gas?: unknown; data?: unknown } | undefined;
      if (!tx || typeof tx !== "object" || typeof tx.to !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(tx.to)) return { error: `${c.method} needs a target address.` };
      const to = tx.to.toLowerCase();
      const known = targets.has(to);
      const data = (tx as { data?: unknown; input?: unknown }).data ?? (tx as { input?: unknown }).input;
      const foreign = !known && c.method === "eth_call" && isPlainRead(data);
      if (!known && !foreign) return { error: `${c.method} target not served by this relay.` };
      if (c.method === "eth_estimateGas" && !(isAddress(bookAddress) && to === bookAddress.toLowerCase())) return { error: "eth_estimateGas is relayed only for the range book." };
      const shaped = shapeTx(tx as Record<string, unknown>, foreign ? FOREIGN_GAS_HEX : GAS_CAP_HEX);
      if (shaped) return { error: shaped };
      if (params[1] !== undefined && !(typeof params[1] === "string" && BLOCK_TAG.test(params[1]))) return { error: "Unsupported block tag." };
      if (gasOf(tx.gas) > (foreign ? MAX_FOREIGN_GAS : MAX_GAS)) return { error: "Gas above the relay cap." };
      const d = typeof tx.data === "string" ? tx.data : "0x";
      if (d.length > MAX_CALL_DATA) return { error: "Call data too large." };
    }
    if (c.method === "eth_getBlockByNumber" && params[1] !== false) return { error: "eth_getBlockByNumber is relayed only with full transactions off (false)." };
  }
  return { units };
}

export type RpcAnswer = { result: unknown } | { error: { code: number; message: string; data?: string } } | { down: true };

export type RelayDeps = {
  /** Charges the caller's budgets; returns the refusal message, or null when allowed. */
  charge: (units: number) => Promise<string | null>;
  one: (method: string, params: unknown[]) => Promise<RpcAnswer>;
  many: (calls: { method: string; params: unknown[] }[]) => Promise<(unknown | null)[]>;
};

/** Addresses a batch reads, lowercased, so a refused target can still be priced. */
export function namedAddresses(body: Call | Call[]): string[] {
  const calls = Array.isArray(body) ? body : [body];
  const out = new Set<string>();
  for (const c of calls) {
    if (!c || !Array.isArray(c.params)) continue;
    const first = c.params[0] as { to?: unknown } | undefined;
    if (first && typeof first === "object" && (c.method === "eth_call" || c.method === "eth_estimateGas") && typeof first.to === "string") out.add(first.to.toLowerCase());
  }
  return [...out].filter((a) => /^0x[0-9a-f]{40}$/.test(a));
}

/**
 * The relay's whole decision, without I/O of its own: shape and price first, then the budget, then
 * the target allowlist, and only then the upstream RPC. A refused request never reaches the RPC.
 */
export async function runRelay(body: Call | Call[], deps: RelayDeps): Promise<{ status: number; body: unknown }> {
  const calls = Array.isArray(body) ? body : [body];
  const targets = readTargets();
  // Priced with every named address allowed first, so a refused target still costs budget.
  const priced = checkBatch(calls, new Set([...targets, ...namedAddresses(body)]));
  if ("error" in priced) return { status: 400, body: { error: priced.error } };
  const refused = await deps.charge(priced.units);
  if (refused) return { status: 429, body: { error: refused } };
  const checked = checkBatch(calls, targets);
  if ("error" in checked) return { status: 400, body: { error: checked.error } };
  if (calls.length === 1 && !Array.isArray(body)) {
    const c = calls[0];
    const a = await deps.one(c.method, c.params ?? []);
    if ("down" in a) return { status: 502, body: { error: "The chain could not be reached." } };
    return { status: 200, body: { jsonrpc: "2.0", id: c.id ?? null, ...a } };
  }
  try {
    const results = await deps.many(calls.map((c) => ({ method: c.method, params: c.params ?? [] })));
    const out = calls.map((c, i) => (results[i] === null ? { jsonrpc: "2.0", id: c.id ?? null, error: { code: -32000, message: "read failed" } } : { jsonrpc: "2.0", id: c.id ?? null, result: results[i] }));
    return { status: 200, body: Array.isArray(body) ? out : out[0] };
  } catch {
    return { status: 502, body: { error: "The chain could not be reached." } };
  }
}
