# Elyswap

HYPE moves from HyperEVM to Elysium in seconds, but going back through Elysium's canonical bridge waits out a challenge period of about five and a half days and then needs a claim transaction on HyperEVM that many people do not know about. Elyswap is a web app for people moving HYPE out of Elysium: it compares the canonical bridge with faster third-party routes (their live fees, measured delivery times and the trust each one adds), builds the transaction for the route you pick in your own wallet, tracks canonical withdrawals through the challenge period, and claims them on HyperEVM when they are ready.

Don't Wait Days for Your HYPE. Plan the Route. Track Every Hop.

## Read this before anything else

This repository is the working code behind https://elyswap.cash.

- **What runs today.** A route planner with four routes (canonical bridge, Relay direct, via Robinhood Chain, via Solana), a canonical withdrawal tracker with a challenge-period countdown and a claim on HyperEVM, a hop tracker, and a journey-book page for the contract below.
- **Live data.** Elysium and HyperEVM are read over JSON-RPC by the site's own server: L2ToL1Tx events on Elysium, the BoLD rollup and the Outbox on HyperEVM, receipts on Robinhood Chain. Quotes and the request log come from Relay's public API. Times shown are measured ranges from past transfers with their dates, never promises.
- **Custody.** Elyswap never holds funds and charges no fee. Every step is a transaction you sign in your wallet, sent to the bridge's own contract. Fast routes add trust in the bridge operator (named next to each route).
- **The contract** `ElyswapJourneyBook` (a public journal of multi-hop journeys) is written and tested but **not deployed yet**. It holds no funds. It needs an independent security review before anyone relies on it.
- **Planned, not built:** one-click multi-hop signing, more chains and bridges, and $ELYSWAP fee discounts only if a fee ever exists. Nothing here promises any value for $ELYSWAP, and no part of the tool needs it.

## Layout

| Path | What it is |
|---|---|
| `src/app/` | Pages and API routes (Next.js App Router). |
| `src/components/` | Interface components (wallet dialog, planner, trackers, journey book). |
| `src/config/` | `brand.ts` (name, ticker, token address, links), `chains.ts` (chains and canonical bridge addresses), `contracts.ts` (deployed contract address). |
| `src/lib/` | Route definitions, withdrawal stage rules, measured data, chain and bridge readers (`server/`), and the logic the tests cover. |
| `contracts/` | Solidity source (`src/`) and Foundry tests (`test/`). |
| `scripts/` | `verify-deployment` and the contract artifact builder. |
| `public/` | Static images and wallet logos. |

## Run the tests

Node.js 20 or newer.

```
npm install
npm run typecheck
npm test
```

Contracts use [Foundry](https://book.getfoundry.sh/):

```
cd contracts
bash setup.sh
forge test
```

### What was checked for this snapshot

{{FILL: snapshot record}}

## Look at the site

```
npm install
npm run build
npm start
```

Open http://localhost:6330. Everything works with no configuration: quotes, both trackers and the claim read public endpoints. Without the optional variables the WalletConnect option shows "Not configured", rate limits are kept per server instance, and after 24 Nov 2026 the measured Relay times fall back to a dated snapshot.

## Contracts

| Contract | Address | Explorer |
|---|---|---|
| ElyswapJourneyBook | not deployed yet | — |

ElyswapJourneyBook records a journey's planned hops (from chain, to chain, bridge) and, as they happen, each hop's source and delivery transaction hashes, with a state machine (Planned → Underway → Arrived or Abandoned; hops Planned → Sent → Delivered or Failed, retried at most five times). A transaction hash on a chain can prove one hop of one journey only. Each journey has an owner (two-step transfer) and an optional editor. The contract has no admin, no fee, no upgrade path, no payable function, and holds no funds. It cannot see other chains: recorded hashes are claims that readers check on each chain's explorer.

## Verify a deployment

```
npm run verify-deployment -- --book <address> --book-tx <creation transaction hash>
```

The script compares the bytecode on Elysium with the build in this repository and prints MATCH or the first difference. Set `VERIFY_RPC_URL` to use another Elysium endpoint.

## Add the network to your wallet

| Field | Elysium | HyperEVM |
|---|---|---|
| Chain ID | 99901 | 999 |
| Currency | HYPE | HYPE |
| RPC | https://rpc.elysium.kinetiq.xyz | https://rpc.hyperliquid.xyz/evm |
| Explorer | https://elysium.kinetiq.xyz | https://hyperevmscan.io |

The site adds Elysium when you connect, HyperEVM when you claim, and Robinhood Chain only for its second hop.

## Data sources and limits

- **Elysium RPC**: L2ToL1Tx events (withdrawals), receipts, the NodeInterface proof. Logs per query are capped by the node at 10,000.
- **HyperEVM RPC**: the BoLD rollup (latest confirmed assertion, pending ones and their confirm periods), Outbox spent flags and roots, claim simulation. The public endpoint answers log queries for at most 1,000 blocks and rate-limits bursts, so assertions are read through `getAssertion()` and one-block log reads; the state is cached 60 seconds.
- **Relay API** (`api.relay.link`): quotes (cached 20 seconds per route and amount), request status by id, and the request log used for measured times (cached 30 minutes) and for finding a request by transaction hash. The keyless log is rate-limited and retired by Relay on 24 Nov 2026; with `RELAY_API_KEY` the site uses its successor.
- **Robinhood Chain RPC**: receipts for hops sent there.
- When a source does not answer, the page says so and shows "—"; it never fills a gap with a guess. Measured snapshot figures carry their dates in `src/lib/measured.ts`.

## Token

$ELYSWAP is a memecoin on Elysium (gas in HYPE). Contract address: announced on https://elyswap.cash/token at launch; the launchpad is to be announced. It has no promised value. Fee discounts are planned only if Elyswap ever charges a fee; today it charges none and nothing needs the token.

## Deploy your own

1. Import the repository into a Next.js host (preset Next.js, root `./`). No variable is required.
2. Optional environment variables (names and formats only):

| Variable | What it is for | Format |
|---|---|---|
| `ELYSIUM_RPC_URL` | Private Elysium RPC for server reads | `https://…` |
| `NEXT_PUBLIC_ELYSIUM_RPC_URL` | Elysium RPC for browser reads | `https://…` |
| `HYPEREVM_RPC_URL` | Private HyperEVM RPC for the rollup and claims | `https://…` |
| `ROBINHOOD_RPC_URL` | Private Robinhood Chain RPC for the hop tracker | `https://…` |
| `RELAY_API_KEY` | Relay request log (measured times, lookup by hash) | key from Relay |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect in the wallet dialog | 32 hex characters |
| `KV_REDIS_URL` | Shared rate-limit store | `redis://…` or `rediss://…` |

3. After the deploy: `/` answers 200, `/api/chain` and `/api/rollup` answer JSON, `/deploy` answers 404 on the public host.
4. Contract: deploy `ElyswapJourneyBook` on Elysium (no constructor arguments), put its address in `src/config/contracts.ts`, run `npm run verify-deployment`, and verify the source on the Elysium explorer.

## Contributing

Fork the repository, branch from `main`, and run `npm run typecheck`, `npm test` and `npm run build`, and `bash setup.sh && forge test` in `contracts/` before opening a pull request. For a bug, open an issue with the expected and actual behavior and minimal steps. Keep private keys, seed phrases and environment values out of issues.

## Security

Please do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. The contract, the API routes, the claim builder and the transaction building for bridge hops are in scope; wallets, RPC providers, explorers, bridges and launchpads are not. There is no bug bounty.

## Notices and license

This project's original code is released under the [MIT License](LICENSE). The self-hosted fonts Inter, Geist and Geist Mono are under the SIL Open Font License (texts in `src/fonts/`). Wallet logos belong to their projects and are used only to identify each wallet. The Elyswap name, logo and artwork belong to the project and are not licensed for reuse as a brand.
