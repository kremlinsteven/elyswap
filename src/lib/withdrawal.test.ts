import { test } from "node:test";
import assert from "node:assert/strict";
import { addressTopic, duration, isTxHash, stageOf, type Assertion, type RollupState } from "./withdrawal.ts";

// Numbers taken from the real rollup read on 12 Nov 2026 (referensi/qa/claim-sim.txt), trimmed to three pending assertions.
const a = (hash: string, createdAtBlock: number, confirmPeriodBlocks: number, sendCount: number, rival = false): Assertion => ({ hash, createdAtBlock, confirmPeriodBlocks, l2Block: 0, sendCount, l2Timestamp: 0, rival });
const state: RollupState = {
  confirmed: a("0xc", 50520119, 483840, 1518),
  pending: [a("0xp1", 50564095, 483840, 1596), a("0xp2", 50700000, 483840, 2000), a("0xp3", 51014170, 86400, 4936)],
  hyperBlock: 51017106,
  hyperTimestamp: 1794432000,
  currentConfirmPeriodBlocks: 86400,
  secPerBlock: 1,
};

test("spent wins over everything", () => {
  assert.equal(stageOf({ position: 5000 }, true, state).stage, "claimed");
});

test("position below the confirmed send count is ready", () => {
  const s = stageOf({ position: 84 }, false, state);
  assert.equal(s.stage, "ready");
  assert.equal(s.etaSeconds, 0);
  assert.equal(stageOf({ position: 1517 }, false, state).stage, "ready");
  // sendCount is a count: position 1518 is the first one NOT covered.
  assert.notEqual(stageOf({ position: 1518 }, false, state).stage, "ready");
});

test("covered by the first pending assertion: its own deadline", () => {
  const s = stageOf({ position: 1518 }, false, state);
  assert.equal(s.stage, "challenge");
  assert.equal(s.assertion, "0xp1");
  assert.equal(s.readyBlock, 50564095 + 483840);
  assert.equal(s.etaSeconds, 50564095 + 483840 - 51017106);
});

test("a newer assertion with a shorter period still waits for its parents", () => {
  const s = stageOf({ position: 4000 }, false, state);
  assert.equal(s.assertion, "0xp3");
  // p2's deadline (50700000 + 483840) is later than p3's own (51014170 + 86400).
  assert.equal(s.readyBlock, 50700000 + 483840);
});

test("not asserted yet: lower bound is the larger of the current period and the last pending deadline", () => {
  const s = stageOf({ position: 9000 }, false, state);
  assert.equal(s.stage, "waiting");
  assert.equal(s.etaSeconds, null);
  assert.equal(s.minSeconds, Math.max(86400, 51014170 + 86400 - 51017106, 50700000 + 483840 - 51017106));
  const empty = stageOf({ position: 9000 }, false, { ...state, pending: [] });
  assert.equal(empty.minSeconds, 86400);
});

test("eta never negative once the deadline passed", () => {
  const s = stageOf({ position: 1518 }, false, { ...state, hyperBlock: 60_000_000 });
  assert.equal(s.etaSeconds, 0);
});

test("rival assertion flags a challenge", () => {
  const st = { ...state, pending: [a("0xp1", 50564095, 483840, 1596, true)] };
  assert.equal(stageOf({ position: 1520 }, false, st).rival, true);
  assert.equal(stageOf({ position: 9000 }, false, st).rival, true);
});

test("duration text", () => {
  assert.equal(duration(null), "—");
  assert.equal(duration(45), "45 s");
  assert.equal(duration(125), "2 m 05 s");
  assert.equal(duration(3 * 3600 + 4 * 60), "3 h 04 m");
  assert.equal(duration(5 * 86400 + 12 * 3600 + 59), "5 d 12 h");
  assert.equal(duration(-5), "0 s");
});

test("address topic and hash checks", () => {
  assert.equal(addressTopic("0x8D48cb654c00D745c10a076d0140f07DeC9a2780"), "0x0000000000000000000000008d48cb654c00d745c10a076d0140f07dec9a2780");
  assert.throws(() => addressTopic("0x123"));
  assert.ok(isTxHash(`0x${"a".repeat(64)}`));
  assert.ok(!isTxHash(`0x${"a".repeat(63)}`));
});
