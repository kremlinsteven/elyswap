import Link from "next/link";
import { PageHead } from "@/components/site/PageHead";
import { CANONICAL, CHAINS } from "@/config/chains";
import { CONTRACT_NAMES } from "@/config/contracts";
import { NO_PROMISE, PLANNED, TRUST_LINE } from "@/lib/content";
import { CANONICAL_SNAPSHOT as C, QUOTE_SNAPSHOT as Q, RELAY_SNAPSHOT as R } from "@/lib/measured";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/method",
  title: "Method, sources and measured times | Elyswap",
  description: "How Elyswap confirmed every bridge contract on chain, how it measures delivery times, the routes table with fees and trust, and what it does not cover.",
});

const ROWS = [
  { route: "Canonical bridge", hops: "Elysium → HyperEVM", end: "native HYPE", fee: "gas only", time: `${(C.sentToClaimedHours.min / 24).toFixed(1)}–${(C.sentToClaimedHours.max / 24).toFixed(1)} d (n ${C.sentToClaimedHours.n})`, trust: "rollup only", exec: "built here" },
  { route: "Relay direct", hops: "Elysium → HyperEVM", end: "native HYPE", fee: `${Q.direct.at1}% at 1 HYPE`, time: `${R.byDestination.hyperevm.min}–${R.byDestination.hyperevm.max} s (n ${R.byDestination.hyperevm.n})`, trust: "Relay solver", exec: "sign here" },
  { route: "Via Solana", hops: "Elysium → Solana → HyperEVM", end: "native HYPE", fee: `≈${Q.viaSolanaHype}% at 1 HYPE`, time: `hop 1 ${R.byDestination.solana.min}–${R.byDestination.solana.max} s (n ${R.byDestination.solana.n}); hop 2 not measured`, trust: "Relay ×2, Wormhole while held", exec: "hop 1 here, hop 2 bridge's app" },
  { route: "Via Robinhood Chain", hops: "Elysium → Robinhood → HyperEVM", end: "native HYPE", fee: `≈${Q.viaRobinhoodEth}% at 1–100 HYPE`, time: `hop 1 ${R.byDestination.robinhood.min}–${R.byDestination.robinhood.max} s (n ${R.byDestination.robinhood.n}); hop 2 not measured`, trust: "Relay ×2, ETH price between hops", exec: "sign here (both)" },
] as const;

const SOURCES = [
  { name: "Elysium contract addresses (official docs)", url: "https://elysium.kinetiq.xyz/docs/contract-addresses" },
  { name: "Elysium token bridging (official docs)", url: "https://elysium.kinetiq.xyz/docs/token-bridging-on-elysium" },
  { name: "Relay API: chains and quotes", url: "https://api.relay.link/chains" },
  { name: "Relay contract addresses", url: "https://docs.relay.link/references/api/api_resources/contract-addresses" },
  { name: "Arbitrum: withdrawals and the outbox", url: "https://docs.arbitrum.io/how-arbitrum-works/l2-to-l1-messaging" },
  { name: "Arbitrum BoLD: how assertions are confirmed", url: "https://docs.arbitrum.io/how-arbitrum-works/bold/gentle-introduction" },
  { name: "LayerZero Scan (Bridged HYPE on Robinhood Chain)", url: "https://layerzeroscan.com" },
];

export default function MethodPage() {
  return (
    <>
      <PageHead eyebrow="Method" title="Every number, and where it came from.">
        {NO_PROMISE} {TRUST_LINE}
      </PageHead>
      <div className="es-wrap grid gap-16 pb-24">
        <section id="routes">
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            Routes table
          </h2>
          <p className="es-body mt-3">Fees are the HYPE lost end to end in quotes taken {Q.readOn} (all fees and swaps included); the planner replaces them with live quotes. Times are measured from real transfers.</p>
          <div className="es-panel mt-6 overflow-hidden">
            <table className="es-table stack">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Hops</th>
                  <th>Ends with</th>
                  <th>Fee</th>
                  <th>Measured time</th>
                  <th>Trust added</th>
                  <th>Executed</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.route}>
                    <td data-label="Route">{r.route}</td>
                    <td data-label="Hops">{r.hops}</td>
                    <td data-label="Ends with">{r.end}</td>
                    <td data-label="Fee">{r.fee}</td>
                    <td data-label="Measured time">{r.time}</td>
                    <td data-label="Trust added">{r.trust}</td>
                    <td data-label="Executed">{r.exec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="es-body mt-6 grid gap-2 pl-5">
            <li>Relay refused quotes above about {Q.relayMaxHype} HYPE in one transfer on {Q.readOn}. Its fee from Elysium was lower on 10 Nov (about 3.4% on a 110 HYPE fill) and higher on 11 Nov: it moves.</li>
            <li>
              Not shown as a route: Elysium → Robinhood &ldquo;Bridged HYPE&rdquo; (a LayerZero OFT, 0xd6ad…4856, backed 1:1 by an adapter on HyperEVM). Its pool was thin: about {Q.viaRobinhoodBridgedHype.at1}% lost at 1 HYPE, {Q.viaRobinhoodBridgedHype.at100}% at 100. LayerZero messages from
              Robinhood Chain to HyperEVM took 21–102 s (47 messages, 4–11 Nov).
            </li>
            <li>LI.FI also routes Elysium → HyperEVM, through Relay plus its own 0.25% fee. deBridge, Across, NEAR Intents, Gas.zip, Mayan and Stargate did not list Elysium on 12 Nov; Hyperlane has core contracts there but no HYPE route.</li>
          </ul>
        </section>

        <section>
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            Canonical bridge contracts
          </h2>
          <p className="es-body mt-3">
            Listed in Elysium&apos;s docs and checked on HyperEVM on 12 Nov 2026: each has code; Rollup.outbox(), bridge() and inbox() name the contracts below; Rollup.chainId() is 99901; Bridge.allowedOutboxList(0) is the Outbox. The rollup is BoLD: latestConfirmed() returns an
            assertion hash.
          </p>
          <dl className="es-kv mt-6 max-w-[760px]">
            {(
              [
                ["Rollup", CANONICAL.rollup],
                ["Bridge (holds the HYPE)", CANONICAL.bridge],
                ["Inbox", CANONICAL.inbox],
                ["Outbox (claims)", CANONICAL.outbox],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt>{k}</dt>
                <dd>
                  <a className="mono underline" href={CHAINS.hyperevm.addressUrl(v)} target="_blank" rel="noreferrer">
                    {v.slice(0, 10)}…{v.slice(-6)}
                  </a>
                </dd>
              </div>
            ))}
            <dt>ArbSys on Elysium</dt>
            <dd className="mono">{CANONICAL.arbSys.slice(0, 6)}…64 (withdrawEth, L2ToL1Tx)</dd>
            <dt>NodeInterface on Elysium</dt>
            <dd className="mono">{CANONICAL.nodeInterface.slice(0, 6)}…C8 (constructOutboxProof)</dd>
          </dl>
        </section>

        <section>
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            How the wait is measured
          </h2>
          <ul className="es-body mt-5 grid gap-3 pl-5">
            <li>
              {C.withdrawalsSent.toLocaleString("en-US")} L2ToL1Tx events on Elysium were read; {C.sentToClaimedHours.n.toLocaleString("en-US")} were matched position for position to OutBoxTransactionExecuted on HyperEVM. Sent → claimed: {C.sentToClaimedHours.min}–{C.sentToClaimedHours.max} h,
              median {C.sentToClaimedHours.median} h, p90 {C.sentToClaimedHours.p90} h (sent {C.sentToClaimedHours.from} to early November). This includes how long each person waited before claiming.
            </li>
            <li>
              {C.assertionConfirmHours.n} assertions went from creation to confirmation in {C.assertionConfirmHours.min}–{C.assertionConfirmHours.max} h, each carrying a confirm period of {C.confirmPeriodBlocksPast.toLocaleString("en-US")} HyperEVM blocks (HyperEVM averaged 0.98 s per block).
            </li>
            <li>
              The rollup&apos;s confirm period was changed to {C.confirmPeriodBlocksNow.toLocaleString("en-US")} blocks (≈23.6 h) on {C.periodChangedAt}, in HyperEVM transaction{" "}
              <a className="underline" href={CHAINS.hyperevm.txUrl(C.periodChangeTx)} target="_blank" rel="noreferrer">
                {C.periodChangeTx.slice(0, 10)}…
              </a>
              . Assertions keep the period they were created with and confirm in order, so withdrawals sent now still wait for the older 5.5-day assertions. No withdrawal under the new period had been claimed when this was written; Elyswap will not quote a new typical time
              until one has.
            </li>
            <li>
              Example: {C.exampleWithdrawal.value} sent in{" "}
              <a className="underline" href={CHAINS.elysium.txUrl(C.exampleWithdrawal.sent)} target="_blank" rel="noreferrer">
                {C.exampleWithdrawal.sent.slice(0, 10)}…
              </a>{" "}
              was claimed in{" "}
              <a className="underline" href={CHAINS.hyperevm.txUrl(C.exampleWithdrawal.claimed)} target="_blank" rel="noreferrer">
                {C.exampleWithdrawal.claimed.slice(0, 10)}…
              </a>{" "}
              {C.exampleWithdrawal.hours} h later.
            </li>
            <li>The withdrawal tracker&apos;s countdown is computed live: the assertion covering a withdrawal (sendCount above its position), its creation block plus its own confirm period, and the latest deadline of every older pending assertion, converted with HyperEVM block time.</li>
            <li>
              Relay times are the gap between the origin and destination transactions in Relay&apos;s own request log, for HYPE sent from Elysium ({R.from} to {R.to} in the snapshot; the planner reads the log live and says which it used).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            Claim, tested on real data
          </h2>
          <p className="es-body mt-3">
            The claim was built for a real unclaimed withdrawal (send #84) on 12 Nov: proof of 11 hashes from NodeInterface against the confirmed send count, its root found in Outbox.roots(), and the executeTransaction call simulated on HyperEVM (about 105,000 gas). No transaction
            was sent: the HYPE belongs to its owner.
          </p>
        </section>

        <section>
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            Not covered, and planned
          </h2>
          <ul className="es-body mt-5 grid gap-3 pl-5">
            <li>Elyswap does not run a bridge, a relayer or a pool, and never takes custody. It charges no fee.</li>
            <li>Hops signed by a Solana wallet open the bridge&apos;s own app. Relay&apos;s keyless request log, used to find a request by transaction hash, is retired by Relay on 24 Nov 2026; after that the site needs a Relay API key for that one lookup.</li>
            <li>
              {CONTRACT_NAMES.book} is a record, not proof: it cannot see other chains. Readers check each hash on its own chain. It holds no funds and needs an independent review like any contract before relying on it.
            </li>
            {PLANNED.map((p) => (
              <li key={p.name}>
                <b className="font-normal text-white">Planned: {p.name}.</b> {p.text}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="es-h2" style={{ fontSize: 32 }}>
            Sources
          </h2>
          <ul className="es-body mt-5 grid gap-2 pl-5">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              </li>
            ))}
            <li>
              On-chain reads by this site: <Link className="underline" href="/api/rollup">/api/rollup</Link>, <Link className="underline" href="/api/stats">/api/stats</Link>.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
