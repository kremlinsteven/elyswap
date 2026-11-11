/* Display helpers shared by the app routes. Plain functions, no React. */

type Tok = { symbol: string; address: string; known?: boolean; lookalike?: boolean };

/** A symbol as shown: known tokens by name, others with a short address so a copied symbol cannot pass for the real one. */
export function tokenLabel(t: Tok): string {
  if (t.known) return t.symbol;
  return `${t.symbol} (${t.address.slice(0, 6)}…${t.address.slice(-4)})`;
}

export const pairLabel = (p: { token0: Tok; token1: Tok }) => `${tokenLabel(p.token0)}/${tokenLabel(p.token1)}`;

/** Fee in pips (1e6 = 100%) as a percent. */
export function feeLabel(pips: number | null, dynamic = false): string {
  if (pips === null || !Number.isFinite(pips)) return dynamic ? "dynamic" : "—";
  const pct = pips / 10_000;
  const s = pct >= 1 ? pct.toFixed(pct % 1 === 0 ? 0 : 2) : pct.toFixed(pct >= 0.1 ? 2 : 3);
  return `${s.includes(".") ? s.replace(/\.?0+$/, "") : s}%${dynamic ? " dyn" : ""}`;
}

/**
 * Dollars, one rule everywhere: K / M / B / T from $10,000 up, exactly two decimals below (four significant digits
 * under one cent), never an exponent.
 */
export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e15) return `${sign}$${Math.round(a / 1e12).toLocaleString("en-US")}T`;
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  if (a > 0 && a < 0.01) return `${sign}$${small(a, 4)}`;
  return `${sign}$${a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/**
 * A positive number below 0.001 with its leading zeros counted in a subscript, as trading screens show tiny prices:
 * 0.0000000997 -> "0.0₇997". Never an exponent.
 */
function small(a: number, sig: number): string {
  if (a >= 0.001) return Number(a.toPrecision(sig)).toLocaleString("en-US", { maximumFractionDigits: 12 });
  const zeros = Math.ceil(-Math.log10(a)) - 1;
  const digits = Math.round(a * 10 ** (zeros + sig))
    .toString()
    .slice(0, sig)
    .replace(/0+$/, "");
  const sub = String(zeros)
    .split("")
    .map((d) => SUB[Number(d)])
    .join("");
  return `0.0${sub}${digits || "0"}`;
}

const T = 1e12;

/** A number with a sensible number of significant digits; never an exponent (T suffix above a trillion). */
export function num(n: number | null | undefined, sig = 4): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a === 0) return "0";
  if (a >= 1e15) return `${sign}${Math.round(a / T).toLocaleString("en-US")}T`;
  if (a >= T) return `${sign}${(a / T).toFixed(2)}T`;
  if (a < 0.001) return `${sign}${small(a, Math.min(sig, 4))}`;
  if (a >= 1e6) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return Number(n.toPrecision(sig)).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

/**
 * A price: five significant digits with trailing zeros kept so a column reads evenly (71.200, 232.97, 0.014044);
 * grouped without decimals from 100,000 up; tiny prices with a subscript zero count. Never an exponent.
 */
export function price(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a >= 1e5 || a < 0.001) return num(n, 5);
  const [i, f] = n.toPrecision(5).split(".");
  return `${Number(i).toLocaleString("en-US")}${f ? `.${f}` : ""}`;
}

/** Raw integer amount with decimals, shown with up to `sig` significant digits. */
export function amount(raw: string | bigint, decimals: number, sig = 4): string {
  const v = typeof raw === "bigint" ? raw : BigInt(raw);
  return num(Number(v) / 10 ** decimals, sig);
}

export const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(d)}%`);

export function signed(n: number, unit = "", sig = 4) {
  if (!Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n), sig)}${unit ? ` ${unit}` : ""}`;
}

export function ago(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}
