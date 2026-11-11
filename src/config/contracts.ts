import { isAddress } from "@/config/brand";

/*
 * Elyearn's contract on Elysium.
 *   book  ElyearnRangeBook. No owner, no fee, never holds funds, does not need the $ELYEARN token.
 * Empty => the plan-book panels say "not deployed yet" and every write button is disabled. The pool explorer, planner,
 * position monitor, breakdown and alerts read the chain directly and never need this contract.
 * Check a deployment any time: `npm run verify-deployment -- --book <address> --book-tx <tx>`.
 */
const DEPLOYED = { book: "" };

/**
 * Local tests only: NEXT_PUBLIC_ELYEARN_TEST_CONTRACTS='{"book":"0x…"}' at build time points a second build at a
 * contract deployed on an anvil chain. Never set it on Vercel.
 */
function testOverride(): typeof DEPLOYED | null {
  const raw = process.env.NEXT_PUBLIC_ELYEARN_TEST_CONTRACTS;
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
export const CONTRACT_NAMES = { book: "ElyearnRangeBook" } as const;
