"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { usePoll } from "@/components/providers/ChainProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ArrowUpRight, CheckIcon } from "@/components/site/Icons";
import { CANONICAL, CHAINS, type ChainKey } from "@/config/chains";
import { ARBSYS_ABI } from "@/lib/abi";
import { CANONICAL_SNAPSHOT as C, rangeText, secondsText, type Spread } from "@/lib/measured";
import { ROUTES, fromUnits, relayAppUrl, routeById, toUnits, type RouteDef } from "@/lib/routes";
import type { HopQuote, RouteQuote } from "@/lib/server/quotes";
import { NO_PROMISE, TRUST_LINE } from "@/lib/content";

type Stats = { source: "live" | "snapshot"; sample: number; from: string | null; to: string | null; byDestination: Record<string, Spread>; readAt: number };

const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}%`);
const usd = (v: number | null) => (v === null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`);

/** The measured time line for a route, from Relay's request log (per hop destination) or the canonical snapshot. */
function timeLine(r: RouteDef, stats: Stats | null): { text: string; note: string } {
  if (r.id === "canonical") {
    const h = C.sentToClaimedHours;
    return { text: `${(h.min / 24).toFixed(1)}–${(h.max / 24).toFixed(1)} days`, note: `median ${(h.median / 24).toFixed(1)} d, ${h.n.toLocaleString("en-US")} claims ${h.from} → ${h.to}` };
  }
  const first = stats?.byDestination[r.hops[0].to];
  if (!first) return { text: "—", note: "not measured" };
  const src = stats?.source === "live" ? `live sample of ${first.n}` : `${first.n} transfers ${stats?.from} → ${stats?.to}`;
  if (r.hops.length === 1) return { text: rangeText(first.min, first.max), note: `median ${secondsText(first.median)}, ${src}` };
  return { text: `${rangeText(first.min, first.max)} + hop 2`, note: `hop 1 ${src}; hop 2 not measured (bridge estimate)` };
}

export function PlannerView() {
  const [amountText, setAmountText] = useState("1");
  const [debounced, setDebounced] = useState("1");
  const [selected, setSelected] = useState<string>("relay-direct");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("route");
    const a = q.get("amount");
    // Reading the address bar once on load: this page has no server-side state to keep in sync.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (r && routeById(r)) setSelected(r);
    if (a && toUnits(a)) {
      setAmountText(a);
      setDebounced(a);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(amountText.trim()), 500);
    return () => clearTimeout(t);
  }, [amountText]);

  const amount = toUnits(debounced);
  const bad = amountText.trim() !== "" && toUnits(amountText) === null;
  const stats = usePoll<Stats>("/api/stats", 10 * 60_000).data;

  return (
    <div className="es-wrap grid gap-8 pb-24">
      <div className="es-panel">
        <div className="es-panel-body grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block min-w-0">
            <span className="es-label">HYPE to move from Elysium to HyperEVM</span>
            <input className="es-input mono" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} aria-invalid={bad} data-testid="amount" />
          </label>
          <div className="flex flex-wrap gap-2">
            {["1", "10", "100"].map((v) => (
              <button key={v} type="button" className="es-btn ghost sm" onClick={() => setAmountText(v)}>
                {v} HYPE
              </button>
            ))}
          </div>
          {bad ? <p className="es-alert m-0 md:col-span-2">Enter a plain amount like 1 or 25.5 (up to 18 decimals).</p> : null}
        </div>
      </div>

      <p className="es-note m-0">
        {NO_PROMISE} {TRUST_LINE}
      </p>

      <div className="grid gap-4" data-testid="routes">
        {ROUTES.map((r) => (
          <RouteCard key={r.id} route={r} amount={amount} stats={stats} selected={selected === r.id} onSelect={() => setSelected(r.id)} />
        ))}
      </div>

      {amount ? <Execute route={routeById(selected)!} amount={amount} /> : null}
    </div>
  );
}

function RouteCard({ route, amount, stats, selected, onSelect }: { route: RouteDef; amount: bigint | null; stats: Stats | null; selected: boolean; onSelect: () => void }) {
  const url = amount ? `/api/quote?route=${route.id}&amount=${fromUnits(amount, 18, 18)}` : null;
  const { data, error } = usePoll<RouteQuote>(url, 30_000);
  const q = data && amount && data.amountIn === amount.toString() ? data : null;
  const t = timeLine(route, stats);
  const fee = q ? q.hops.reduce((s, h) => s + (h.relayerFeeUsd ?? 0) + (h.gasUsd ?? 0), 0) : null;
  const hopError = q?.hops.find((h) => h.error)?.error ?? null;
  return (
    <div className={`es-card p-0 ${selected ? "border-[rgb(255_193_147/0.55)]" : ""}`} data-testid={`route-${route.id}`}>
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[18px] font-normal">{route.name}</h2>
            <span className="es-tag plain">{route.hops.length === 1 ? "1 hop" : `${route.hops.length} hops`}</span>
          </div>
          <p className="es-small mt-1">{route.short}</p>
        </div>
        <div className="min-w-0">
          <span className="es-label">You end with</span>
          <span className="block text-[22px] tracking-[-0.02em]" style={{ fontFamily: "var(--head)" }} data-testid={`out-${route.id}`}>
            {q?.amountOut ? `${fromUnits(q.amountOut, 18, 4)} HYPE` : error || hopError ? "—" : <span className="es-skel inline-block h-6 w-28 align-middle" />}
          </span>
          <span className="block text-[12px] text-[var(--mute)]">
            {route.id === "canonical" ? "minus gas on two chains" : q ? `${pct(q.lossPct)} less · fees ≈ ${usd(fee)}` : (hopError ?? error ?? "quoting…")}
          </span>
        </div>
        <div className="min-w-0">
          <span className="es-label">Measured time</span>
          <span className={`block text-[18px] ${route.id === "canonical" ? "text-warn" : "text-good"}`}>{t.text}</span>
          <span className="block text-[12px] text-[var(--mute)]">{t.note}</span>
        </div>
        <button type="button" className={selected ? "es-btn" : "es-btn ghost"} onClick={onSelect} aria-pressed={selected} data-testid={`pick-${route.id}`}>
          {selected ? (
            <>
              <CheckIcon size={14} /> Selected
            </>
          ) : (
            "Choose"
          )}
        </button>
      </div>
      <div className="grid gap-3 border-t border-[var(--line)] p-5 md:grid-cols-2 md:p-6">
        <ol className="m-0 grid list-none gap-2 p-0">
          {route.hops.map((h, i) => {
            const hq = q?.hops[i];
            return (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
                <span className="mono text-[var(--mute)]">hop {i + 1}</span>
                <span>
                  {CHAINS[h.from].name} {h.tokenIn} → {CHAINS[h.to].name} {h.tokenOut}
                </span>
                <span className={`es-tag ${h.exec === "link" ? "warn" : "plain"}`}>{h.bridge === "canonical" ? "canonical" : "Relay"} · {h.exec === "native" ? "built here" : h.exec === "api" ? "sign here" : "bridge's app"}</span>
                {hq?.amountOut && i < route.hops.length - 1 ? <span className="text-[12px] text-[var(--mute)]">→ {fromUnits(hq.amountOut, hq.decimalsOut, 6)} {h.tokenOut}</span> : null}
              </li>
            );
          })}
        </ol>
        <p className="es-small m-0">
          <b className="font-normal text-white">Ends with {route.endsWith}.</b> {route.trust}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- execute */

function Execute({ route, amount }: { route: RouteDef; amount: bigint }) {
  const { address, sendTransaction } = useWallet();
  const { open } = useWalletModal();
  return (
    <section className="es-panel" data-testid="execute">
      <div className="es-panel-head">
        <span className="text-[16px]">Send: {route.name}</span>
        <span className="text-[12px] text-[var(--mute)]">{fromUnits(amount, 18, 6)} HYPE · each hop is its own signature</span>
      </div>
      <div className="es-panel-body grid gap-5">
        {!address ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="es-body m-0">Connect a wallet to build the transactions. Quotes above need no wallet.</p>
            <button type="button" className="es-btn" onClick={open} data-testid="execute-connect">
              Connect wallet
            </button>
          </div>
        ) : route.id === "canonical" ? (
          <CanonicalSend amount={amount} address={address} send={sendTransaction} />
        ) : (
          <RelayHops route={route} amount={amount} address={address} send={sendTransaction} />
        )}
        <p className="es-small m-0">
          Start with a small amount. Want a shareable record of this journey? <Link className="underline" href={`/journeys?route=${route.id}&amount=${fromUnits(amount, 18, 18)}`}>Write it to the journey book</Link>.
        </p>
      </div>
    </section>
  );
}

type Send = (tx: { to?: string; data: string; value?: bigint; chain?: ChainKey }) => Promise<string>;

function CanonicalSend({ amount, address, send }: { amount: bigint; address: string; send: Send }) {
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const data = encodeFunctionData({ abi: ARBSYS_ABI, functionName: "withdrawEth", args: [address as `0x${string}`] });
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      setTx(await send({ to: CANONICAL.arbSys, data, value: amount, chain: "elysium" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The wallet did not send it.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-4">
      <dl className="es-kv">
        <dt>Contract</dt>
        <dd className="mono">ArbSys {CANONICAL.arbSys.slice(0, 6)}…{CANONICAL.arbSys.slice(-4)} on Elysium</dd>
        <dt>Call</dt>
        <dd className="mono">withdrawEth({address.slice(0, 6)}…{address.slice(-4)})</dd>
        <dt>Value</dt>
        <dd className="mono">{fromUnits(amount, 18, 18)} HYPE</dd>
        <dt>Arrives</dt>
        <dd>after the challenge period, when you claim on HyperEVM</dd>
      </dl>
      <div className="es-warn">
        Canonical withdrawals cannot be cancelled or sped up. Assertions created before 11 Nov 16:03 UTC still run their full 5.5-day period, and newer ones confirm after them. You will claim on HyperEVM yourself, from the withdrawal tracker; it needs a little HYPE for gas
        there.
      </div>
      <label className="es-check cursor-pointer">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} data-testid="canonical-ack" />
        <span className="text-[14px]">I understand this takes days and needs a claim on HyperEVM.</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="es-btn" disabled={!ok || busy} onClick={go} data-testid="canonical-send">
          {busy ? "Confirm in wallet…" : "Sign the withdrawal on Elysium"}
        </button>
      </div>
      {tx ? (
        <p className="es-note m-0">
          Sent:{" "}
          <a className="underline" href={CHAINS.elysium.txUrl(tx)} target="_blank" rel="noreferrer">
            {tx.slice(0, 12)}…
          </a>
          . Follow it on the <Link className="underline" href={`/withdrawals?tx=${tx}`}>withdrawal tracker</Link>.
        </p>
      ) : null}
      {err ? <p className="es-alert m-0">{err}</p> : null}
    </div>
  );
}

function RelayHops({ route, amount, address, send }: { route: RouteDef; amount: bigint; address: string; send: Send }) {
  const [solana, setSolana] = useState("");
  const needsSol = route.hops.some((h) => h.to === "solana");
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const amounts = useMemo(() => route.hops.map((_, i) => (i === 0 ? amount : null)), [route, amount]);
  return (
    <div className="grid gap-6">
      {needsSol ? (
        <label className="block">
          <span className="es-label">Your Solana address (receives hop 1, signs hop 2)</span>
          <input className="es-input mono" value={solana} onChange={(e) => setSolana(e.target.value.trim())} placeholder="Solana wallet address" data-testid="solana-address" />
        </label>
      ) : null}
      {route.hops.map((h, i) => (
        <HopRun
          key={`${route.id}-${i}`}
          route={route}
          index={i}
          address={address}
          solana={solana}
          fixedAmount={amounts[i]}
          manualAmount={inputs[i] ?? ""}
          setManualAmount={(v) => setInputs((s) => ({ ...s, [i]: v }))}
          send={send}
        />
      ))}
    </div>
  );
}

type RunState = { phase: "idle" | "quoting" | "quoted" | "signing" | "sent" | "done" | "failed"; quote?: HopQuote; tx?: string; err?: string; status?: string; delivered?: { chain: string; hash: string }[] };

function HopRun({ route, index, address, solana, fixedAmount, manualAmount, setManualAmount, send }: { route: RouteDef; index: number; address: string; solana: string; fixedAmount: bigint | null; manualAmount: string; setManualAmount: (v: string) => void; send: Send }) {
  const hop = route.hops[index];
  const [s, setS] = useState<RunState>({ phase: "idle" });
  const decimalsIn = hop.from === "solana" ? 9 : 18;
  const amount = fixedAmount ?? toUnits(manualAmount, decimalsIn);

  // Poll Relay's status for a sent hop until it is filled or refunded.
  useEffect(() => {
    if (s.phase !== "sent" || !s.quote?.requestId) return;
    let stop = false;
    const tick = async () => {
      const r = await fetch(`/api/track?requestId=${s.quote!.requestId}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (stop || !r?.relay) return;
      if (r.relay.status === "success") setS((p) => ({ ...p, phase: "done", status: "delivered", delivered: r.relay.outTxs }));
      else if (["failure", "refund", "refunded"].includes(r.relay.status)) setS((p) => ({ ...p, phase: "failed", status: r.relay.status }));
      else setS((p) => ({ ...p, status: r.relay.status }));
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [s.phase, s.quote]);

  async function quote() {
    if (!amount) return;
    setS({ phase: "quoting" });
    const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ route: route.id, hop: index, amountWei: amount.toString(), user: address, solana }) }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as (HopQuote & { error?: string }) | null;
    if (!res?.ok || !j || j.error || j.txs.length === 0) return setS({ phase: "failed", err: j?.error ?? "No transaction came back from the bridge." });
    setS({ phase: "quoted", quote: j });
  }

  async function sign() {
    const q = s.quote;
    if (!q) return;
    setS((p) => ({ ...p, phase: "signing", err: undefined }));
    try {
      let last = "";
      for (const t of q.txs) last = await send({ to: t.to, data: t.data, value: BigInt(t.value || "0"), chain: hop.from });
      setS((p) => ({ ...p, phase: "sent", tx: last }));
    } catch (e) {
      setS((p) => ({ ...p, phase: "quoted", err: e instanceof Error ? e.message : "The wallet did not send it." }));
    }
  }

  const q = s.quote;
  return (
    <div className="rounded-[10px] border border-[var(--line)] p-4" data-testid={`hop-${index}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px]">
          Hop {index + 1}: {CHAINS[hop.from].name} {hop.tokenIn} → {CHAINS[hop.to].name} {hop.tokenOut}
        </span>
        <span className={`es-tag ${s.phase === "done" ? "good" : s.phase === "failed" ? "bad" : "plain"}`}>{s.phase === "done" ? "delivered" : s.phase === "sent" ? (s.status ?? "sent") : s.phase}</span>
      </div>

      {hop.exec === "link" ? (
        <div className="mt-3 grid gap-3">
          <p className="es-small m-0">{hop.linkReason} Use the amount that landed on Solana, and send it to {address.slice(0, 6)}…{address.slice(-4)} on HyperEVM.</p>
          <a className="es-btn ghost w-fit" href={relayAppUrl()} target="_blank" rel="noreferrer">
            Open Relay&apos;s app <ArrowUpRight size={13} />
          </a>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {fixedAmount === null ? (
            <label className="block">
              <span className="es-label">
                {hop.tokenIn} that arrived on {CHAINS[hop.from].name}
              </span>
              <input className="es-input mono" inputMode="decimal" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="amount that landed after hop 1" />
            </label>
          ) : null}
          {q ? (
            <dl className="es-kv">
              <dt>You send</dt>
              <dd className="mono">
                {fromUnits(q.amountIn, decimalsIn, 8)} {hop.tokenIn} on {CHAINS[hop.from].name}
              </dd>
              <dt>Quoted out</dt>
              <dd className="mono">
                {q.amountOut ? fromUnits(q.amountOut, q.decimalsOut, 8) : "—"} {hop.tokenOut}
              </dd>
              <dt>Minimum out</dt>
              <dd className="mono">{q.minimumOut ? fromUnits(q.minimumOut, q.decimalsOut, 8) : "—"}</dd>
              <dt>Fees</dt>
              <dd>
                relayer {usd(q.relayerFeeUsd)} · gas {usd(q.gasUsd)}
              </dd>
              <dt>Transaction</dt>
              <dd className="mono">
                to {q.txs[0].to.slice(0, 8)}… on {CHAINS[hop.from].name}, value {fromUnits(q.txs[0].value, 18, 8)}
              </dd>
            </dl>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="es-btn ghost" disabled={!amount || s.phase === "quoting" || s.phase === "signing" || s.phase === "sent" || (hop.to === "solana" && !solana)} onClick={quote} data-testid={`hop-${index}-quote`}>
              {s.phase === "quoting" ? "Asking the bridge…" : q ? "Re-quote" : "Get the transaction"}
            </button>
            <button type="button" className="es-btn" disabled={s.phase !== "quoted"} onClick={sign} data-testid={`hop-${index}-sign`}>
              {s.phase === "signing" ? "Confirm in wallet…" : `Sign on ${CHAINS[hop.from].name}`}
            </button>
          </div>
          {s.tx ? (
            <p className="es-note m-0">
              Sent:{" "}
              <a className="underline" href={CHAINS[hop.from].txUrl(s.tx)} target="_blank" rel="noreferrer">
                {s.tx.slice(0, 12)}…
              </a>{" "}
              · <Link className="underline" href={`/track?chain=${hop.from}&tx=${s.tx}${s.quote?.requestId ? `&rid=${s.quote.requestId}` : ""}`}>track this hop</Link>
              {s.delivered?.length ? (
                <>
                  {" "}
                  · delivered{" "}
                  {s.delivered.map((d) => (
                    <a key={d.hash} className="underline" href={CHAINS[(d.chain in CHAINS ? d.chain : hop.to) as ChainKey].txUrl(d.hash)} target="_blank" rel="noreferrer">
                      {d.hash.slice(0, 10)}…
                    </a>
                  ))}
                </>
              ) : null}
            </p>
          ) : null}
          {s.err ? <p className="es-alert m-0">{s.err}</p> : null}
          <p className="es-small m-0">The quote expires within a minute or so; re-quote if the wallet waits. Relay fills or refunds; the status above is Relay&apos;s own.</p>
        </div>
      )}
    </div>
  );
}
