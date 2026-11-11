import { BookIcon, ClaimIcon, PinIcon, RouteIcon } from "@/components/site/Icons";
import { ASSETS } from "@/config/assets";
import { QUOTE_SNAPSHOT } from "@/lib/measured";

/*
 * A drawn preview of the route planner, in the slot where a product screenshot sits. Every figure in it is the dated
 * snapshot of real quotes and measured times (src/lib/measured.ts); the live page is /routes.
 */

const ROWS = [
  { name: "Canonical bridge", hops: "1 hop · claim on HyperEVM", out: "1.0000", loss: "gas only", time: "5.6–10.5 days", note: "measured, 1,472 claims", tone: "warn" },
  { name: "Relay, direct", hops: "1 hop", out: "0.9369", loss: `${QUOTE_SNAPSHOT.direct.at1.toFixed(2)}%`, time: "2–6 s", note: "measured, 31 fills", tone: "good" },
  { name: "Via Solana", hops: "2 hops · HYPE on Solana", out: "0.9331", loss: `${QUOTE_SNAPSHOT.viaSolanaHype.toFixed(2)}%`, time: "seconds per hop", note: "hop 2 not measured", tone: "good" },
  { name: "Via Robinhood Chain", hops: "2 hops · through ETH", out: "0.9280", loss: `${QUOTE_SNAPSHOT.viaRobinhoodEth.toFixed(2)}%`, time: "0–5 s + hop 2", note: "hop 2 not measured", tone: "good" },
] as const;

export function AppPreview() {
  return (
    <div className="es-preview" aria-label="Preview of the route planner with quotes from 11 Nov 2026">
      <div className="es-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="grid md:grid-cols-[200px_1fr]">
        <aside className="hidden border-r border-[var(--line)] p-4 md:block">
          <div className="flex items-center gap-2">
            <img src={ASSETS.mark} alt="" width={20} height={20} />
            <span style={{ fontFamily: "var(--head)", fontSize: 16, letterSpacing: "-0.03em" }}>Elyswap</span>
          </div>
          <ul className="mt-6 grid list-none gap-1 p-0 text-[12px] text-[var(--mute)]">
            <li className="flex items-center gap-2 rounded-[5px] bg-[rgb(255_255_255/0.06)] px-2 py-1.5 text-white">
              <RouteIcon size={13} /> Routes
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5">
              <ClaimIcon size={13} /> Withdrawals
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5">
              <PinIcon size={13} /> Hop tracker
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5">
              <BookIcon size={13} /> Journeys
            </li>
          </ul>
        </aside>
        <div className="min-w-0 p-4 pb-28 md:p-5 md:pb-32">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--mute)]">
            <span>
              Send <b className="font-medium text-white">1 HYPE</b> from Elysium to HyperEVM
            </span>
            <span className="mono">quotes {QUOTE_SNAPSHOT.readOn}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {ROWS.map((r) => (
              <div key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-[8px] border border-[var(--line)] bg-black px-3 py-2.5 sm:grid-cols-[minmax(0,1.3fr)_90px_80px_minmax(0,1fr)]">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white">{r.name}</span>
                  <span className="block truncate text-[11px] text-[var(--mute)]">{r.hops}</span>
                </span>
                <span className="mono text-right text-[13px] text-white">{r.out}</span>
                <span className={`mono hidden text-right text-[12px] sm:block ${r.tone === "warn" ? "text-[var(--mute)]" : "text-peach"}`}>{r.loss}</span>
                <span className="col-span-2 min-w-0 text-[11px] text-[var(--mute)] sm:col-span-1 sm:text-right">
                  <span className={r.tone === "warn" ? "text-warn" : "text-good"}>{r.time}</span> · {r.note}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--mute-2)]">Snapshot of real quotes and measured times. Fees change by the minute; the planner reads them live.</p>
        </div>
      </div>
      <div className="es-preview-fade" aria-hidden="true" />
    </div>
  );
}
