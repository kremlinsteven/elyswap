"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND, TOKEN, isAddress, shortAddress } from "@/config/brand";
import { CheckIcon, CopyIcon } from "@/components/site/Icons";

/* Copy CA: one component family, one source (BRAND.ca). Before launch it says "At launch" and copies nothing. */

export function useCopy(value: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard refused; the text stays visible.
    }
  };
  return { copied, copy };
}

/** Header and footer pill. */
export function CaPill({ testid = "ca-pill" }: { testid?: string }) {
  const { copied, copy } = useCopy(BRAND.ca);
  if (!TOKEN.isLive)
    return (
      <Link href="/token" className="es-ca" data-testid={testid} title="The contract address is published at launch">
        <b>{BRAND.symbol}</b> At launch
      </Link>
    );
  return (
    <button type="button" className="es-ca" onClick={copy} data-testid={testid} title="Copy the contract address">
      <b>{BRAND.symbol}</b> {copied ? "Copied" : shortAddress(BRAND.ca, 6, 4)}
    </button>
  );
}

/** Full width CA box. Defaults to the Elysium address; pass `ca` for the Elysium one. */
export function CaRow({ testid = "ca-full", ca = BRAND.ca, network }: { testid?: string; ca?: string; network?: string }) {
  const { copied, copy } = useCopy(ca);
  const live = isAddress(ca);
  return (
    <span className="es-cabox" data-testid={testid}>
      {live ? <code>{ca}</code> : <span>The {BRAND.symbol} address{network ? ` on ${network}` : ""} is published at launch</span>}
      <button type="button" className="es-btn ghost" onClick={copy} disabled={!live} data-testid={`${testid}-copy`}>
        {live ? (copied ? "Copied" : "Copy address") : "At launch"}
      </button>
    </span>
  );
}

/** Any address or hash as a small copy button. */
export function CopyChip({ value, label, head = 6, tail = 4 }: { value: string; label?: string; head?: number; tail?: number }) {
  const { copied, copy } = useCopy(value);
  return (
    <button type="button" className="es-chip" onClick={copy} title={`Copy ${value}`}>
      {label ?? shortAddress(value, head, tail)} {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
    </button>
  );
}
