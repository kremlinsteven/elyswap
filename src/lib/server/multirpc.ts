import "server-only";
import { CHAINS, type ChainKey } from "@/config/chains";
import { readCappedResponse } from "@/lib/server/capped";

/*
 * Server-side JSON-RPC reads on the EVM chains a journey touches. Each chain has an ordered endpoint list; a rate-limit
 * answer is retried on the same endpoint after a short pause, other failures move to the next endpoint, and a revert is
 * an answer (never retried). Reads only: nothing here signs or forwards a transaction.
 *
 * Environment (all optional): ELYSIUM_RPC_URL, HYPEREVM_RPC_URL, ROBINHOOD_RPC_URL put a private endpoint first.
 */

const ENV: Partial<Record<ChainKey, string>> = {
  elysium: "ELYSIUM_RPC_URL",
  hyperevm: "HYPEREVM_RPC_URL",
  robinhood: "ROBINHOOD_RPC_URL",
};

export function endpoints(chain: ChainKey): string[] {
  const env = ENV[chain] ? process.env[ENV[chain]!] : undefined;
  return [env, ...CHAINS[chain].rpc].filter((u, i, all): u is string => Boolean(u) && all.indexOf(u) === i);
}

export class RpcFail extends Error {
  constructor(
    message: string,
    readonly revert = false,
    readonly data: string | null = null,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 3_000_000;
const preferred: Partial<Record<ChainKey, number>> = {};

async function post(url: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: ctrl.signal });
    const text = res.body ? await readCappedResponse(res, MAX_BYTES) : null;
    if (text === null) throw new RpcFail("Upstream answer too large.", true);
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

const busy = (status: number, msg: string) => status === 429 || /rate limit|rate-limit|too many/i.test(msg);

/** One read with endpoint fallback and rate-limit pauses. */
export async function rpcOn<T>(chain: ChainKey, method: string, params: unknown[]): Promise<T> {
  const list = endpoints(chain);
  if (list.length === 0) throw new RpcFail(`No RPC for ${chain}.`);
  let last: unknown = null;
  const start = preferred[chain] ?? 0;
  for (let n = 0; n < list.length; n++) {
    const i = (start + n) % list.length;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { status, json } = await post(list[i], { jsonrpc: "2.0", id: 1, method, params });
        const body = json as { result?: T; error?: { message?: string; code?: number; data?: unknown } } | null;
        const msg = body?.error?.message ?? (body ? "" : `HTTP ${status}`);
        if (busy(status, msg)) {
          last = new RpcFail(`busy: ${msg || status}`);
          await sleep(350 * (attempt + 1) + Math.floor(Math.random() * 200));
          continue;
        }
        if (body?.error) {
          const data = typeof body.error.data === "string" && /^0x[0-9a-fA-F]*$/.test(body.error.data) ? body.error.data.slice(0, 2000) : null;
          if (/revert/i.test(msg) || body.error.code === 3 || method === "eth_estimateGas") throw new RpcFail(msg, true, data);
          throw new RpcFail(msg);
        }
        if (!body || !("result" in body)) throw new RpcFail(`Bad answer (HTTP ${status}).`);
        preferred[chain] = i;
        return body.result as T;
      } catch (error) {
        if (error instanceof RpcFail && error.revert) throw error;
        last = error;
        break;
      }
    }
  }
  throw last instanceof Error ? last : new RpcFail("The chain could not be reached.");
}

/** Runs async jobs with at most `limit` in flight (public RPCs rate-limit bursts). */
export async function pool<T, R>(items: T[], limit: number, job: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await job(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const hex = (n: bigint | number) => `0x${BigInt(n).toString(16)}`;
