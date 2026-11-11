import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND, addChainParams } from "../config/brand";
import { HOME_TITLE } from "./seo";

test("F-13: the chain added to a wallet names its gas token HYPE, not Ether", () => {
  const p = addChainParams();
  assert.equal(p.chainId, "0x1863d");
  assert.deepEqual(p.nativeCurrency, { name: "HYPE", symbol: "HYPE", decimals: 18 });
});

test("U-08: the title carries the owner's slogan with its final full stop", () => {
  assert.equal(BRAND.slogan, "Your Liquidity. Your Strategy.");
  assert.ok(HOME_TITLE.endsWith("Your Liquidity. Your Strategy."), HOME_TITLE);
});
