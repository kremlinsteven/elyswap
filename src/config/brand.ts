// Single place to change project identity. Everything on the site reads from here.
// To publish the real contract address, replace the value of CA below. The header pill, the footer, the token page
// and every explorer link derive from it. Anything that is not a 0x + 40 hex address is treated as "not launched yet".

/** Contract address of $ELYSWAP on Elysium. "TBA" until the token launches. */
const CA: string = "TBA";

/**
 * True once the domain points at this deployment. While false, the production *.vercel.app host is served as is (kept
 * out of search with noindex) instead of redirecting to a domain that does not serve the site.
 * On 12 Nov 2026 elyswap.cash existed on Cloudflare but had no A record.
 */
export const DOMAIN_LIVE = true;

export const isAddress = (v: string): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v);

const NAME = "Elyswap";
const SLUG = "elyswap";
/** Shown upper case everywhere. */
const TICKER = "ELYSWAP";
const DOMAIN = "elyswap.cash";
/** X account of the project. */
const X_HANDLE = "elyswap";

export const BRAND = {
  name: NAME,
  short: NAME,
  slug: SLUG,
  ticker: TICKER,
  symbol: `$${TICKER}`,
  domain: DOMAIN,
  url: `https://${DOMAIN}`,
  slogan: "Don't Wait Days for Your HYPE.",
  tagline: "Plan the Route. Track Every Hop.",
  category: "Bridge route planner for HYPE leaving Elysium",
  chainName: "Elysium",
  description: `${NAME} compares the ways to move HYPE from Elysium to HyperEVM: the canonical bridge with its multi-day challenge period, or faster third-party routes with their own fees and trust. It tracks canonical withdrawals and lets you claim them on HyperEVM.`,
  x: `https://x.com/${X_HANDLE}`,
  xHandle: `@${X_HANDLE}`,
  // Public source repository: hidden until it exists.
  github: "",
  ca: CA,
} as const;

/** True once BRAND.github points at an actual repository, not the bare host. */
export const hasGithub = /^https:\/\/github\.com\/[^/]+/.test(BRAND.github);

// Public endpoint is the default. An operator can point the site at a private RPC with ELYSIUM_RPC_URL (server) /
// NEXT_PUBLIC_ELYSIUM_RPC_URL (browser). Both are optional.
const PUBLIC_RPC = "https://rpc.elysium.kinetiq.xyz";

/** Elysium mainnet (Kinetiq): an Arbitrum Orbit L2 that settles to HyperEVM and uses HYPE as gas. Checked 12 Nov 2026. */
export const CHAIN = {
  id: 99901,
  hex: "0x1863d",
  name: "Elysium",
  nativeSymbol: "HYPE",
  decimals: 18,
  publicRpc: PUBLIC_RPC,
  rpc: process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL || PUBLIC_RPC,
  /** The chain has one public endpoint; the fallback is the same host. */
  fallbackRpc: PUBLIC_RPC,
  spareRpc: PUBLIC_RPC,
  /** Explorer pages live at the root: /token/<address>, /address/<address>, /tx/<hash>. */
  explorer: "https://elysium.kinetiq.xyz",
  /**
   * Fallback only, when block timestamps cannot be read: seconds per block measured on 11 Nov 2026 (0.1245 s over the
   * last 100,000 blocks). The explorer measures the block time of its own window and uses that.
   */
  fallbackBlockSeconds: 0.1245,
} as const;

/** wallet_addEthereumChain parameters: the gas token is named HYPE (a wallet shows this name), never "Ether". */
export function addChainParams() {
  return {
    chainId: CHAIN.hex,
    chainName: CHAIN.name,
    rpcUrls: [CHAIN.publicRpc],
    blockExplorerUrls: [CHAIN.explorer],
    nativeCurrency: { name: CHAIN.nativeSymbol, symbol: CHAIN.nativeSymbol, decimals: CHAIN.decimals },
  };
}

/** RPC for server code: the private endpoint when set, else the public one. */
export function serverRpc() {
  return process.env.ELYSIUM_RPC_URL || process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL || PUBLIC_RPC;
}

export const TOKEN = {
  get isLive() {
    return isAddress(BRAND.ca);
  },
  get explorerUrl() {
    return isAddress(BRAND.ca) ? explorerToken(BRAND.ca) : null;
  },
};

export function explorerAddress(address: string) {
  return `${CHAIN.explorer}/address/${address}`;
}
export function explorerToken(address: string) {
  return `${CHAIN.explorer}/token/${address}`;
}
export function explorerTx(hash: string) {
  return `${CHAIN.explorer}/tx/${hash}`;
}
export function shortAddress(address: string, head = 6, tail = 4) {
  if (address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/**
 * The launchpad is not announced yet ("TBA"). Before the CA is real the buy button is disabled and says "At launch";
 * afterwards it opens the token on the explorer. The product works without the token.
 */
export const LAUNCHPAD = { name: "TBA" } as const;

/** Where a buy button goes: null until the CA is real. */
export function buyUrl(): string | null {
  return isAddress(BRAND.ca) ? explorerToken(BRAND.ca) : null;
}
