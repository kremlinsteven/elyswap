import { CHAINS, type ChainKey } from "@/config/chains";

/*
 * The routes Elyswap compares for HYPE leaving Elysium for HyperEVM. Each hop names the bridge, how Elyswap executes it
 * (built here, quoted from the bridge's own API, or a link to the bridge's own app) and the token form after it.
 * Facts and sources: /method and referensi/routes/ROUTES.txt.
 */

export type RouteId = "canonical" | "relay-direct" | "via-robinhood" | "via-solana";

/** "native": Elyswap builds the transaction from the contract itself. "api": quoted by the bridge's API and signed in your wallet. "link": the bridge's own app. */
export type Exec = "native" | "api" | "link";

export type Hop = {
  from: ChainKey;
  to: ChainKey;
  bridge: "canonical" | "relay";
  /** Token sent and token received on this hop. */
  tokenIn: string;
  tokenOut: string;
  exec: Exec;
  /** Why the hop is a link, when it is one. */
  linkReason?: string;
};

export type RouteDef = {
  id: RouteId;
  name: string;
  short: string;
  hops: Hop[];
  /** What you hold at the end, and whether it is the native coin. */
  endsWith: string;
  endsNative: boolean;
  trust: string;
};

export const ROUTES: RouteDef[] = [
  {
    id: "canonical",
    name: "Canonical bridge",
    short: "Direct, slow, no bridge operator",
    hops: [{ from: "elysium", to: "hyperevm", bridge: "canonical", tokenIn: "HYPE", tokenOut: "HYPE", exec: "native" }],
    endsWith: "native HYPE on HyperEVM",
    endsNative: true,
    trust: "Only the rollup: anyone can challenge a wrong state during the challenge period. You send a second transaction on HyperEVM to claim.",
  },
  {
    id: "relay-direct",
    name: "Relay, direct",
    short: "One hop, seconds, a fee",
    hops: [{ from: "elysium", to: "hyperevm", bridge: "relay", tokenIn: "HYPE", tokenOut: "HYPE", exec: "api" }],
    endsWith: "native HYPE on HyperEVM",
    endsNative: true,
    trust: "Relay's solver pays you on HyperEVM from its own funds after your deposit on Elysium. You trust it to fill or refund.",
  },
  {
    id: "via-robinhood",
    name: "Via Robinhood Chain",
    short: "Two hops through ETH",
    hops: [
      { from: "elysium", to: "robinhood", bridge: "relay", tokenIn: "HYPE", tokenOut: "ETH", exec: "api" },
      { from: "robinhood", to: "hyperevm", bridge: "relay", tokenIn: "ETH", tokenOut: "HYPE", exec: "api" },
    ],
    endsWith: "native HYPE on HyperEVM",
    endsNative: true,
    trust: "Relay on both hops. Between them you hold ETH on Robinhood Chain, so the HYPE/ETH price can move before the second hop.",
  },
  {
    id: "via-solana",
    name: "Via Solana",
    short: "Two hops through SOL",
    hops: [
      { from: "elysium", to: "solana", bridge: "relay", tokenIn: "HYPE", tokenOut: "HYPE (Wormhole)", exec: "api" },
      { from: "solana", to: "hyperevm", bridge: "relay", tokenIn: "HYPE (Wormhole)", tokenOut: "HYPE", exec: "link", linkReason: "This hop is signed by a Solana wallet, which this site does not connect. It opens Relay's own app." },
    ],
    endsWith: "native HYPE on HyperEVM",
    endsNative: true,
    trust: "Relay on both hops and a Solana wallet for the second. In between you hold Wormhole-bridged HYPE on Solana (mint 98sM…Mh5g), which relies on Wormhole's guardians.",
  },
];

export const routeById = (id: string) => ROUTES.find((r) => r.id === id) ?? null;

/** Relay's chain id for a chain key (Relay uses 792703809 for Solana). */
export const relayChainId = (key: ChainKey) => CHAINS[key].id;

/** Currency ids Relay uses for each chain's native coin. */
export const NATIVE_CURRENCY: Record<ChainKey, string> = {
  elysium: "0x0000000000000000000000000000000000000000",
  hyperevm: "0x0000000000000000000000000000000000000000",
  robinhood: "0x0000000000000000000000000000000000000000",
  solana: "11111111111111111111111111111111",
};

/** Wormhole-bridged HYPE on Solana (CoinGecko "wormhole-bridged-hype", Jupiter verified; checked 12 Nov 2026). */
export const SOLANA_HYPE = "98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g";

/** Currency Relay is asked for on each side of a hop. */
export function hopCurrency(chain: ChainKey, token: string): string {
  if (chain === "solana" && token.startsWith("HYPE")) return SOLANA_HYPE;
  return NATIVE_CURRENCY[chain];
}

/** Relay's own app, prefilled where its URL accepts it. */
export function relayAppUrl() {
  return "https://relay.link/bridge";
}

/** Decimal string → base units, refusing anything that is not a plain positive amount with at most `decimals` places. */
export function toUnits(text: string, decimals = 18): bigint | null {
  const t = text.trim();
  if (!/^\d{1,12}(\.\d{1,18})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  if (f.length > decimals) return null;
  const v = BigInt(w) * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
  return v > 0n ? v : null;
}

export function fromUnits(v: bigint | string, decimals = 18, digits = 6): string {
  const n = BigInt(v);
  const neg = n < 0n;
  const a = neg ? -n : n;
  const w = a / 10n ** BigInt(decimals);
  const f = (a % 10n ** BigInt(decimals)).toString().padStart(decimals, "0").slice(0, digits).replace(/0+$/, "");
  return `${neg ? "-" : ""}${w}${f ? `.${f}` : ""}`;
}
