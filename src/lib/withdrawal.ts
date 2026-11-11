/*
 * Pure rules for a canonical Elysium → HyperEVM withdrawal (Arbitrum Orbit, BoLD). No I/O, so they are unit tested.
 *
 * A withdrawal is an L2ToL1Tx event on Elysium with a position (its index in the outbox's send list). It can be claimed
 * on HyperEVM once an assertion whose Elysium block has sendCount > position is CONFIRMED there. An assertion is
 * confirmable `confirmPeriodBlocks` HyperEVM blocks after it was created, if nobody challenged it.
 */

export type Assertion = {
  hash: string;
  /** HyperEVM block where the assertion was created. */
  createdAtBlock: number;
  /** Confirm period stored in the assertion itself (it can differ from the rollup's current setting). */
  confirmPeriodBlocks: number;
  /** Elysium block the assertion ends at, and its outbox send count there. */
  l2Block: number;
  sendCount: number;
  l2Timestamp: number;
  /** A second child exists = a rival assertion was posted: a challenge is running and confirmation waits for it. */
  rival: boolean;
};

export type RollupState = {
  confirmed: Assertion;
  /** Created but not confirmed, oldest first. */
  pending: Assertion[];
  hyperBlock: number;
  hyperTimestamp: number;
  currentConfirmPeriodBlocks: number;
  secPerBlock: number;
};

export type WithdrawalEvent = {
  txHash: string;
  position: number;
  caller: string;
  destination: string;
  arbBlockNum: number;
  ethBlockNum: number;
  timestamp: number;
  callvalue: string;
  data: string;
};

export type Stage =
  /** Claimed on HyperEVM already. */
  | "claimed"
  /** Covered by a confirmed assertion: claimable now. */
  | "ready"
  /** In a created assertion that is still inside its challenge period. */
  | "challenge"
  /** Not yet inside any assertion. */
  | "waiting";

export type WithdrawalStatus = {
  stage: Stage;
  /** For "challenge": HyperEVM block from which the covering assertion can be confirmed. */
  readyBlock: number | null;
  /** Estimated seconds until claimable (0 when ready). Null when it cannot be estimated. */
  etaSeconds: number | null;
  /** Lowest number of seconds still ahead when nothing covers the withdrawal yet (the confirm period alone). */
  minSeconds: number | null;
  /** The covering assertion, when there is one. */
  assertion: string | null;
  rival: boolean;
};

export function stageOf(w: Pick<WithdrawalEvent, "position">, spent: boolean, s: RollupState): WithdrawalStatus {
  if (spent) return { stage: "claimed", readyBlock: null, etaSeconds: 0, minSeconds: null, assertion: null, rival: false };
  if (w.position < s.confirmed.sendCount) return { stage: "ready", readyBlock: null, etaSeconds: 0, minSeconds: null, assertion: s.confirmed.hash, rival: false };
  const at = s.pending.findIndex((a) => a.sendCount > w.position);
  const cover = at >= 0 ? s.pending[at] : null;
  if (cover) {
    // An assertion is confirmed only after its parent is, so its ready block is the latest deadline on the path to it:
    // a newer assertion with a shorter confirm period still waits for the older ones before it.
    const readyBlock = Math.max(...s.pending.slice(0, at + 1).map((a) => a.createdAtBlock + a.confirmPeriodBlocks));
    // Confirmation is one more transaction after the deadline; a rival assertion means a challenge decides first.
    const left = Math.max(0, readyBlock - s.hyperBlock);
    return { stage: "challenge", readyBlock, etaSeconds: Math.round(left * s.secPerBlock), minSeconds: null, assertion: cover.hash, rival: cover.rival || s.pending.some((a) => a.rival) };
  }
  // Not asserted yet: at least the current confirm period from the next assertion, and never before the last pending deadline.
  const lastDeadline = s.pending.length ? Math.max(...s.pending.map((a) => a.createdAtBlock + a.confirmPeriodBlocks)) : 0;
  const floorBlocks = Math.max(s.currentConfirmPeriodBlocks, lastDeadline - s.hyperBlock);
  return { stage: "waiting", readyBlock: null, etaSeconds: null, minSeconds: Math.round(floorBlocks * s.secPerBlock), assertion: null, rival: s.pending.some((a) => a.rival) };
}

/** Seconds as "5 d 12 h", "3 h 04 m", "45 s". */
export function duration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} m`;
  if (m > 0) return `${m} m ${String(s % 60).padStart(2, "0")} s`;
  return `${s} s`;
}

/** Padded 32-byte topic for an address filter. */
export function addressTopic(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Not an address.");
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
}

export const isTxHash = (v: string) => /^0x[0-9a-fA-F]{64}$/.test(v);
