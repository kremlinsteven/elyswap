import { test } from "node:test";
import assert from "node:assert/strict";
// No contract is deployed in this build, so every target is "foreign": only plain reads pass.
const KNOWN = { address: "0x00000000000000000000000000000000000000b0" };
import { MAX_CALL_DATA, MAX_FOREIGN_GAS, checkBatch, isPlainRead, runRelay } from "./relay";

const call = (to: string, data = "0x", extra: Record<string, unknown> = {}) => ({ method: "eth_call", params: [{ to, data, ...extra }, "latest"] });
const STRANGER = "0x000000000000000000000000000000000000dead";

test("reads of known contracts are priced", () => {
  const out = checkBatch([call(KNOWN.address, "0x18160ddd")]);
  assert.ok("units" in out && out.units === 2);
});

test("signed transactions, all log queries and unknown calls are refused", () => {
  assert.ok("error" in checkBatch([call(STRANGER)]));
  assert.ok("error" in checkBatch([call(STRANGER, "0xa9059cbb" + "0".repeat(128))]));
  assert.ok("error" in checkBatch([{ method: "eth_sendRawTransaction", params: ["0x02"] }]));
  assert.ok("error" in checkBatch([{ method: "eth_getLogs", params: [{ address: KNOWN.address, fromBlock: "0x1", toBlock: "0x2" }] }]));
});

test("a plain read of any address is allowed, with a low gas cap", () => {
  const tx = { to: STRANGER, data: "0x06fdde03" } as Record<string, unknown>;
  assert.ok("units" in checkBatch([{ method: "eth_call", params: [tx, "latest"] }]));
  assert.equal(Number(BigInt(tx.gas as string)), MAX_FOREIGN_GAS);
  assert.ok("error" in checkBatch([call(STRANGER, "0x06fdde03", { gas: "0xffffff" })]));
  assert.equal(isPlainRead("0x70a08231" + "0".repeat(64)), true);
  assert.equal(isPlainRead("0x70a08231" + "0".repeat(66)), false);
});

test("no state overrides, odd fields, value or input tricks", () => {
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: KNOWN.address, data: "0x" }, "latest", {}] }]));
  assert.ok("error" in checkBatch([call(KNOWN.address, "0x", { TO: STRANGER })]));
  assert.ok("error" in checkBatch([call(KNOWN.address, "0x", { value: "0x1" })]));
  assert.ok("error" in checkBatch([call(KNOWN.address, "0x00", { input: "0x01" })]));
  assert.ok("error" in checkBatch([call(KNOWN.address, `0x${"0".repeat(MAX_CALL_DATA)}`)]));
  assert.ok("error" in checkBatch([{ method: "eth_call", params: [{ to: STRANGER, input: "0xa9059cbb" }, "latest"] }]));
});

test("estimates only for the book, which is not set in this build", () => {
  assert.ok("error" in checkBatch([{ method: "eth_estimateGas", params: [{ to: KNOWN.address, data: "0x" }] }]));
});

test("batch size and block reads", () => {
  assert.ok("error" in checkBatch([]));
  assert.ok("error" in checkBatch(Array.from({ length: 21 }, () => call(KNOWN.address, "0x18160ddd"))));
  assert.ok("error" in checkBatch([{ method: "eth_getBlockByNumber", params: ["latest", true] }]));
  assert.ok("units" in checkBatch([{ method: "eth_getBlockByNumber", params: ["latest", false] }]));
});

test("a refused budget never reaches the RPC", async () => {
  let reached = false;
  const out = await runRelay(call(KNOWN.address, "0x18160ddd"), {
    charge: async () => "slow down",
    one: async () => {
      reached = true;
      return { result: "0x" };
    },
    many: async () => [],
  });
  assert.equal(out.status, 429);
  assert.equal(reached, false);
});

test("a refused target costs budget and never reaches the RPC", async () => {
  let charged = 0;
  let reached = false;
  const out = await runRelay(call(STRANGER, "0xdeadbeef"), {
    charge: async (u) => {
      charged += u;
      return null;
    },
    one: async () => {
      reached = true;
      return { result: "0x" };
    },
    many: async () => [],
  });
  assert.equal(out.status, 400);
  assert.ok(charged > 0);
  assert.equal(reached, false);
});

test("a dead upstream is a 502", async () => {
  const out = await runRelay(call(KNOWN.address, "0x18160ddd"), { charge: async () => null, one: async () => ({ down: true }), many: async () => [] });
  assert.equal(out.status, 502);
});
