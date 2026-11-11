import { test } from "node:test";
import assert from "node:assert/strict";
import { amount, num, price, usd } from "./fmt";
import { defaultFlip, isFlipped, shownPrices, toPoolRange } from "./orient";

const noExponent = (s: string) => assert.doesNotMatch(s, /e[+-]?\d/i, s);

test("F-14: no exponent ever reaches the page", () => {
  for (const n of [3.46e13, 1e30, 3.38e26, 9.97e-8, 1e-7, 1e-18, 123456789012345]) {
    noExponent(num(n));
    noExponent(num(-n));
    noExponent(price(n));
    noExponent(usd(n));
  }
  assert.equal(num(3.46e13), "34.60T");
  assert.equal(num(9.97e-8), "0.0₇997");
  assert.equal(num(0.00012345, 4), "0.0₃1235");
  noExponent(amount(1000000000000000000000000000000000000n, 6));
});

test("U-04: dollars follow one rule: K/M/B from $10,000 up, two decimals below", () => {
  assert.equal(usd(617.5), "$617.50");
  assert.equal(usd(206.91), "$206.91");
  assert.equal(usd(9701.89), "$9,701.89");
  assert.equal(usd(287300), "$287.3K");
  assert.equal(usd(1_250_000), "$1.25M");
  assert.equal(usd(-6.04), "−$6.04");
  assert.equal(usd(0), "$0.00");
});

test("U-04: prices keep five significant digits with trailing zeros", () => {
  assert.equal(price(71.2), "71.200");
  assert.equal(price(232.97), "232.97");
  assert.equal(price(0.014044), "0.014044");
  assert.equal(price(1234.5678), "1,234.6");
});

const USDC = { address: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65", symbol: "USDC" };
const WHYPE = { address: "0xba876237b0f021a6c6d852d6c26e107997cc5e81", symbol: "WHYPE" };
const HYPE = { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE" };
const KNTQ = { address: "0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0", symbol: "KNTQ" };

test("F-10: USDC/WHYPE is quoted in USDC per WHYPE by default, and the toggle turns it around", () => {
  assert.equal(defaultFlip(USDC, WHYPE), true);
  const s = shownPrices({ token0: USDC, token1: WHYPE, price: 0.014044, priceLower: 0.012, priceUpper: 0.016 }, false);
  assert.equal(s.unit, "USDC per WHYPE");
  assert.ok(Math.abs(s.now - 71.2048) < 0.001);
  assert.ok(s.low < s.now && s.now < s.high);
  assert.ok(Math.abs(s.low - 62.5) < 1e-9 && Math.abs(s.high - 1 / 0.012) < 1e-9);
  const back = shownPrices({ token0: USDC, token1: WHYPE, price: 0.014044 }, true);
  assert.equal(back.unit, "WHYPE per USDC");
  assert.equal(back.now, 0.014044);
  // HYPE/KNTQ: HYPE is the unit, so KNTQ per HYPE is turned into HYPE per KNTQ.
  assert.equal(isFlipped(HYPE, KNTQ, false), true);
  assert.equal(defaultFlip(KNTQ, USDC), false);
});

test("F-10: bounds typed in the shown orientation go back to pool order", () => {
  assert.deepEqual(toPoolRange(60, 80, false), { low: 60, high: 80 });
  const r = toPoolRange(62.5, 80, true)!;
  assert.equal(r.low, 1 / 80);
  assert.equal(r.high, 1 / 62.5);
  assert.equal(toPoolRange(300, 200, false), null);
  assert.equal(toPoolRange(0, 200, false), null);
});
