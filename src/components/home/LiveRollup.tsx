"use client";

import { usePoll } from "@/components/providers/ChainProvider";
import { CANONICAL, CHAINS } from "@/config/chains";
import { duration, type RollupState } from "@/lib/withdrawal";

/* The canonical bridge as it stands now, read from the rollup on HyperEVM by the site's server (shared, 60 s). */
export function LiveRollup() {
  const { data, error } = usePoll<RollupState & { readAt: number }>("/api/rollup", 60_000);
  const nextReady = data?.pending.length ? Math.max(0, data.pending[0].createdAtBlock + data.pending[0].confirmPeriodBlocks - data.hyperBlock) * data.secPerBlock : null;
  const lastPending = data?.pending.at(-1) ?? null;
  const lastReady = data && lastPending ? Math.max(0, Math.max(...data.pending.map((a) => a.createdAtBlock + a.confirmPeriodBlocks)) - data.hyperBlock) * data.secPerBlock : null;
  return (
    <div className="es-panel" data-testid="live-rollup">
      <div className="es-panel-head">
        <span className="flex items-center gap-2 text-[14px]">
          <span className={`es-dot ${error ? "bad" : data ? "" : "warn"}`} /> Canonical bridge, live from HyperEVM
        </span>
        <span className="text-[12px] text-[var(--mute)]">{data ? `read ${new Date(data.readAt).toISOString().slice(11, 16)} UTC · block ${data.hyperBlock.toLocaleString("en-US")}` : error ? "not available right now" : "reading…"}</span>
      </div>
      <div className="es-panel-body grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Confirm period now" value={data ? `${data.currentConfirmPeriodBlocks.toLocaleString("en-US")} blocks` : null} sub={data ? `≈ ${duration(data.currentConfirmPeriodBlocks * data.secPerBlock)}` : ""} />
        <Fact label="Claimable so far" value={data ? `${data.confirmed.sendCount.toLocaleString("en-US")} sends` : null} sub={data ? `confirmed up to Elysium block ${data.confirmed.l2Block.toLocaleString("en-US")}` : ""} />
        <Fact label="Assertions in the queue" value={data ? String(data.pending.length) : null} sub={nextReady !== null ? `next confirmable in ${duration(nextReady)}` : data ? "none pending" : ""} />
        <Fact label="Newest asserted, claimable in" value={lastReady !== null ? duration(lastReady) : data ? "—" : null} sub={lastPending ? `covers up to #${lastPending.sendCount.toLocaleString("en-US")}` : ""} />
      </div>
      <p className="es-small border-t border-[var(--line)] px-[18px] py-3">
        Estimated from HyperEVM block time (≈{data?.secPerBlock ?? 0.98} s). Assertions confirm in order, so a newer one waits for older ones. Rollup{" "}
        <a className="underline" href={CHAINS.hyperevm.addressUrl(CANONICAL.rollup)} target="_blank" rel="noreferrer">
          {CANONICAL.rollup.slice(0, 8)}…
        </a>
      </p>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string | null; sub: string }) {
  return (
    <div className="min-w-0">
      <span className="es-label">{label}</span>
      {value === null ? <span className="es-skel block h-7 w-28" /> : <span className="block text-[24px] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>{value}</span>}
      <span className="mt-1 block text-[12px] text-[var(--mute)]">{sub}</span>
    </div>
  );
}
