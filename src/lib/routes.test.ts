import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTES, SOLANA_HYPE, fromUnits, hopCurrency, routeById, toUnits } from "./routes.ts";
import { relaySeconds, spread } from "./measured.ts";

test("every route starts on Elysium, ends on HyperEVM and its hops connect", () => {
  for (const r of ROUTES) {
    assert.equal(r.hops[0].from, "elysium", r.id);
    assert.equal(r.hops[r.hops.length - 1].to, "hyperevm", r.id);
    for (let i = 1; i < r.hops.length; i++) assert.equal(r.hops[i - 1].to, r.hops[i].from, r.id);
    assert.ok(r.trust.length > 20, r.id);
  }
  assert.equal(routeById("nope"), null);
});

test("a hop that starts on Solana is a link, never a transaction this site builds", () => {
  for (const r of ROUTES) for (const h of r.hops) if (h.from === "solana") assert.equal(h.exec, "link");
});

test("Solana hops use the Wormhole HYPE mint, EVM hops the native coin", () => {
  assert.equal(hopCurrency("solana", "HYPE (Wormhole)"), SOLANA_HYPE);
  assert.equal(hopCurrency("hyperevm", "HYPE"), "0x0000000000000000000000000000000000000000");
});

test("amount parsing refuses anything that is not a plain positive amount", () => {
  assert.equal(toUnits("1"), 10n ** 18n);
  assert.equal(toUnits("0.5"), 5n * 10n ** 17n);
  assert.equal(toUnits("25.123456789012345678"), 25123456789012345678n);
  for (const bad of ["", "0", "0.0", "-1", "1e3", "abc", "1.2.3", " ", "0x10", "1.0000000000000000001"]) assert.equal(toUnits(bad), null, bad);
  assert.equal(fromUnits(1234500000000000000n), "1.2345");
  assert.equal(fromUnits(10n ** 18n), "1");
  assert.equal(fromUnits(-5n * 10n ** 17n), "-0.5");
});

test("spread uses nearest-rank percentiles", () => {
  assert.equal(spread([]), null);
  const s = spread([2, 4, 6, 6, 3, 5, 4, 2, 4, 5])!;
  assert.deepEqual(s, { n: 10, min: 2, median: 4, p90: 6, max: 6 });
  assert.equal(spread([7])!.p90, 7);
});

test("relay seconds only from successful requests with both timestamps in order", () => {
  assert.equal(relaySeconds({ status: "success", data: { inTxs: [{ timestamp: 100 }], outTxs: [{ timestamp: 104 }] } }), 4);
  assert.equal(relaySeconds({ status: "refund", data: { inTxs: [{ timestamp: 100 }], outTxs: [{ timestamp: 104 }] } }), null);
  assert.equal(relaySeconds({ status: "success", data: { inTxs: [{ timestamp: 100 }], outTxs: [] } }), null);
  assert.equal(relaySeconds({ status: "success", data: { inTxs: [{ timestamp: 105 }], outTxs: [{ timestamp: 100 }] } }), null);
});
