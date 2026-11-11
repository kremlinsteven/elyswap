"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, hexToString, keccak256, pad, stringToHex, toHex } from "viem";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAINS, chainById, type ChainKey } from "@/config/chains";
import { CONTRACTS, bookLive } from "@/config/contracts";
import { BOOK_ABI, HOP_STATUS, JOURNEY_STATUS } from "@/lib/abi";
import { explain, read, waitForReceipt } from "@/lib/client";
import { ROUTES, fromUnits, routeById, toUnits } from "@/lib/routes";

type Journey = { owner: string; status: number; hopCount: number; createdAt: bigint; updatedAt: bigint; editor: string; pendingOwner: string; routeId: `0x${string}`; recipient: `0x${string}`; planHash: string; amountIn: bigint; originChain: bigint; destChain: bigint };
type Hop = { fromChain: bigint; toChain: bigint; status: number; attempts: number; sentAt: bigint; doneAt: bigint; bridge: `0x${string}`; sourceTx: `0x${string}`; destTx: `0x${string}` };

const label = (b: `0x${string}`) => {
  try {
    return hexToString(b, { size: 32 }).replace(/\0+$/, "");
  } catch {
    return b.slice(0, 10);
  }
};
const ZERO = `0x${"0".repeat(64)}`;
const keyOf = (id: bigint) => chainById(Number(id))?.key ?? null;

export function BookView() {
  const live = bookLive();
  const [id, setId] = useState("");
  const [shown, setShown] = useState<bigint | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("id");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q && /^\d{1,9}$/.test(q)) setShown(BigInt(q));
  }, []);

  return (
    <div className="es-wrap grid gap-6 pb-24">
      {!live ? (
        <div className="es-warn" data-testid="book-not-deployed">
          ElyswapJourneyBook is not deployed on Elysium yet. The forms below are shown so you can see what it records; every write button stays disabled until the contract address is published here. The route planner and both trackers work without it.
        </div>
      ) : (
        <p className="es-small m-0">
          Contract{" "}
          <a className="mono underline" href={CHAINS.elysium.addressUrl(CONTRACTS.book)} target="_blank" rel="noreferrer">
            {CONTRACTS.book}
          </a>{" "}
          on Elysium. It holds no funds and has no admin.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <OpenForm live={live} onOpened={(n) => setShown(n)} />
        <div className="es-panel">
          <div className="es-panel-head">
            <span className="text-[16px]">Look up a journey</span>
          </div>
          <form
            className="es-panel-body grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{1,9}$/.test(id)) setShown(BigInt(id));
            }}
          >
            <label className="block">
              <span className="es-label">Journey number</span>
              <input className="es-input mono" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ""))} placeholder="1" data-testid="book-id" />
            </label>
            <button type="submit" className="es-btn ghost w-fit" disabled={!live || !id}>
              Show journey
            </button>
            <MyJourneys live={live} onPick={(n) => setShown(n)} />
          </form>
        </div>
      </div>
      {live && shown !== null ? <JourneyCard id={shown} /> : null}
    </div>
  );
}

function OpenForm({ live, onOpened }: { live: boolean; onOpened: (id: bigint) => void }) {
  const { address, sendTransaction } = useWallet();
  const { open } = useWalletModal();
  const [route, setRoute] = useState("via-robinhood");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q.get("route") && routeById(q.get("route")!)) setRoute(q.get("route")!);
    if (q.get("amount") && toUnits(q.get("amount")!)) setAmount(q.get("amount")!);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const r = routeById(route)!;
  async function submit() {
    if (!address) return open();
    const wei = toUnits(amount);
    if (!wei) return setMsg({ err: "Enter an amount like 1 or 25.5." });
    setBusy(true);
    setMsg({});
    try {
      const hops = r.hops.map((h) => ({ fromChain: BigInt(CHAINS[h.from].id), toChain: BigInt(CHAINS[h.to].id), bridge: stringToHex(h.bridge, { size: 32 }) }));
      const planHash = keccak256(toHex(JSON.stringify({ route: r.id, amount: wei.toString(), hops: r.hops.map((h) => [h.from, h.to, h.bridge, h.tokenIn, h.tokenOut]) })));
      const data = encodeFunctionData({ abi: BOOK_ABI, functionName: "open", args: [{ routeId: stringToHex(r.id, { size: 32 }), recipient: pad(address as `0x${string}`, { size: 32 }), planHash, amountIn: wei, hops }] });
      const tx = await sendTransaction({ to: CONTRACTS.book, data, chain: "elysium" });
      const rc = await waitForReceipt(tx);
      if (!rc.ok) throw new Error("The transaction reverted.");
      const count = await read<bigint>({ to: CONTRACTS.book, abi: BOOK_ABI, fn: "journeyCount" });
      setMsg({ ok: `Opened. Your journey is probably #${count} (check "My journeys").` });
      onOpened(count);
    } catch (e) {
      setMsg({ err: explain(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-panel">
      <div className="es-panel-head">
        <span className="text-[16px]">Open a journey</span>
      </div>
      <div className="es-panel-body grid gap-3">
        <label className="block">
          <span className="es-label">Route</span>
          <select className="es-input" value={route} onChange={(e) => setRoute(e.target.value)} data-testid="book-route">
            {ROUTES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="es-label">HYPE sent (as you declare it)</span>
          <input className="es-input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <ol className="m-0 grid list-none gap-1 p-0 text-[13px] text-[var(--mute)]">
          {r.hops.map((h, i) => (
            <li key={i}>
              hop {i + 1}: {CHAINS[h.from].name} → {CHAINS[h.to].name} ({h.bridge})
            </li>
          ))}
        </ol>
        <p className="es-small m-0">The book records your claims: hashes you paste are checked by readers against each chain, not by the contract. Recipient: your connected address.</p>
        <button type="button" className="es-btn w-fit" disabled={!live || busy} onClick={submit} data-testid="book-open">
          {!live ? "Not deployed yet" : busy ? "Confirm in wallet…" : address ? "Open on Elysium" : "Connect wallet"}
        </button>
        {msg.ok ? <p className="es-note m-0">{msg.ok}</p> : null}
        {msg.err ? <p className="es-alert m-0">{msg.err}</p> : null}
      </div>
    </div>
  );
}

function MyJourneys({ live, onPick }: { live: boolean; onPick: (id: bigint) => void }) {
  const { address } = useWallet();
  const [ids, setIds] = useState<bigint[] | null>(null);
  useEffect(() => {
    if (!live || !address) return;
    read<[bigint[], bigint]>({ to: CONTRACTS.book, abi: BOOK_ABI, fn: "journeysOf", args: [address, 0n, 100n] })
      .then(([list]) => setIds([...list].reverse()))
      .catch(() => setIds([]));
  }, [live, address]);
  if (!live || !address) return null;
  return (
    <div>
      <span className="es-label">My journeys</span>
      <div className="flex flex-wrap gap-2">
        {ids === null ? <span className="es-small">reading…</span> : ids.length === 0 ? <span className="es-small">none yet</span> : ids.map((n) => (
          <button key={n.toString()} type="button" className="es-chip" onClick={() => onPick(n)}>
            #{n.toString()}
          </button>
        ))}
      </div>
    </div>
  );
}

function JourneyCard({ id }: { id: bigint }) {
  const { address, sendTransaction } = useWallet();
  const [j, setJ] = useState<Journey | null>(null);
  const [hops, setHops] = useState<Hop[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const [jj, hh] = await Promise.all([read<Journey>({ to: CONTRACTS.book, abi: BOOK_ABI, fn: "journey", args: [id] }), read<Hop[]>({ to: CONTRACTS.book, abi: BOOK_ABI, fn: "hops", args: [id] })]);
      setJ(jj);
      setHops([...hh]);
      setErr(null);
    } catch (e) {
      setErr(explain(e));
    }
  }, [id]);
  useEffect(() => {
    // Reading the journey from chain whenever the shown number changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const canEdit = Boolean(address && j && (address.toLowerCase() === j.owner.toLowerCase() || address.toLowerCase() === j.editor.toLowerCase()) && (j.status === 1 || j.status === 2));
  async function write(fn: "recordSent" | "recordDelivered", index: number) {
    const raw = (input[index] ?? "").trim();
    const hop = hops[index];
    const side = keyOf(fn === "recordSent" ? hop.fromChain : hop.toChain);
    // A Solana signature (64 bytes) does not fit in bytes32: the book stores keccak256 of its text instead.
    const h = side === "solana" && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(raw) ? keccak256(toHex(raw)) : raw;
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) return setErr(side === "solana" ? "Paste the Solana transaction signature." : "Paste a 0x + 64 hex transaction hash.");
    setBusy(true);
    try {
      const data = encodeFunctionData({ abi: BOOK_ABI, functionName: fn, args: [id, index, h as `0x${string}`] });
      const tx = await sendTransaction({ to: CONTRACTS.book, data, chain: "elysium" });
      await waitForReceipt(tx);
      setInput((s) => ({ ...s, [index]: "" }));
      await load();
    } catch (e) {
      setErr(explain(e));
    } finally {
      setBusy(false);
    }
  }

  if (err && !j) return <p className="es-alert m-0">{err}</p>;
  if (!j) return <div className="es-skel h-40" />;
  const route = routeById(label(j.routeId));
  return (
    <div className="es-card" data-testid="journey">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="es-label">Journey #{id.toString()}</span>
          <span className="block text-[24px] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>
            {route?.name ?? label(j.routeId)} · {fromUnits(j.amountIn, 18, 6)} HYPE
          </span>
          <span className="es-small">owner {j.owner.slice(0, 6)}…{j.owner.slice(-4)} · opened {new Date(Number(j.createdAt) * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
        </div>
        <span className={`es-tag ${j.status === 3 ? "good" : j.status === 4 ? "bad" : "warn"}`}>{JOURNEY_STATUS[j.status]}</span>
      </div>
      <ol className="mt-6 grid list-none gap-3 p-0">
        {hops.map((h, i) => {
          const from = keyOf(h.fromChain);
          const to = keyOf(h.toChain);
          return (
            <li key={i} className="rounded-[8px] border border-[var(--line)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span>
                  hop {i + 1}: {from ? CHAINS[from].name : h.fromChain.toString()} → {to ? CHAINS[to].name : h.toChain.toString()} · {label(h.bridge)}
                </span>
                <span className={`es-tag ${h.status === 3 ? "good" : h.status === 4 ? "bad" : h.status === 2 ? "warn" : "plain"}`}>{HOP_STATUS[h.status]}</span>
              </div>
              <div className="mt-2 grid gap-1 text-[12px]">
                {h.sourceTx !== ZERO && from ? <TxLine chain={from} hash={h.sourceTx} label="source" /> : null}
                {h.destTx !== ZERO && to ? <TxLine chain={to} hash={h.destTx} label="delivery" /> : null}
              </div>
              {canEdit && (h.status === 1 || h.status === 2) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input className="es-input mono min-w-0 flex-1" value={input[i] ?? ""} onChange={(e) => setInput((s) => ({ ...s, [i]: e.target.value }))} placeholder={(h.status === 1 ? from : to) === "solana" ? "Solana signature" : h.status === 1 ? "source tx hash" : "delivery tx hash"} />
                  <button type="button" className="es-btn ghost" disabled={busy} onClick={() => write(h.status === 1 ? "recordSent" : "recordDelivered", i)}>
                    {h.status === 1 ? "Record sent" : "Record delivered"}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {err ? <p className="es-alert mt-4">{err}</p> : null}
      <p className="es-small mt-4">
        Share: <span className="mono">/journeys?id={id.toString()}</span>. Every hash above links to its own chain&apos;s explorer, so anyone can check it.
      </p>
    </div>
  );
}

function TxLine({ chain, hash, label: l }: { chain: ChainKey; hash: string; label: string }) {
  if (chain === "solana") return <span className="mono truncate">{l}: keccak256 of a Solana signature {hash.slice(0, 10)}…</span>;
  return (
    <a className="mono truncate underline" href={CHAINS[chain].txUrl(hash)} target="_blank" rel="noreferrer">
      {l}: {hash.slice(0, 14)}…{hash.slice(-8)} on {CHAINS[chain].name}
    </a>
  );
}
