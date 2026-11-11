import { NextResponse } from "next/server";
import type { Store } from "@/lib/server/store";
import { clientIp, trustsProxyHeaders } from "@/lib/netkey";
import { spend } from "@/lib/ratelimit";
import { CALLER_LIMIT, CALLER_WINDOW_S } from "@/lib/server/ticksroute";

export { clientIp };

/*
 * Request guards shared by every write endpoint: a hard cap on body size,
 * the caller's IP, and fixed-window rate limits keyed on the verified
 * session address and the IP (never on anything the caller names itself).
 */

export const MAX_BODY = 4096;

/**
 * Reads the body as text but stops at `max` bytes: a chunked body has no
 * content-length, so request.text() alone would buffer whatever is sent.
 * Returns null when the body is larger than `max`.
 */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Parses a small JSON body; null when it is missing, malformed or too large. */
export async function readJson<T>(request: Request, max = MAX_BODY): Promise<T | null> {
  const r = await readBody<T>(request, max);
  return r.ok ? r.value : null;
}

/** Like readJson, but tells "too large" (answer 413) apart from "malformed" (answer 400). */
export async function readBody<T>(request: Request, max = MAX_BODY): Promise<{ ok: true; value: T } | { ok: false; tooLarge: boolean }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > max) return { ok: false, tooLarge: true };
  try {
    const text = await readCapped(request, max);
    if (text === null) return { ok: false, tooLarge: true };
    if (!text) return { ok: false, tooLarge: false };
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

export const tooLarge = () => NextResponse.json({ error: "Request body too large." }, { status: 413 });

/**
 * True when the caller is still within `max` requests per `windowSec` for
 * every given key. Each key counts separately.
 */
export async function allow(store: Store | null, bucket: string, keys: string[], max: number, windowSec: number) {
  // spend() falls back to an in-process counter when the store fails: never open.
  const results = await Promise.all(keys.map((k) => spend(store, bucket, k, 1, max, windowSec)));
  return results.every(Boolean);
}

/** True when forwarded headers are believed (see netkey.ts). */
const trustedIp = trustsProxyHeaders();

/** One public limit: `perIp` requests per `windowSec` for each caller, and the site-wide ceiling per `siteWindowSec`. */
export type PublicLimit = { perIp: number; windowSec: number; site: number; siteWindowSec: number };

/** The windows every public route uses, in one place so a limit can never be passed in the wrong position again. */
export const RATE_LIMITS = {
  /** /api/pools: served from one shared snapshot; a page polls once a minute plus debounced searches. */
  pools: { perIp: 40, windowSec: 60, site: 1200, siteWindowSec: 60 },
  /** /api/ticks: one request every 30 s per open alerts page is 20 per 10 minutes. */
  ticks: { perIp: CALLER_LIMIT, windowSec: CALLER_WINDOW_S, site: 1200, siteWindowSec: 60 },
  /** /api/pool: one v4 pool by id, used once per unknown watch. */
  pool: { perIp: 30, windowSec: 600, site: 600, siteWindowSec: 60 },
  /** /api/positions: a wallet read, cached 20 s, polled once a minute. */
  positions: { perIp: 12, windowSec: 60, site: 300, siteWindowSec: 60 },
} as const satisfies Record<string, PublicLimit>;

/**
 * Limit for endpoints open to signed-out callers. With a trusted IP the
 * per-IP limit is enough. Without one (self-hosted, no proxy) a forged header
 * would give every request a fresh IP, so a site-wide ceiling applies too.
 * That ceiling is shared by everyone, so it is not used where the IP can be
 * trusted: one caller must not be able to lock everyone else out.
 */
export async function allowPublic(store: Store | null, request: Request, bucket: string, limit: PublicLimit) {
  if (!(await allow(store, bucket, [clientIp(request)], limit.perIp, limit.windowSec))) return false;
  return trustedIp || allow(store, `${bucket}:site`, ["all"], limit.site, limit.siteWindowSec);
}

export const tooMany = () => NextResponse.json({ error: "Too many requests. Slow down a little." }, { status: 429 });
export const badBody = () => NextResponse.json({ error: "Invalid or oversized request body." }, { status: 400 });
