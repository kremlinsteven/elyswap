import "server-only";
import { readCappedResponse } from "@/lib/server/capped";

/*
 * Relay's public API (https://api.relay.link), read on the server so answers can be cached for every visitor:
 *   POST /quote                     a quote (and, with a user address, the exact transaction to sign)
 *   GET  /intents/status/v3          status of one request by its id (keyless)
 *   GET  /requests/v2|v3             recent requests, used to MEASURE delivery times and to find a request by tx hash.
 * /requests/v2 is keyless but Relay retires it on 24 Nov 2026; /requests/v3 needs RELAY_API_KEY (optional env). Without
 * either, measured times fall back to the dated snapshot in src/lib/measured.ts and the tracker says so.
 */

export const RELAY_API = "https://api.relay.link";

async function getJson(url: string, init?: RequestInit, max = 2_000_000): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: ctrl.signal });
    const text = await readCappedResponse(res, max);
    if (text === null) return { status: 502, json: null };
    try {
      return { status: res.status, json: JSON.parse(text) };
    } catch {
      return { status: res.status, json: null };
    }
  } finally {
    clearTimeout(timer);
  }
}

const key = () => process.env.RELAY_API_KEY || "";

export type RelayQuoteBody = {
  user: string;
  recipient?: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;
  destinationCurrency: string;
  amount: string;
  tradeType: "EXACT_INPUT";
};

export type RelayTxItem = { status?: string; data: { from?: string; to: string; data: string; value?: string; chainId: number } };
export type RelayStep = { id: string; kind: string; action?: string; description?: string; requestId?: string; items: RelayTxItem[] };
export type RelayQuote = {
  steps: RelayStep[];
  fees: Record<string, { amount?: string; amountUsd?: string; currency?: { symbol?: string } } | undefined>;
  details: {
    currencyIn: { amount: string; amountFormatted?: string; amountUsd?: string; currency: { symbol: string; decimals: number } };
    currencyOut: { amount: string; amountFormatted?: string; amountUsd?: string; minimumAmount?: string; currency: { symbol: string; decimals: number; address: string } };
    totalImpact?: { usd?: string; percent?: string };
    swapImpact?: { usd?: string; percent?: string };
    rate?: string;
    timeEstimate?: number;
    recipient?: string;
  };
};

export async function relayQuote(body: RelayQuoteBody): Promise<{ ok: true; quote: RelayQuote } | { ok: false; error: string }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key()) headers["x-api-key"] = key();
  const { status, json } = await getJson(`${RELAY_API}/quote`, { method: "POST", headers, body: JSON.stringify(body) });
  const j = json as (RelayQuote & { message?: string }) | null;
  if (status !== 200 || !j || !Array.isArray(j.steps)) return { ok: false, error: (j?.message ?? `Relay answered ${status}.`).slice(0, 240) };
  return { ok: true, quote: j };
}

export type RelayStatus = { status: string; inTxHashes: string[]; txHashes: string[]; updatedAt?: number; originChainId?: number; destinationChainId?: number; failReason?: string };

export async function relayStatus(requestId: string): Promise<RelayStatus | null> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(requestId)) return null;
  const { status, json } = await getJson(`${RELAY_API}/intents/status/v3?requestId=${requestId}`);
  if (status !== 200 || !json) return null;
  return json as RelayStatus;
}

export type RelayRequest = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  data?: {
    inTxs?: { hash?: string; chainId?: number; timestamp?: number }[];
    outTxs?: { hash?: string; chainId?: number; timestamp?: number }[];
    metadata?: {
      currencyIn?: { amount?: string; amountFormatted?: string; currency?: { symbol?: string; chainId?: number } };
      currencyOut?: { amount?: string; amountFormatted?: string; currency?: { symbol?: string; chainId?: number } };
    };
    failReason?: string;
  };
};

/** Recent requests, filtered by Relay's query parameters. v3 with RELAY_API_KEY, else v2 while Relay still serves it. */
export async function relayRequests(params: Record<string, string>): Promise<{ list: RelayRequest[]; continuation: string | null; version: "v2" | "v3" } | null> {
  const q = new URLSearchParams(params).toString();
  if (key()) {
    const { status, json } = await getJson(`${RELAY_API}/requests/v3?${q}`, { headers: { "x-api-key": key() } });
    const j = json as { requests?: RelayRequest[]; continuation?: string } | null;
    if (status === 200 && j?.requests) return { list: j.requests, continuation: j.continuation ?? null, version: "v3" };
  }
  const { status, json } = await getJson(`${RELAY_API}/requests/v2?${q}`);
  const j = json as { requests?: RelayRequest[]; continuation?: string } | null;
  if (status === 200 && j?.requests) return { list: j.requests, continuation: j.continuation ?? null, version: "v2" };
  return null;
}
