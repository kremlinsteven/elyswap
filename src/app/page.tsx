import Link from "next/link";
import { AppPreview } from "@/components/home/AppPreview";
import { LiveRollup } from "@/components/home/LiveRollup";
import { CaRow } from "@/components/site/CaCopy";
import {
  AlertIcon,
  ArrowRight,
  BookIcon,
  CheckIcon,
  ClaimIcon,
  ClockIcon,
  CoinsIcon,
  HandIcon,
  HourglassIcon,
  PinIcon,
  PulseIcon,
  RouteIcon,
  ShieldIcon,
  StackIcon,
} from "@/components/site/Icons";
import { JsonLd } from "@/components/JsonLd";
import { BRAND } from "@/config/brand";
import { CANONICAL, CHAINS } from "@/config/chains";
import { CANONICAL_SNAPSHOT as C, QUOTE_SNAPSHOT as Q, RELAY_SNAPSHOT as R } from "@/lib/measured";
import { appLd } from "@/lib/seo";

const PROBLEM = [
  {
    icon: <HourglassIcon size={20} />,
    title: "A challenge period on every withdrawal",
    text: `The canonical bridge lets anyone dispute Elysium's state before HYPE leaves it. Every assertion confirmed so far waited ${C.confirmPeriodBlocksPast.toLocaleString("en-US")} HyperEVM blocks: ${C.assertionConfirmHours.min}–${C.assertionConfirmHours.max} hours, about 5.5 days.`,
  },
  {
    icon: <ClockIcon size={20} />,
    title: `${(C.sentToClaimedHours.median / 24).toFixed(1)} days, in practice`,
    text: `We matched ${C.sentToClaimedHours.n.toLocaleString("en-US")} withdrawals sent ${C.sentToClaimedHours.from} to early November with their claims on HyperEVM: ${(C.sentToClaimedHours.min / 24).toFixed(1)} to ${(C.sentToClaimedHours.max / 24).toFixed(1)} days, median ${(C.sentToClaimedHours.median / 24).toFixed(1)}.`,
  },
  {
    icon: <ClaimIcon size={20} />,
    title: "Nothing arrives until you claim",
    text: "When the wait ends, the HYPE is not pushed to you. Someone has to send a second transaction on HyperEVM with a Merkle proof. Many people do not know that step exists.",
  },
  {
    icon: <StackIcon size={20} />,
    title: `${(C.withdrawalsSent - C.withdrawalsClaimed).toLocaleString("en-US")} still waiting`,
    text: `Of ${C.withdrawalsSent.toLocaleString("en-US")} canonical withdrawals sent from Elysium by 11 Nov, ${C.withdrawalsClaimed.toLocaleString("en-US")} had been claimed. The rest are inside the challenge period or ready and unclaimed.`,
  },
];

const FEATURES = [
  { icon: <RouteIcon size={20} />, title: "Route planner", text: "Enter an amount and compare every way out: the canonical bridge, Relay direct, via Robinhood Chain and via Solana. Live quotes, all fees in, measured times with dates.", href: "/routes" },
  { icon: <HourglassIcon size={20} />, title: "Withdrawal tracker", text: "Paste a wallet or an Elysium transaction. Each canonical withdrawal shows its stage and a countdown read from the rollup on HyperEVM.", href: "/withdrawals" },
  { icon: <ClaimIcon size={20} />, title: "Claim on HyperEVM", text: "When a withdrawal is ready, Elyswap builds the Merkle proof, simulates the claim on HyperEVM and opens it in your wallet. Tested against real outbox data.", href: "/withdrawals" },
  { icon: <PinIcon size={20} />, title: "Hop tracker", text: "Follow a transfer across chains from its source transaction: receipt, the bridge's own status and the delivery transaction, each with an explorer link.", href: "/track" },
  { icon: <BookIcon size={20} />, title: "Journey book", text: "Record a multi-hop journey on Elysium (route, hop hashes, status) so it can be shared and checked. The contract holds no funds.", href: "/journeys" },
  { icon: <PulseIcon size={20} />, title: "Live chain data", text: "Elysium and HyperEVM blocks, the latest confirmed assertion and the confirm period, read from chain by the site's own server, not from a dashboard.", href: "/method" },
];

const TRUST = [
  { icon: <HandIcon size={18} />, title: "Elyswap never holds your HYPE", text: "Every step is a transaction you sign, sent straight to the bridge's own contract. There is no Elyswap deposit address and no fee." },
  { icon: <ShieldIcon size={18} />, title: "Fast routes add trust", text: "Relay's solver pays you on the other chain from its own funds and is trusted to fill or refund. The canonical bridge trusts only the rollup." },
  { icon: <CoinsIcon size={18} />, title: "Speed has a price", text: `On ${Q.readOn} the direct fast route kept about ${(100 - Q.direct.at1).toFixed(1)}% of the HYPE sent. Two-hop routes kept a little less. Fees move by the minute: the planner quotes live.` },
  { icon: <ClockIcon size={18} />, title: "Times are measured, not promised", text: `Relay fills from Elysium to HyperEVM took ${R.byDestination.hyperevm.min}–${R.byDestination.hyperevm.max} seconds in ${R.byDestination.hyperevm.n} real transfers (${R.from} to ${R.to}). A bridge can slow down, pause or refund.` },
  { icon: <AlertIcon size={18} />, title: "Size limits exist", text: `Relay refused quotes above about ${Q.relayMaxHype} HYPE in one go on ${Q.readOn}. Larger amounts need several transfers or the canonical bridge.` },
  { icon: <BookIcon size={18} />, title: "Open method", text: "Every contract address, how it was confirmed on chain, and every measurement with its sample size and dates is on the method page." },
];

export default function Home() {
  return (
    <>
      <JsonLd data={appLd} />

      {/* Hero */}
      <section className="es-hero">
        <div className="es-wrap">
          <span className="es-pill">HYPE out of Elysium</span>
          <h1 className="es-h1 mt-7 max-w-[640px]">{BRAND.slogan}</h1>
          <p className="es-lead mt-6">
            HYPE reaches Elysium from HyperEVM in seconds. Going back through the canonical bridge waits out a challenge period of about five and a half days, then needs a claim. {BRAND.name} compares the faster routes, with their fees and the trust they add, and
            helps you finish the slow one.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/routes" className="es-btn" data-testid="hero-routes">
              Compare routes
            </Link>
            <Link href="/withdrawals" className="es-btn ghost" data-testid="hero-track">
              <HourglassIcon size={15} /> Track a withdrawal
            </Link>
          </div>
          <p className="es-small mt-6 max-w-[610px]">{BRAND.tagline} Measured ranges, never promised times. Fast routes cost a fee and add a bridge operator you must trust.</p>
        </div>
        <div className="es-wrap mt-20 md:mt-24">
          <div className="es-glow">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* Reads from */}
      <section className="pb-6 pt-2" aria-label="What Elyswap reads">
        <p className="es-eyebrow text-center">Reads from</p>
        <div className="es-marquee mt-4">
          <div className="es-marquee-track">
            {[0, 1].map((k) => (
              <div key={k} className="flex gap-16 pr-16" aria-hidden={k === 1}>
                {["Elysium", "HyperEVM", "Robinhood Chain", "Solana", "Relay", "Orbit Outbox", "BoLD Rollup", "Elysium", "HyperEVM", "Relay"].map((m, i) => (
                  <span key={`${k}-${i}`} className="es-mark">
                    <span className="es-dot" style={{ background: "var(--peach-2)" }} />
                    {m}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="es-section" id="problem">
        <div className="es-wrap">
          <p className="es-eyebrow rv">The problem</p>
          <h2 className="es-h2 rv max-w-[640px]">Going back to HyperEVM takes days.</h2>
          <p className="es-lead rv mt-5">
            In and out are not the same trip. Deposits from HyperEVM land in seconds; withdrawals through the canonical bridge sit in a queue that nobody can speed up. These are the numbers read from chain, not from a blog.
          </p>
          <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
            {PROBLEM.map((p) => (
              <div key={p.title} className="rv max-w-[400px]">
                <span className="es-icon">{p.icon}</span>
                <h3 className="es-h3 mt-8">{p.title}</h3>
                <p className="es-body mt-3">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="rv mt-16">
            <LiveRollup />
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="es-section pt-0" id="solution">
        <div className="es-wrap">
          <p className="es-eyebrow rv">The solution</p>
          <h2 className="es-h2 rv max-w-[640px]">Pick the way out with the numbers open.</h2>
          <p className="es-lead rv mt-5">
            {BRAND.name} does not run a bridge. It puts every working route side by side, builds the transaction for the bridge you choose, and keeps track of each hop until the HYPE lands on HyperEVM.
          </p>
          <div className="rv mt-8">
            <Link href="/method" className="es-btn ghost">
              See how every number is read
            </Link>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className="es-card rv group block transition-colors hover:border-[rgb(255_255_255/0.28)]">
                <span className="es-icon">{f.icon}</span>
                <h3 className="es-h3 mt-12">{f.title}</h3>
                <p className="es-body mt-3">{f.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="es-section pt-0">
        <div className="es-wrap">
          <p className="es-eyebrow rv">Who it&apos;s for</p>
          <h2 className="es-h2 rv max-w-[640px]">Two kinds of trip, one tool.</h2>
          <p className="es-lead rv mt-5">What differs is whether your HYPE is already in the queue.</p>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <div className="es-card tint rv">
              <h3 className="es-h3">You already started a canonical withdrawal</h3>
              <p className="es-body mt-3">Paste your wallet. See which of your withdrawals are waiting, how long the rollup still makes them wait, and claim the ready ones on HyperEVM in one signature.</p>
              <Link href="/withdrawals" className="text-peach mt-8 inline-flex items-center gap-2 text-[14px]">
                Open the withdrawal tracker <ArrowRight size={14} />
              </Link>
            </div>
            <div className="es-card tint rv">
              <h3 className="es-h3">You are about to move HYPE out</h3>
              <p className="es-body mt-3">Enter the amount. Compare the slow free route with the fast paid ones, see which token you end with and whom you trust on the way, and send the first hop from your wallet.</p>
              <Link href="/routes" className="text-peach mt-8 inline-flex items-center gap-2 text-[14px]">
                Open the route planner <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Product, explained */}
      <section className="es-section pt-0" id="product">
        <div className="es-wrap">
          <p className="es-eyebrow rv">The product</p>
          <h2 className="es-h2 rv max-w-[680px]">Three screens, start to finish.</h2>
          <p className="es-lead rv mt-5">Plan, send, follow. Each screen reads the chains directly and says where every number comes from.</p>

          <div className="mt-16 grid gap-20">
            <ProductRow
              n="01"
              title="Compare the routes"
              text="One amount, every route. For each: the HYPE you end with, every fee in, the measured time with its sample and dates, the token form after each hop, and the operator you trust."
              points={["Quotes come from the bridge's own API, refreshed every 30 seconds while the page is open", "The canonical row needs no quote: same HYPE, gas only, days later", "A hop signed by a Solana wallet opens the bridge's own app, and says so"]}
              href="/routes"
              cta="Open the planner"
            >
              <MiniPlanner />
            </ProductRow>
            <ProductRow
              n="02"
              flip
              title="Finish a canonical withdrawal"
              text="Your withdrawals, read from Elysium's L2ToL1Tx events, with the stage each one is in: waiting for an assertion, in the challenge period, ready, or claimed."
              points={["The countdown uses the confirm period stored in the assertion itself, and waits for older assertions first", "Claim builds the proof from Elysium's NodeInterface and checks it against the Outbox before you sign", "Anyone may send a claim; the HYPE always goes to the address in the withdrawal"]}
              href="/withdrawals"
              cta="Open the tracker"
            >
              <MiniTracker />
            </ProductRow>
            <ProductRow
              n="03"
              title="Follow every hop"
              text="Paste the source transaction of any hop. Elyswap reads its receipt, asks the bridge which request it started, and links the delivery on the other chain."
              points={["Works for hops sent anywhere, not only from this site", "A journey can be written to the journey book on Elysium and shared by its number", "The book keeps a transaction from being shown as the proof of two journeys"]}
              href="/track"
              cta="Open the hop tracker"
            >
              <MiniHops />
            </ProductRow>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="es-section pt-0">
        <div className="es-wrap">
          <p className="es-eyebrow rv text-center">Before you trust it</p>
          <h2 className="es-h2 rv mx-auto max-w-[720px] text-center">What a faster exit really costs, and what it does not.</h2>
          <p className="es-lead rv mx-auto mt-5 text-center">Read this before the first transfer.</p>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="es-card flat rv">
                <div className="flex items-center gap-3">
                  <span className="text-peach">{t.icon}</span>
                  <h3 className="m-0 text-[15px] font-normal">{t.title}</h3>
                </div>
                <p className="es-body mt-4">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two ways out */}
      <section className="es-section pt-0">
        <div className="es-wrap">
          <p className="es-eyebrow rv">Two ways out</p>
          <h2 className="es-h2 rv max-w-[680px]">Wait for free, or pay to skip the queue.</h2>
          <p className="es-lead rv mt-5">Both end in native HYPE on HyperEVM. The difference is time, fee and whom you trust.</p>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <WayCard
              label="Canonical"
              title="The rollup's own bridge"
              text="One withdrawal on Elysium, a claim on HyperEVM when the challenge period is over."
              points={["No bridge fee: gas on Elysium and on HyperEVM", `Measured ${(C.sentToClaimedHours.min / 24).toFixed(1)}–${(C.sentToClaimedHours.max / 24).toFixed(1)} days to claim (n = ${C.sentToClaimedHours.n.toLocaleString("en-US")})`, `The confirm period was cut to ${C.confirmPeriodBlocksNow.toLocaleString("en-US")} blocks (~1 day) on 11 Nov; assertions created before that still finish their 5.5 days first`, "No size limit beyond your balance"]}
              href="/routes?route=canonical"
              cta="Plan a canonical withdrawal"
            />
            <WayCard
              label="Fast"
              highlight
              title="A solver bridge"
              text="One or two hops through Relay. A solver pays you on the other side from its own funds."
              points={[`Measured ${R.byDestination.hyperevm.min}–${R.byDestination.hyperevm.max} s from Elysium to HyperEVM (n = ${R.byDestination.hyperevm.n})`, `Fee about ${Q.direct.at1}% end to end on ${Q.readOn}; it changes`, `Quotes refused above about ${Q.relayMaxHype} HYPE at once`, "Adds trust in the solver to fill or refund"]}
              href="/routes?route=relay-direct"
              cta="Plan a fast route"
            />
          </div>
        </div>
      </section>

      {/* Token */}
      <section className="es-section pt-0">
        <div className="es-wrap">
          <div className="es-card flat rv grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="es-eyebrow">{BRAND.symbol}</p>
              <h3 className="es-h3">A memecoin on Elysium. Nothing on this site needs it.</h3>
              <p className="es-body mt-2">Planning, tracking and claiming are free and stay free. Fee discounts are planned only if Elyswap ever charges a fee. The launchpad is to be announced.</p>
            </div>
            <Link href="/token" className="es-btn ghost">
              About the token
            </Link>
          </div>
          <div className="rv mt-5">
            <CaRow testid="ca-home" network="Elysium" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="es-section pt-8 text-center">
        <div className="es-wrap">
          <p className="es-eyebrow rv">Ready?</p>
          <h2 className="es-h2 rv mx-auto max-w-[640px]">Try it with a small amount first.</h2>
          <p className="es-lead rv mx-auto mt-5">Send a little, watch it land, then move the rest. Your wallet signs every step.</p>
          <div className="rv mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/routes" className="es-btn">
              Compare routes
            </Link>
            <a href={CHAINS.hyperevm.addressUrl(CANONICAL.outbox)} target="_blank" rel="noreferrer" className="es-btn ghost">
              See the Outbox on HyperEVM ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductRow({ n, title, text, points, href, cta, flip, children }: { n: string; title: string; text: string; points: string[]; href: string; cta: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid items-center gap-10 md:grid-cols-2 md:gap-14 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div className="rv min-w-0">{children}</div>
      <div className="rv min-w-0">
        <p className="es-eyebrow">{n}</p>
        <h3 className="m-0 text-[28px] font-medium leading-[1.15] tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>
          {title}
        </h3>
        <p className="es-body mt-4">{text}</p>
        <ul className="mt-6 grid list-none gap-3 p-0">
          {points.map((p) => (
            <li key={p} className="es-check">
              <CheckIcon size={14} />
              <span className="text-[14px] text-[var(--mute)]">{p}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className="es-btn ghost mt-8">
          {cta}
        </Link>
      </div>
    </div>
  );
}

function WayCard({ label, title, text, points, href, cta, highlight }: { label: string; title: string; text: string; points: string[]; href: string; cta: string; highlight?: boolean }) {
  return (
    <div className={`es-card rv flex flex-col ${highlight ? "border-[rgb(255_193_147/0.45)]" : ""}`}>
      <p className="es-eyebrow">{label}</p>
      <h3 className="m-0 text-[24px] font-medium tracking-[-0.03em]" style={{ fontFamily: "var(--head)" }}>
        {title}
      </h3>
      <p className="es-body mt-3">{text}</p>
      <ul className="mt-6 grid list-none gap-3 p-0">
        {points.map((p) => (
          <li key={p} className="es-check">
            <CheckIcon size={14} />
            <span className="text-[14px] text-[var(--mute)]">{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Link href={href} className={highlight ? "es-btn" : "es-btn ghost"}>
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* Small drawn screens for the product rows. Labels only, no invented figures: they show the layout, the live pages show data. */

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="es-panel overflow-hidden">
      <div className="es-panel-head">
        <span className="text-[13px]">{title}</span>
        <span className="es-dots p-0" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="es-panel-body grid gap-2 text-[13px]">{children}</div>
    </div>
  );
}

function MiniPlanner() {
  return (
    <Frame title="Route planner">
      <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-black px-3 py-2">
        <span className="text-[var(--mute)]">Amount</span>
        <span className="mono">HYPE on Elysium</span>
      </div>
      {["Canonical · gas only · days", "Relay direct · fee · seconds", "Via Solana · 2 hops", "Via Robinhood Chain · 2 hops"].map((r, i) => (
        <div key={r} className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--line-soft)] px-3 py-2">
          <span className="truncate">{r}</span>
          <span className={`es-tag ${i === 0 ? "warn" : "good"}`}>{i === 0 ? "slow" : "fast"}</span>
        </div>
      ))}
    </Frame>
  );
}

function MiniTracker() {
  const stages = [
    { s: "Waiting for an assertion", t: "plain" },
    { s: "In the challenge period", t: "warn" },
    { s: "Ready to claim", t: "good" },
    { s: "Claimed on HyperEVM", t: "plain" },
  ];
  return (
    <Frame title="Withdrawal tracker">
      {stages.map((x, i) => (
        <div key={x.s} className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--line-soft)] px-3 py-2">
          <span className="flex min-w-0 items-center gap-3">
            <span className="mono text-[var(--mute)]">0{i + 1}</span>
            <span className="truncate">{x.s}</span>
          </span>
          <span className={`es-tag ${x.t}`}>{i === 2 ? "claim" : i === 1 ? "countdown" : "stage"}</span>
        </div>
      ))}
    </Frame>
  );
}

function MiniHops() {
  return (
    <Frame title="Hop tracker">
      {[
        { a: "Elysium", b: "Robinhood Chain", t: "good", l: "delivered" },
        { a: "Robinhood Chain", b: "HyperEVM", t: "warn", l: "sent" },
      ].map((h) => (
        <div key={h.a} className="grid gap-1 rounded-[6px] border border-[var(--line-soft)] px-3 py-2">
          <span className="flex items-center justify-between gap-3">
            <span className="truncate">
              {h.a} → {h.b}
            </span>
            <span className={`es-tag ${h.t}`}>{h.l}</span>
          </span>
          <span className="text-[12px] text-[var(--mute)]">source tx · bridge request · delivery tx</span>
        </div>
      ))}
    </Frame>
  );
}
