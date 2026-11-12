import { isAddress } from "@/config/brand";

/*
 * Elyswap's contract on Elysium.
 *   book  ElyswapJourneyBook. No owner, no fee, no payable function, never holds funds, does not need the $ELYSWAP token.
 * Live on Elysium mainnet since block 5,123,301 (creation tx below). The route planner and both trackers read the
 * chains directly and never need this contract.
 * Check a deployment any time: `npm run verify-deployment -- --book <address> --book-tx <tx>`.
 */
const DEPLOYED = { book: "0xac622259b8420080ec2085ee08660fc7059766a3" };

/** Creation transaction and block of the book, shown on /journeys and checked by verify-deployment. */
export const BOOK_DEPLOYMENT = {
  tx: "0x7f6f42a0ff1593684a339d5b66e0e34d65fe1ef0077c23e0d79333a7a8c7d033",
  block: 5123301,
} as const;

/**
 * Local tests only: NEXT_PUBLIC_ELYSWAP_TEST_CONTRACTS='{"book":"0x…"}' at build time points a second build at a
 * contract deployed on an anvil chain. Never set it on Vercel.
 */
function testOverride(): typeof DEPLOYED | null {
  const raw = process.env.NEXT_PUBLIC_ELYSWAP_TEST_CONTRACTS;
  if (!raw) return null;
  try {
    const v = { ...DEPLOYED, ...(JSON.parse(raw) as Partial<typeof DEPLOYED>) };
    return isAddress(v.book) ? v : null;
  } catch {
    return null;
  }
}

export const CONTRACTS = testOverride() ?? DEPLOYED;
export const bookLive = () => isAddress(CONTRACTS.book);
export const CONTRACT_NAMES = { book: "ElyswapJourneyBook" } as const;
