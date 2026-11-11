"use client";

import { useEffect, useState } from "react";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAINS } from "@/config/chains";
import { fromUnits } from "@/lib/routes";
import { duration, isTxHash, type Stage } from "@/lib/withdrawal";
import type { TrackedWithdrawal } from "@/lib/server/orbit";

type Answer = { query: string; total: number; shown: number; withdrawals: TrackedWithdrawal[]; confirmedSendCount: number; readAt: number; found: boolean };

const STAGE: Record<Stage, { label: string; tone: string; text: string }> = {
  claimed: { label: "Claimed", tone: "plain", text: "Already executed on HyperEVM. Nothing left to do." },
  ready: { label: "Ready to claim", tone: "good", text: "Confirmed on HyperEVM. Send the claim to receive the HYPE." },
  challenge: { label: "Challenge period", tone: "warn", text: "Inside a posted assertion that is still in its challenge period." },
  waiting: { label: "Waiting for an assertion", tone: "plain", text: "Not yet inside any assertion posted on HyperEVM. Its period starts when the next assertion covers it." },
};

export function WithdrawalsView() {
  const { address } = useWallet();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [data, setData] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("tx") ?? q.get("address");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (v) {
      setInput(v);
      setQuery(v);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!query) return;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      setLoading(true);
      const key = isTxHash(query) ? "tx" : "address";
      const res = await fetch(`/api/withdrawals?${key}=${query}`, { cache: "no-store" }).catch(() => null);
      const j = (await res?.json().catch(() => null)) as (Answer & { error?: string }) | null;
      if (stop) return;
      setLoading(false);
      if (!res?.ok || !j || j.error) {
        setErr(j?.error ?? "The site could not be reached.");
        return;
      }
      setErr(null);
      setData(j);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [query]);

  function submit(v: string) {
    const t = v.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(t) && !isTxHash(t)) {
      setErr("Paste the address that receives the HYPE on HyperEVM, or the Elysium transaction of the withdrawal.");
      return;
    }
    setErr(null);
    setData(null);
    setQuery(t);
    history.replaceState(null, "", `?${isTxHash(t) ? "tx" : "address"}=${t}`);
  }

  return (
    <div className="es-wrap grid gap-6 pb-24">
      <form
        className="es-panel"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="es-panel-body grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block min-w-0">
            <span className="es-label">Receiving address on HyperEVM, or an Elysium transaction</span>
            <input className="es-input mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x…" spellCheck={false} data-testid="w-input" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="es-btn" data-testid="w-go">
              Find withdrawals
            </button>
            {address ? (
              <button
                type="button"
                className="es-btn ghost"
                onClick={() => {
                  setInput(address);
                  submit(address);
                }}
              >
                Use my wallet
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {err ? <p className="es-alert m-0">{err}</p> : null}
      {loading && !data ? <div className="es-skel h-32" /> : null}

      {data ? (
        <div className="grid gap-4" data-testid="w-list">
          <p className="es-small m-0">
            {data.found ? `${data.total} withdrawal${data.total === 1 ? "" : "s"} found${data.total > data.shown ? `, newest ${data.shown} shown` : ""}.` : "Elysium does not know this transaction (yet)."} Read {new Date(data.readAt).toISOString().slice(11, 19)} UTC; refreshed every minute.
            Confirmed on HyperEVM up to send #{data.confirmedSendCount.toLocaleString("en-US")}.
          </p>
          {data.found && data.total === 0 ? <p className="es-note m-0">No canonical withdrawal here. A withdrawal sent through a fast bridge does not appear: use the hop tracker for that.</p> : null}
          {data.withdrawals.map((w) => (
            <WithdrawalCard key={`${w.txHash}-${w.position}`} w={w} readAt={data.readAt} now={now} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WithdrawalCard({ w, readAt, now }: { w: TrackedWithdrawal; readAt: number; now: number }) {
  const st = STAGE[w.status.stage];
  const left = w.status.etaSeconds === null ? null : Math.max(0, w.status.etaSeconds - (now - readAt) / 1000);
  const value = BigInt(w.callvalue);
  const isToken = w.data !== "0x";
  return (
    <div className="es-card" data-testid="w-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[24px] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>
            {isToken && value === 0n ? "Token withdrawal" : `${fromUnits(value, 18, 6)} HYPE`}
          </span>
          <span className="block text-[12px] text-[var(--mute)]">
            send #{w.position.toLocaleString("en-US")} · sent {new Date(w.timestamp * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
        </div>
        <span className={`es-tag ${st.tone}`} data-testid="w-stage">
          {st.label}
        </span>
      </div>
      <p className="es-body mt-4">{st.text}</p>
      {w.status.stage === "challenge" ? (
        <div className="mt-4">
          <span className="es-label">Claimable in about</span>
          <span className="block text-[28px] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }} data-testid="w-eta">
            {duration(left)}
          </span>
          <span className="block text-[12px] text-[var(--mute)]">at HyperEVM block {w.status.readyBlock?.toLocaleString("en-US")}, estimated from block time; plus one confirmation transaction{w.status.rival ? ". A rival assertion was posted: a challenge decides first" : ""}.</span>
        </div>
      ) : null}
      {w.status.stage === "waiting" ? (
        <div className="mt-4">
          <span className="es-label">At least</span>
          <span className="block text-[28px] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>
            {duration(w.status.minSeconds)}
          </span>
          <span className="block text-[12px] text-[var(--mute)]">once the next assertion includes it; it also waits for every older assertion to confirm.</span>
        </div>
      ) : null}
      <dl className="es-kv mt-5">
        <dt>Elysium transaction</dt>
        <dd>
          <a className="mono underline" href={CHAINS.elysium.txUrl(w.txHash)} target="_blank" rel="noreferrer">
            {w.txHash.slice(0, 10)}…{w.txHash.slice(-6)}
          </a>
        </dd>
        <dt>Receives on HyperEVM</dt>
        <dd>
          <a className="mono underline" href={CHAINS.hyperevm.addressUrl(w.destination)} target="_blank" rel="noreferrer">
            {w.destination.slice(0, 8)}…{w.destination.slice(-6)}
          </a>
        </dd>
        {isToken ? (
          <>
            <dt>Message</dt>
            <dd>{(w.data.length - 2) / 2} bytes of call data (a token gateway withdrawal)</dd>
          </>
        ) : null}
      </dl>
      {w.status.stage === "ready" ? <Claim w={w} /> : null}
    </div>
  );
}

function Claim({ w }: { w: TrackedWithdrawal }) {
  const { address, sendTransaction } = useWallet();
  const { open } = useWalletModal();
  const [s, setS] = useState<{ phase: "idle" | "preparing" | "prepared" | "signing" | "sent"; err?: string; gas?: string | null; sim?: string | null; to?: string; data?: string; proof?: number; tx?: string }>({ phase: "idle" });

  async function prepare() {
    if (!address) return open();
    setS({ phase: "preparing" });
    const res = await fetch(`/api/claim?tx=${w.txHash}&position=${w.position}&from=${address}`, { cache: "no-store" }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { error?: string; to: string; data: string; gas: string | null; simError: string | null; proofLength: number } | null;
    if (!res?.ok || !j || j.error) return setS({ phase: "idle", err: j?.error ?? "The claim could not be prepared." });
    setS({ phase: "prepared", to: j.to, data: j.data, gas: j.gas, sim: j.simError, proof: j.proofLength });
  }
  async function sign() {
    if (!s.to || !s.data) return;
    setS((p) => ({ ...p, phase: "signing", err: undefined }));
    try {
      const tx = await sendTransaction({ to: s.to, data: s.data, chain: "hyperevm" });
      setS((p) => ({ ...p, phase: "sent", tx }));
    } catch (e) {
      setS((p) => ({ ...p, phase: "prepared", err: e instanceof Error ? e.message : "The wallet did not send it." }));
    }
  }
  return (
    <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5" data-testid="w-claim">
      {s.phase === "prepared" || s.phase === "signing" ? (
        <dl className="es-kv">
          <dt>Contract</dt>
          <dd className="mono">Outbox {s.to?.slice(0, 8)}… on HyperEVM</dd>
          <dt>Proof</dt>
          <dd>{s.proof} hashes, checked against the Outbox</dd>
          <dt>Simulation</dt>
          <dd className={s.sim ? "text-bad" : "text-good"}>{s.sim ? `fails: ${s.sim}` : `passes, ≈ ${Number(s.gas).toLocaleString("en-US")} gas`}</dd>
        </dl>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="es-btn ghost" onClick={prepare} disabled={s.phase === "preparing" || s.phase === "signing" || s.phase === "sent"} data-testid="w-prepare">
          {!address ? "Connect to claim" : s.phase === "preparing" ? "Building the proof…" : s.phase === "prepared" ? "Prepare again" : "Prepare the claim"}
        </button>
        <button type="button" className="es-btn" onClick={sign} disabled={s.phase !== "prepared" || Boolean(s.sim)} data-testid="w-sign">
          {s.phase === "signing" ? "Confirm in wallet…" : "Claim on HyperEVM"}
        </button>
      </div>
      {s.tx ? (
        <p className="es-note m-0">
          Claim sent:{" "}
          <a className="underline" href={CHAINS.hyperevm.txUrl(s.tx)} target="_blank" rel="noreferrer">
            {s.tx.slice(0, 12)}…
          </a>
          . The HYPE goes to {w.destination.slice(0, 6)}…{w.destination.slice(-4)} on HyperEVM.
        </p>
      ) : null}
      {s.err ? <p className="es-alert m-0">{s.err}</p> : null}
      <p className="es-small m-0">The wallet switches to HyperEVM (chain 999) and needs a little HYPE there for gas. Anyone may send this claim; the HYPE always goes to the address written in the withdrawal.</p>
    </div>
  );
}
