"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAINS, type ChainKey } from "@/config/chains";
import { fromUnits } from "@/lib/routes";
import { duration } from "@/lib/withdrawal";
import type { TrackedWithdrawal } from "@/lib/server/orbit";

type Receipt = { status: "pending" | "confirmed" | "failed" | "not found"; block: number | null; time: number | null; from: string | null; to: string | null };
type RelayView = { found: boolean; status: string | null; requestId: string | null; inTxs: { chain: string; hash: string }[]; outTxs: { chain: string; hash: string }[]; seconds: number | null; note: string | null };
type Answer = { chain: ChainKey; tx: string; receipt: Receipt | null; relay: RelayView; canonical: TrackedWithdrawal[]; readAt: number };

const KEYS: ChainKey[] = ["elysium", "robinhood", "solana", "hyperevm"];
const toneOf = (s: string | null | undefined) => (s === "confirmed" || s === "success" ? "good" : s === "failed" || s === "failure" || s === "refund" ? "bad" : s === "pending" || s === "waiting" ? "warn" : "plain");
const txLink = (chain: string, hash: string) => (chain in CHAINS ? CHAINS[chain as ChainKey].txUrl(hash) : null);

/** A hop list kept in this browser only, so a multi-hop journey can be followed without any account. */
type Saved = { chain: ChainKey; tx: string };
const STORE = "es1.hops";

export function TrackView() {
  const [chain, setChain] = useState<ChainKey>("elysium");
  const [tx, setTx] = useState("");
  const [hops, setHops] = useState<Saved[]>([]);

  useEffect(() => {
    let saved: Saved[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "[]") as Saved[];
    } catch {
      saved = [];
    }
    const q = new URLSearchParams(window.location.search);
    const c = q.get("chain") as ChainKey | null;
    const t = q.get("tx");
    if (c && c in CHAINS && t && !saved.some((h) => h.tx === t)) saved = [...saved, { chain: c, tx: t }];
    // Restoring this browser's list once on load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHops(saved.slice(-8));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(hops));
    } catch {
      // Storage refused: the list lives for this visit only.
    }
  }, [hops]);

  const valid = chain === "solana" ? /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(tx.trim()) : /^0x[0-9a-fA-F]{64}$/.test(tx.trim());

  return (
    <div className="es-wrap grid gap-6 pb-24">
      <form
        className="es-panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const t = tx.trim();
          setHops((h) => (h.some((x) => x.tx === t) ? h : [...h, { chain, tx: t }].slice(-8)));
          setTx("");
        }}
      >
        <div className="es-panel-body grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="es-label">Sent on</span>
            <select className="es-input" value={chain} onChange={(e) => setChain(e.target.value as ChainKey)} data-testid="t-chain">
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {CHAINS[k].name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="es-label">Source transaction of the hop</span>
            <input className="es-input mono" value={tx} onChange={(e) => setTx(e.target.value)} placeholder={chain === "solana" ? "Solana signature" : "0x…"} spellCheck={false} data-testid="t-input" />
          </label>
          <button type="submit" className="es-btn" disabled={!valid} data-testid="t-add">
            Add hop
          </button>
        </div>
      </form>
      <p className="es-small m-0">Your hop list stays in this browser only. Add the hops of one journey in order; each is read again every 20 seconds while this page is open.</p>
      {hops.length === 0 ? <p className="es-note m-0">No hop yet. Paste the transaction you sent on the first chain.</p> : null}
      <ol className="m-0 grid list-none gap-4 p-0" data-testid="t-list">
        {hops.map((h, i) => (
          <li key={h.tx}>
            <HopCard n={i + 1} hop={h} onRemove={() => setHops((all) => all.filter((x) => x.tx !== h.tx))} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function HopCard({ n, hop, onRemove }: { n: number; hop: Saved; onRemove: () => void }) {
  const [a, setA] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      const res = await fetch(`/api/track?chain=${hop.chain}&tx=${hop.tx}`, { cache: "no-store" }).catch(() => null);
      const j = (await res?.json().catch(() => null)) as (Answer & { error?: string }) | null;
      if (stop) return;
      if (!res?.ok || !j || j.error) setErr(j?.error ?? "Could not read this hop right now.");
      else {
        setErr(null);
        setA(j);
      }
    };
    load();
    const t = setInterval(load, 20_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [hop]);

  const r = a?.receipt;
  const rel = a?.relay;
  return (
    <div className="es-card" data-testid="t-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="es-label">
            Hop {n} · {CHAINS[hop.chain].name}
          </span>
          <a className="mono block truncate text-[14px] underline" href={CHAINS[hop.chain].txUrl(hop.tx)} target="_blank" rel="noreferrer">
            {hop.tx}
          </a>
        </div>
        <button type="button" className="es-btn ghost sm" onClick={onRemove}>
          Remove
        </button>
      </div>
      {err ? <p className="es-alert mt-4">{err}</p> : null}
      {!a && !err ? <div className="es-skel mt-4 h-16" /> : null}
      {a ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <span className="es-label">On {CHAINS[hop.chain].name}</span>
            {r ? (
              <>
                <span className={`es-tag ${toneOf(r.status)}`} data-testid="t-receipt">
                  {r.status}
                </span>
                <p className="es-small mt-2">{r.block ? `block ${r.block.toLocaleString("en-US")}${r.time ? ` · ${new Date(r.time * 1000).toISOString().slice(0, 19).replace("T", " ")} UTC` : ""}` : r.status === "pending" ? "In the mempool, not in a block yet." : "This chain does not know the transaction."}</p>
              </>
            ) : (
              <p className="es-small m-0">Solana receipts are not read here; the bridge status on the right comes from the bridge itself.</p>
            )}
          </div>
          <div className="min-w-0">
            <span className="es-label">Bridge</span>
            {rel?.found ? (
              <>
                <span className={`es-tag ${toneOf(rel.status)}`} data-testid="t-relay">
                  Relay · {rel.status}
                </span>
                <p className="es-small mt-2">
                  {rel.seconds !== null ? `Delivered ${rel.seconds} s after the source transaction. ` : ""}
                  {rel.outTxs.map((o) => {
                    const l = txLink(o.chain, o.hash);
                    return l ? (
                      <a key={o.hash} className="mr-2 underline" href={l} target="_blank" rel="noreferrer">
                        delivery on {CHAINS[o.chain as ChainKey]?.name ?? o.chain}
                      </a>
                    ) : (
                      <span key={o.hash} className="mr-2">
                        delivery on chain {o.chain}
                      </span>
                    );
                  })}
                </p>
              </>
            ) : a.canonical.length ? (
              <p className="es-small m-0">Canonical bridge withdrawal (no bridge operator).</p>
            ) : (
              <p className="es-small m-0">{rel?.note ?? "No Relay request starts with this transaction."}</p>
            )}
          </div>
          {a.canonical.map((w) => (
            <div key={w.position} className="es-note md:col-span-2">
              Canonical withdrawal of {fromUnits(w.callvalue, 18, 6)} HYPE (send #{w.position}): <b className="font-normal text-white">{w.status.stage}</b>
              {w.status.stage === "challenge" ? `, claimable in about ${duration(w.status.etaSeconds)}` : ""}.{" "}
              <Link className="underline" href={`/withdrawals?tx=${w.txHash}`}>
                Open in the withdrawal tracker
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
