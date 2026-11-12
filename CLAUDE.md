# Elyswap — project notes (internal only, never synced to public)

Bridge route planner + canonical withdrawal tracker for HYPE leaving **Elysium** (chain 99901, gas HYPE) for HyperEVM (999).
Owner order: `2026/november/12/perintah121126.txt` (block "elyswap", Product Knowledge binding); lead brief `2026/november/12/common-1211.txt`
section E. Port **6330** (`npm start`), anvil 6335 (Elysium fork) + 6336 (HyperEVM fork, E2E only). QA server 6331. Never `next dev`.

Slogan / tagline (lead, paraphrased; owner asked AI to write it): "Don't Wait Days for Your HYPE." / "Plan the Route. Track Every Hop."
Ticker `$ELYSWAP` from `src/config/brand.ts` (one constant). CA = `TBA`. X = https://x.com/elyswap (owner's handle; looks generic).
GitHub public: none yet (link hidden). Domain elyswap.cash: on Cloudflare, no A record on 12 Nov → `DOMAIN_LIVE = false`.

## Product (owner PK binding)
Problem first: Elysium → HyperEVM through the canonical bridge waits ~5.5 days + a claim; HyperEVM → Elysium is seconds. The owner's team
moved HYPE via Robinhood Chain or Solana instead. Elyswap compares the routes and helps finish the canonical one. Never promises a time.

REAL routes:
- `/routes` planner: 4 routes (src/lib/routes.ts): canonical (ArbSys.withdrawEth built here), Relay direct, via Robinhood Chain (HYPE→ETH→HYPE,
  Relay ×2), via Solana (HYPE→Wormhole HYPE→HYPE, Relay ×2; hop 2 is a Solana-wallet hop → link to Relay's app). Live preview quotes from Relay
  `/quote` (`/api/quote` GET, 20 s cache), executable hop tx only for the connected address (`/api/quote` POST, tx must be on the hop's origin chain).
  Measured times: canonical snapshot (src/lib/measured.ts) + Relay request log live (`/api/stats`, 30 min cache) with dated snapshot fallback.
- `/withdrawals` tracker + claim: L2ToL1Tx logs on Elysium by destination (topic1) or by tx; stage (claimed/ready/challenge/waiting) from the
  BoLD rollup on HyperEVM (src/lib/server/orbit.ts + pure rules src/lib/withdrawal.ts); claim = NodeInterface.constructOutboxProof on Elysium,
  root checked in Outbox.roots(), eth_estimateGas simulated, then Outbox.executeTransaction sent from the wallet on HyperEVM (chain switched/added).
  Tested on real data: send #84 (referensi/qa/claim-sim.txt) and EXECUTED on a HyperEVM anvil fork in E2E (isSpent true, balance +value).
- `/track` hop tracker (localStorage list): receipt per EVM chain + Relay request by hash (v2 log, rate-limited, retires 24 Nov; RELAY_API_KEY → v3)
  or by request id (only accepted when the request's inTxHashes include the tracked tx — security fix 25c9deb).
- `/journeys` ElyswapJourneyBook UI (open, record sent/delivered; Solana signatures stored as keccak256 of the text), against the live book.
- `/method`, `/token`. `/deploy` removed 12 Nov after the book went live + verified. API: /api/chain, /api/rollup, /api/quote, /api/withdrawals,
  /api/claim, /api/track, /api/stats, /api/rpc (Elysium relay for browser reads).
PLANNED: one-click multi-hop, more chains/bridges, $ELYSWAP fee discounts (only if a fee ever exists).

## Chain facts (12 Nov 2026; sources referensi/routes/ROUTES.txt + evidence/)
- Canonical (HyperEVM): Rollup 0x508C…D217 (BoLD), Bridge 0x503D…16B6, Inbox 0xce59…2cff, Outbox 0xeC6B…2728. Elysium ArbSys 0x…64, NodeInterface 0x…C8.
- confirmPeriodBlocks changed 483,840 → 86,400 on 2026-11-11 16:03 UTC (HyperEVM tx 0xcbc80a1d…4b25). Assertions keep their own period and
  confirm in order → withdrawals sent now still wait for the old 5.5-day assertions (~16 Nov). The tracker computes the max deadline on the path.
- HyperEVM: 0.9836 s/block; public RPC eth_getLogs max 1,000 blocks + rate limits → assertions are never scanned: getAssertion() gives
  createdAtBlock / firstChildBlock and a one-block log read returns AssertionCreated.
- Relay: Elysium deposits go to Relay v3.2 Router 0x0729…97f7; ~6.3% lost at 1–100 HYPE on 11 Nov (dynamic; 3.4% on 10 Nov); max ≈888 HYPE per quote;
  Relay blocks the well-known anvil account (E2E uses another address for the Relay step). Robinhood "Bridged HYPE" 0xd6ad…4856 = LayerZero OFT (thin pool).
  Solana real HYPE = Wormhole mint 98sM…Mh5g. deBridge/Across/NEAR/Gas.zip/Mayan/Stargate: no Elysium. LI.FI: via Relay + 0.25%.

## Contract
`contracts/src/ElyswapJourneyBook.sol` (unique name, grep'd). Journal only: no payable, no funds, no admin, no upgrade. Journey state machine
Planned→Underway→Arrived|Abandoned, hops Planned→Sent→Delivered|Failed (retry ≤5), in-order hops, owner + editor, two-step ownership (clears editor),
(chainId, txHash) claimable by one hop only. Deploy gas 1,825,350 (forge gas report; 1,825,866 measured on the Elysium fork).
Self-review: `referensi/REVIEW.txt`. Explorer kit: `referensi/explorer/`.
LIVE (12 Nov 2026, owner deployed from /deploy): `0xac622259b8420080ec2085ee08660fc7059766a3`, tx `0x7f6f42a0ff1593684a339d5b66e0e34d65fe1ef0077c23e0d79333a7a8c7d033`, block 5,123,301, deployer 0x68320a836341535a0010cb8d02a904e60b7e3510.
`npm run verify-deployment` → MATCH. Source verified on https://elysium.kinetiq.xyz/address/0xac622259b8420080ec2085ee08660fc7059766a3 via the explorer API (verifysourcecode with the
standard JSON → "Pass - Verified"; forge verify-contract refuses chain 99901: "No known Etherscan API URL"). /deploy + DeployPanel removed.

## Env
None required. Optional:
- `ELYSIUM_RPC_URL` (server) / `NEXT_PUBLIC_ELYSIUM_RPC_URL` (browser): private Elysium RPC.
- `HYPEREVM_RPC_URL` (server): private HyperEVM RPC (public one rate-limits; the rollup read is ~40 calls, cached 60 s).
- `ROBINHOOD_RPC_URL` (server): private Robinhood Chain RPC for the hop tracker.
- `RELAY_API_KEY` (server): Relay API key → /requests/v3 (needed after 24 Nov 2026 for the measured-time log and tx-hash lookups).
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: cloud.reown.com project id; without it WalletConnect shows "Not configured".
- `KV_REDIS_URL` (or `REDIS_URL` / Upstash pair): rate-limit store via kv-gateway (`sudo kv-gateway add elyswap`). Without it limits are per instance.
Never set `NEXT_PUBLIC_ELYSWAP_TEST_CONTRACTS` on Vercel (E2E only).

## Design
UI reference (internal only): https://sinas.co/ — pure black, Ratio Medium display (proprietary → Geist variable, OFL), Inter body (same as reference,
OFL), Fragment Mono → Geist Mono. Peach accent #ffe1cb / gradient #ffc193→#ffe1cb buttons r5, pill eyebrow rgba(255,225,203,.12), icon tiles
49px rgba(255,225,203,.1), cards 1px rgba(255,255,255,.12) r12, container 1056px, H1 72/-0.05em, H2 48. Section order mirrored: hero → product
preview with glow → logo marquee (→ "Reads from" chain names) → OWNERSHIP 2x2 (→ THE PROBLEM, measured) → PLATFORM 3x2 cards (→ THE SOLUTION)
→ WHO IT'S FOR 2 tint cards → USE CASES (→ THE PRODUCT, three screens explained like the feature reference) → testimonials (→ BEFORE YOU TRUST IT
facts, no quotes/people) → DEPLOYMENT two cards (→ TWO WAYS OUT: canonical vs fast) → CTA "Try it with a small amount first." → footer columns.
Feature reference (internal only): https://www.portage.wtf/ — IA only (product panels explained, "what to know before you trust it", fees).
Brands to keep out: "portage,sinas" (+ WeAreBrain, the reference's agency, also kept out).

## Assets
Owner's real files installed 12 Nov 2026 by `referensi/tools/apply-owner-assets.mjs` (reads 2026/november/12/assets/ELYSWAP_PNG.png,
_JPG.jpg, _BANNER.jpg, never changes them): white disc with a cut-out "e" on #000. Outputs: public/brand/mark.webp (trimmed, header/footer/
preview), mark-tile.webp, og.jpg (1200x630, JPEG for share-preview support: banner content box scaled to 76% width, centred on the banner's own #000), src/app/icon.png,
apple-icon.png, favicon.ico (RGBA 16/32/48, mark on a black tile so the white disc keeps its edge on light tabs). `make-assets.mjs` (old
generated placeholder) is retired and exits unless `--force-placeholder`. Theme unchanged: the site is pure black, the mark is white.

## Run / test
`npm test` (tsx node:test), `npx tsc --noEmit`, `npx eslint src scripts`, `(cd contracts && forge test)`. `referensi/restart.sh` = build (lock) +
next start 6330. Full E2E: `referensi/qa/e2e.sh` (forks + e2e build on 6331). Screens: `_qa-tmp/pw-elyswap/shots.mjs`.

## Open questions (lead-style decisions taken, owner to confirm)
1. Slogan/tagline written by AI (owner said "Dari Ai"): "Don't Wait Days for Your HYPE." / "Plan the Route. Track Every Hop."
2. Relay direct is cheaper than the owner's team's via-Robinhood / via-Solana path on 11 Nov (6.3% vs ~7.2% / ~6.7%). All four are shown with live
   quotes; nothing is ranked "best". Confirm this framing.
3. The via-Solana second hop needs a Solana wallet: we link to Relay's app instead of adding a Solana wallet adapter. Add Phantom-for-Solana later?
4. Launchpad "TBA" in site/statements (Montra likely, not named). X handle x.com/elyswap looks generic.
5. Relay's keyless request log retires 24 Nov 2026: please create a Relay API key (RELAY_API_KEY) for measured times + tx-hash lookups.
6. Journey book deploy: mainnet only (no Elysium testnet configured); it holds no funds but has had no outside security review.
7. Owner's block says 10 statements; 20 written per the root rule.
