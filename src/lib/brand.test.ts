import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND, TOKEN, addChainParams } from "../config/brand";
import { CHAINS, addParams, chainById } from "../config/chains";
import { HOME_TITLE } from "./seo";

test("the chain added to a wallet on connect is Elysium with HYPE as gas", () => {
  const p = addChainParams();
  assert.equal(p.chainId, "0x1863d");
  assert.deepEqual(p.nativeCurrency, { name: "HYPE", symbol: "HYPE", decimals: 18 });
});

test("a claim adds HyperEVM 999 with HYPE, a Robinhood hop adds 4663 with ETH", () => {
  assert.equal(addParams("hyperevm").chainId, "0x3e7");
  assert.equal(addParams("hyperevm").nativeCurrency.symbol, "HYPE");
  assert.equal(addParams("robinhood").chainId, "0x1237");
  assert.equal(addParams("robinhood").nativeCurrency.symbol, "ETH");
  assert.equal(chainById(999)?.key, "hyperevm");
  assert.equal(chainById(1), null);
  assert.equal(CHAINS.solana.evm, false);
});

test("slogan, ticker and CA come from one place", () => {
  assert.equal(BRAND.slogan, "Don't Wait Days for Your HYPE.");
  assert.equal(BRAND.tagline, "Plan the Route. Track Every Hop.");
  assert.ok(HOME_TITLE.endsWith(BRAND.slogan));
  assert.equal(BRAND.ticker, "ELYSWAP");
  assert.equal(BRAND.symbol, "$ELYSWAP");
  // CA is TBA until launch; the site treats anything that is not an address as "not launched".
  assert.equal(TOKEN.isLive, /^0x[0-9a-fA-F]{40}$/.test(BRAND.ca));
});
