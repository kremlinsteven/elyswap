/*
 * The chains a HYPE journey out of Elysium touches, and the canonical bridge contracts. Every address below was read on
 * chain on 12 Nov 2026 (code present, and the calls named next to it answer); how each was found is on /method and in
 * referensi/routes/ROUTES.txt.
 */

export type ChainKey = "elysium" | "hyperevm" | "robinhood" | "solana";

export type ChainInfo = {
  key: ChainKey;
  name: string;
  /** EVM chain id, or Relay's id for Solana. */
  id: number;
  evm: boolean;
  native: string;
  decimals: number;
  rpc: string[];
  explorer: string;
  txUrl: (hash: string) => string;
  addressUrl: (address: string) => string;
};

export const CHAINS: Record<ChainKey, ChainInfo> = {
  elysium: {
    key: "elysium",
    name: "Elysium",
    id: 99901,
    evm: true,
    native: "HYPE",
    decimals: 18,
    rpc: ["https://rpc.elysium.kinetiq.xyz"],
    explorer: "https://elysium.kinetiq.xyz",
    txUrl: (h) => `https://elysium.kinetiq.xyz/tx/${h}`,
    addressUrl: (a) => `https://elysium.kinetiq.xyz/address/${a}`,
  },
  hyperevm: {
    key: "hyperevm",
    name: "HyperEVM",
    id: 999,
    evm: true,
    native: "HYPE",
    decimals: 18,
    // The official endpoint answers eth_getLogs for at most 1,000 blocks and rate-limits bursts; the others are public mirrors.
    rpc: ["https://rpc.hyperliquid.xyz/evm", "https://rpc.hypurrscan.io", "https://hyperliquid.drpc.org"],
    explorer: "https://hyperevmscan.io",
    txUrl: (h) => `https://hyperevmscan.io/tx/${h}`,
    addressUrl: (a) => `https://hyperevmscan.io/address/${a}`,
  },
  robinhood: {
    key: "robinhood",
    name: "Robinhood Chain",
    id: 4663,
    evm: true,
    native: "ETH",
    decimals: 18,
    rpc: ["https://rpc.mainnet.chain.robinhood.com", "https://robinhood-rpc.publicnode.com"],
    explorer: "https://robinhoodchain.blockscout.com",
    txUrl: (h) => `https://robinhoodchain.blockscout.com/tx/${h}`,
    addressUrl: (a) => `https://robinhoodchain.blockscout.com/address/${a}`,
  },
  solana: {
    key: "solana",
    name: "Solana",
    id: 792703809,
    evm: false,
    native: "SOL",
    decimals: 9,
    rpc: [],
    explorer: "https://solscan.io",
    txUrl: (h) => `https://solscan.io/tx/${h}`,
    addressUrl: (a) => `https://solscan.io/account/${a}`,
  },
};

export const chainById = (id: number) => Object.values(CHAINS).find((c) => c.id === id) ?? null;

/** wallet_addEthereumChain parameters for an EVM chain a hop needs. */
export function addParams(key: ChainKey) {
  const c = CHAINS[key];
  return {
    chainId: `0x${c.id.toString(16)}`,
    chainName: c.name,
    rpcUrls: [c.rpc[0]],
    blockExplorerUrls: [c.explorer],
    nativeCurrency: { name: c.native, symbol: c.native, decimals: c.decimals },
  };
}

/**
 * Elysium's canonical bridge (Arbitrum Orbit with BoLD, settling to HyperEVM). Contracts live on HyperEVM, except the two
 * precompiles on Elysium. Read 12 Nov 2026: Rollup.outbox() and Bridge.allowedOutboxList(0) both name the Outbox below,
 * Rollup.bridge() names the Bridge, Rollup.latestConfirmed() answers an assertion hash (BoLD).
 */
export const CANONICAL = {
  rollup: "0x508C173dFe5F737B3493195Bf785d71fA76fD217",
  bridge: "0x503D572157113fAaaD4DbeD2647Bb10b949216B6",
  inbox: "0xce59f8B65ad41C9DAE4c07A0571a39824bD92cff",
  outbox: "0xeC6B106DfA14428FE5Eec2a4065a7be599f02728",
  /** ArbSys precompile on Elysium: withdrawEth() and the L2ToL1Tx event. */
  arbSys: "0x0000000000000000000000000000000000000064",
  /** NodeInterface on Elysium: constructOutboxProof(). Answers eth_call only. */
  nodeInterface: "0x00000000000000000000000000000000000000C8",
  /** The official bridge page (deposits and withdrawals). */
  app: "https://elysium.kinetiq.xyz/bridge",
} as const;

export const TOPICS = {
  l2ToL1Tx: "0x3e7aafa77dbf186b7fd488006beff893744caa3c4f6f299e8a709fa2087374fc",
  assertionCreated: "0x901c3aee23cf4478825462caaab375c606ab83516060388344f0650340753630",
  outboxExecuted: "0x20af7f3bbfe38132b8900ae295cd9c8d1914be7052d061a511f3f728dab18964",
} as const;

/** Seconds per HyperEVM block, measured over 100,000 blocks on 12 Nov 2026 (0.9836 s). Used only for a countdown estimate. */
export const HYPER_BLOCK_SECONDS = 0.9836;
