// verify-lib against a fake chain built from this build's artifacts: a true deployment matches, and a foreign runtime, a wrong
// chain, a failed or missing creation tx, a tx with a recipient or a creation tx for another address each fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { match, verifyDeployment } from "./verify-lib.mjs";

const ART = JSON.parse(readFileSync(new URL("../src/lib/contracts/artifacts.json", import.meta.url), "utf8")).contracts;
const B = ART.ElyswapJourneyBook;
const BOOK = "0x" + "9e55".padStart(40, "0");
const TX = "0x" + "01".repeat(32);

function chain(over = {}) {
  const codes = { [BOOK]: B.runtime, ...over.codes };
  return async (method, params) => {
    if (method === "eth_chainId") return over.chainId ?? "0x1863d";
    if (method === "eth_getCode") return codes[params[0].toLowerCase()] ?? "0x";
    if (method === "eth_getTransactionByHash") return params[0] === TX ? { input: over.input ?? B.creation, to: over.to ?? null } : null;
    if (method === "eth_getTransactionReceipt") return params[0] === TX ? { status: over.status ?? "0x1", contractAddress: over.created ?? BOOK } : null;
    throw new Error(`unexpected ${method}`);
  };
}
const run = (over, args = {}) => verifyDeployment({ book: BOOK, bookTx: TX, ART, rpc: chain(over), ...args });

test("the build has no immutables", () => assert.equal(B.immutables.length, 0));
test("a true deployment matches", async () => assert.equal((await run({})).ok, true));
test("a foreign runtime fails", async () => {
  const flipped = B.runtime.slice(0, -2) + (B.runtime.endsWith("00") ? "01" : "00");
  assert.equal(match(ART, "ElyswapJourneyBook", flipped).ok, false);
  assert.equal((await run({ codes: { [BOOK]: flipped } })).ok, false);
});
test("wrong chain fails", async () => assert.equal((await run({ chainId: "0x1237" })).ok, false));
test("missing tx fails", async () => assert.equal((await run({}, { bookTx: undefined })).ok, false));
test("failed tx fails", async () => assert.equal((await run({ status: "0x0" })).ok, false));
test("tx for another address fails", async () => assert.equal((await run({ created: "0x" + "1".repeat(40) })).ok, false));
test("tx with a recipient fails", async () => assert.equal((await run({ to: "0x" + "2".repeat(40) })).ok, false));
test("other creation input fails", async () => assert.equal((await run({ input: B.creation + "00" })).ok, false));
test("an RPC error fails closed", async () => {
  const r = await verifyDeployment({ book: BOOK, bookTx: TX, ART, rpc: async () => { throw new Error("down"); } });
  assert.equal(r.ok, false);
});
