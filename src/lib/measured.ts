/*
 * Measured numbers, never promises. The canonical figures are a dated snapshot computed on 12 Nov 2026 from every
 * L2ToL1Tx on Elysium matched to its OutBoxTransactionExecuted on HyperEVM, and from every BoLD assertion created and
 * confirmed on the rollup (evidence: referensi/routes/evidence/). Relay figures are recomputed live from Relay's own
 * request log (src/app/api/stats) and fall back to the snapshot below when that log cannot be read.
 */

export type Spread = { n: number; min: number; median: number; p90: number; max: number };

export function spread(values: number[]): Spread | null {
  const v = values.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const q = (p: number) => {
    // Nearest-rank percentile.
    const i = Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1));
    return v[i];
  };
  return { n: v.length, min: v[0], median: q(0.5), p90: q(0.9), max: v[v.length - 1] };
}

/** Seconds from the origin transaction to the destination transaction, from one Relay request record. */
export function relaySeconds(r: { status?: string; data?: { inTxs?: { timestamp?: number }[]; outTxs?: { timestamp?: number }[] } }): number | null {
  if (r.status !== "success") return null;
  const a = r.data?.inTxs?.[0]?.timestamp;
  const b = r.data?.outTxs?.[0]?.timestamp;
  if (typeof a !== "number" || typeof b !== "number" || b < a) return null;
  return b - a;
}

export const CANONICAL_SNAPSHOT = {
  readOn: "2026-11-12",
  /** Withdrawal sent on Elysium → claim executed on HyperEVM, hours (includes how long people waited to claim). */
  sentToClaimedHours: { n: 1472, min: 134.2, median: 151.0, p90: 157.6, max: 251.3, from: "2026-10-21", to: "2026-11-11" },
  /** Assertion created → confirmed on HyperEVM, hours (the challenge period as it ran). */
  assertionConfirmHours: { n: 43, min: 132.2, median: 132.7, max: 134.4 },
  /** Gap between assertions, minutes, up to 11 Nov (a withdrawal waits for the next one before its period starts). Recent ones came about hourly. */
  assertionGapMinutes: { median: 719.9, max: 1051.3 },
  /** Rollup confirm period changed from 483,840 to 86,400 HyperEVM blocks at 2026-11-11 16:03 UTC (HyperEVM tx 0xcbc80a1d…4b25). */
  periodChangedAt: "2026-11-11 16:03 UTC",
  periodChangeTx: "0xcbc80a1d59c4adcb53853ecc0fa2384c98ebae2a71f546744643d0231b364b25",
  withdrawalsSent: 4980,
  withdrawalsClaimed: 1472,
  /** Confirm period stored in the assertions confirmed so far, and the rollup's setting read on 12 Nov 2026. */
  confirmPeriodBlocksPast: 483840,
  confirmPeriodBlocksNow: 86400,
  exampleWithdrawal: { value: "14.4 HYPE", sent: "0xa06c0e00f31396c08e2cfe89b1cb8b04684c0e5894028435ecbaecd07bf6746b", claimed: "0x02ef3a8ebe9e1edfce8e2535eacc2348e2917308488109e35a88b969c5000607", hours: 152.3 },
} as const;

/** Relay quote snapshot (11 Nov 2026, ~22:40 UTC): HYPE lost end to end, all fees and swaps included. Live quotes replace it. */
export const QUOTE_SNAPSHOT = {
  readOn: "2026-11-11 22:40 UTC",
  direct: { at1: 6.31, at10: 6.3, at100: 6.35 },
  viaRobinhoodEth: 7.2,
  viaSolanaHype: 6.69,
  viaRobinhoodBridgedHype: { at1: 8.5, at10: 9.1, at100: 15 },
  relayMaxHype: 888,
} as const;

/** Relay request log snapshot, used only when the live log cannot be read. Filled from referensi/routes/ROUTES.txt. */
export const RELAY_SNAPSHOT = {
  readOn: "2026-11-12",
  note: "Relay requests that started on Elysium, origin transaction to destination transaction.",
  from: "2026-11-09",
  to: "2026-11-11",
  /** Seconds, origin tx → destination tx, per destination chain key, HYPE sent from Elysium. */
  byDestination: {
    hyperevm: { n: 31, min: 2, median: 4, p90: 6, max: 6 },
    robinhood: { n: 35, min: 0, median: 2, p90: 4, max: 5 },
    solana: { n: 90, min: 1, median: 3, p90: 5, max: 7 },
  } as Record<string, Spread>,
};

export function hoursText(h: number) {
  if (h >= 48) return `${(h / 24).toFixed(1)} days`;
  return `${h.toFixed(1)} h`;
}

export function secondsText(s: number) {
  if (s < 90) return `${Math.round(s)} s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}
