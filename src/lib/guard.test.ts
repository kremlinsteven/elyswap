import { test } from "node:test";
import assert from "node:assert/strict";
import { RATE_LIMITS, allowPublic } from "./guard";
import { CALLER_LIMIT, CALLER_WINDOW_S, POLL_MS } from "./server/ticksroute";

const req = (ip: string) => new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip, "x-real-ip": ip } });

test("public limits carry their own windows: the ticks budget is 60 per 10 minutes, as the alerts poll needs", () => {
  assert.equal(RATE_LIMITS.ticks.perIp, CALLER_LIMIT);
  assert.equal(RATE_LIMITS.ticks.windowSec, CALLER_WINDOW_S);
  assert.ok(((RATE_LIMITS.ticks.windowSec * 1000) / POLL_MS) * 2 <= RATE_LIMITS.ticks.perIp);
  assert.equal(RATE_LIMITS.pool.windowSec, 600);
  for (const l of Object.values(RATE_LIMITS)) assert.ok(l.windowSec > 0 && l.siteWindowSec > 0 && l.perIp > 0 && l.site >= l.perIp);
});

test("allowPublic counts per caller over the given window, not a fixed minute", async () => {
  const realNow = Date.now;
  let t = 6_000 * 600 * 1000; // the start of a 600 s window (and of a 60 s one)
  Date.now = () => t;
  try {
    const limit = { perIp: 2, windowSec: 600, site: 1_000, siteWindowSec: 60 };
    const r = req("203.0.113.7");
    // Without trusted proxy headers every caller shares one key with a larger budget: spend until refused.
    let n = 0;
    while (n < 1_000 && (await allowPublic(null, r, "guard-test", limit))) n++;
    assert.ok(n >= 2 && n < 1_000, `refused after ${n}`);
    // A minute later the caller is still over its 10-minute budget (the old call read the window as 60 s).
    t += 61_000;
    assert.equal(await allowPublic(null, r, "guard-test", limit), false);
    t += 600_000;
    assert.equal(await allowPublic(null, r, "guard-test", limit), true);
  } finally {
    Date.now = realNow;
  }
});
