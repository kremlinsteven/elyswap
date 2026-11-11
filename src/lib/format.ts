/** 709_571_103 -> "709.6M". */
export function compact(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export const usd = (n: number | null | undefined, digits = 2) =>
  n == null || !Number.isFinite(n) ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export function ago(unixSeconds: number, now = Date.now() / 1000) {
  const d = Math.max(0, Math.floor(now - unixSeconds));
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export const bytesLabel = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

export const fmtInt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—");
export const fmtUsd = (n: number) => (Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");
/** Token amount from base units (string) with decimals, whole tokens with separators. */
export function fmtSupply(raw: string | null, decimals: number | null) {
  if (!raw || decimals == null) return "—";
  try {
    const whole = BigInt(raw) / 10n ** BigInt(decimals);
    return whole.toLocaleString("en-US");
  } catch {
    return "—";
  }
}

/** 396_000 -> "396k", 48_812 -> "48.8k", 2_041 -> "2.0k", 564 -> "564". */
export function kfmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e5) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Age of an ISO date in words ("3h ago"); "—" for empty or invalid input. */
export function isoAgo(iso: string, now = Date.now()) {
  const t = Date.parse(iso);
  if (!iso || !Number.isFinite(t)) return "—";
  return ago(t / 1000, now / 1000);
}

/** Transfer amount: whole tokens with separators, "<1" for dust above zero. */
export function fmtAmount(raw: string, decimals: number) {
  try {
    const v = BigInt(raw);
    const whole = v / 10n ** BigInt(decimals);
    return whole === 0n && v > 0n ? "<1" : whole.toLocaleString("en-US");
  } catch {
    return "—";
  }
}

/** A small or large number with a few significant digits, without exponent notation down to 1e-12. */
export function sig(n: number | null | undefined, digits = 3): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: abs >= 100000 ? 0 : 1 });
  if (abs < 1e-12) return n.toExponential(1);
  return n.toLocaleString("en-US", { maximumSignificantDigits: digits, maximumFractionDigits: 18 });
}

export const pctText = (n: number | null | undefined, digits = 2) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const floor = 10 ** -digits;
  if (n !== 0 && Math.abs(n * 100) < floor) return `under ${floor.toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
  return `${(n * 100).toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
};

/** Raw token units to a short whole-unit string. */
export function rawText(raw: bigint | string | null | undefined, decimals: number | null | undefined, digits = 4): string {
  if (raw === null || raw === undefined || decimals === null || decimals === undefined) return "—";
  const n = Number(BigInt(raw)) / 10 ** decimals;
  return Number.isFinite(n) ? sig(n, digits) : "—";
}

export const dateText = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");

/** Blocks as rough time, at this chain's pace of about 0.104 s a block. */
export function blockSpan(blocks: number) {
  const hours = (blocks * 0.104) / 3600;
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (hours < 48) return `about ${Math.round(hours)} hours`;
  return `about ${Math.round(hours / 24)} days`;
}
