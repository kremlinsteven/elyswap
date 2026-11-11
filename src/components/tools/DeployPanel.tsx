"use client";

import { useState } from "react";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAIN, explorerAddress, explorerTx } from "@/config/brand";
import { explain, rpcCall, waitForReceipt } from "@/lib/client";
import artifacts from "@/lib/contracts/artifacts.json";

const ART = (artifacts as { contracts: Record<string, { creation: string; sha256: string }> }).contracts.ElyswapJourneyBook;

export function DeployPanel() {
  const { address, onChain, sendTransaction } = useWallet();
  const { open } = useWalletModal();
  const [state, setState] = useState<{ tx?: string; addr?: string | null; err?: string; busy?: boolean; gas?: string }>({});

  async function estimate() {
    try {
      const g = await rpcCall<string>("eth_estimateGas", [{ from: address ?? undefined, data: ART.creation }]);
      setState((s) => ({ ...s, gas: BigInt(g).toLocaleString("en-US") }));
    } catch (e) {
      setState((s) => ({ ...s, err: explain(e) }));
    }
  }

  async function deploy() {
    if (!address) return open();
    setState({ busy: true });
    try {
      const tx = await sendTransaction({ data: ART.creation });
      setState({ busy: true, tx });
      const r = await waitForReceipt(tx, 300_000);
      setState({ tx, addr: r.contractAddress, err: r.ok ? undefined : "The deployment reverted." });
    } catch (e) {
      setState({ err: explain(e) });
    }
  }

  return (
    <div className="es-wrap grid gap-4 pb-24 text-[14px]" data-testid="deploy-panel">
      <div className="es-card grid gap-2">
        <span className="es-label">Build</span>
        <span>
          ElyswapJourneyBook · {(ART.creation.length - 2) / 2} bytes of creation code · sha256 {ART.sha256.slice(0, 16)}…
        </span>
        <span className="text-muted">
          Network: {CHAIN.name} ({CHAIN.id}). Wallet: {address ?? "not connected"} {address && !onChain ? "(switch network first)" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="es-btn ghost" onClick={estimate}>
          Estimate gas
        </button>
        <button type="button" className="es-btn" disabled={state.busy || (address !== null && !onChain)} onClick={deploy} data-testid="deploy-go">
          {address ? "Deploy ElyswapJourneyBook" : "Connect wallet"}
        </button>
      </div>
      {state.gas ? <p className="m-0">Estimated gas: {state.gas}</p> : null}
      {state.tx ? (
        <p className="m-0">
          Tx:{" "}
          <a className="underline" href={explorerTx(state.tx)} target="_blank" rel="noopener noreferrer">
            {state.tx}
          </a>
        </p>
      ) : null}
      {state.addr ? (
        <p className="es-note m-0" data-testid="deploy-address">
          Deployed at{" "}
          <a className="underline" href={explorerAddress(state.addr)} target="_blank" rel="noopener noreferrer">
            {state.addr}
          </a>
          . Next: set it in src/config/contracts.ts, then npm run verify-deployment -- --book {state.addr} --book-tx {state.tx}
        </p>
      ) : null}
      {state.err ? <p className="es-alert">{state.err}</p> : null}
    </div>
  );
}
