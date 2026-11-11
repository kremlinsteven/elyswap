"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ChainFacts = { block: number | null; gasWei: string | null; hypeUsd: { value: number; source: string } | null; readAt: number };

const Ctx = createContext<ChainFacts | null>(null);

/** Polls a JSON route every `ms` while the tab is visible; pauses when hidden and reads again on return. */
export function usePoll<T>(url: string | null, ms: number): { data: T | null; error: string | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        const j = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
        if (stop) return;
        if (!res.ok || !j) setError(j?.error ?? `The server answered ${res.status}.`);
        else {
          setData(j);
          setError(null);
        }
      } catch {
        if (!stop) setError("The site could not be reached.");
      } finally {
        if (!stop) {
          timer = setTimeout(run, ms);
        }
      }
    };
    const onVis = () => {
      if (!document.hidden) {
        if (timer) clearTimeout(timer);
        run();
      }
    };
    run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, ms, tick]);
  return { data, error, loading: Boolean(url) && data === null && error === null, refresh: () => setTick((t) => t + 1) };
}

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const { data } = usePoll<ChainFacts>("/api/chain", 15_000);
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export const useChain = () => useContext(Ctx);
