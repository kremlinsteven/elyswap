import { BRAND } from "@/config/brand";

/* Words used in several places (pages, llms.txt, README checks). One source, so the limits never drift apart. */

export const NAV = [
  { href: "/routes", label: "Routes" },
  { href: "/withdrawals", label: "Withdrawals" },
  { href: "/track", label: "Hop tracker" },
  { href: "/journeys", label: "Journeys" },
  { href: "/method", label: "Method" },
] as const;

export const MORE = [{ href: "/token", label: `${BRAND.symbol} token` }] as const;

/** Said next to every route and in the README: Elyswap never promises a time. */
export const NO_PROMISE = "Times are measured ranges from past transfers, with their dates. They are not a promise: a bridge can slow down, pause or refund.";

/** Said wherever a third-party bridge is offered. */
export const TRUST_LINE = "A fast route swaps the 5–6 day wait for trust in a bridge operator and a fee. The canonical bridge trusts only the rollup.";

export const PLANNED = [
  { name: "One-click multi-hop", text: "Signing every hop of a route in one flow, with the next hop prepared when the previous one lands. Today each hop is its own signature." },
  { name: "More chains and bridges", text: "Other exits and bridges once each is confirmed on chain with measured delivery times." },
  { name: `${BRAND.symbol} fee discounts`, text: "Only if Elyswap ever charges a fee. Today it charges none, and nothing here needs the token." },
] as const;
