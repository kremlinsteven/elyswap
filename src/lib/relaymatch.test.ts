import { test } from "node:test";
import assert from "node:assert/strict";
import { relayMatchesTx } from "./relaymatch.ts";

const TX = "0xECB4f9ebab078b3026679a49da550ebc6a13f4cb48a22afa6b36b2f017cbf320";

test("a request id is accepted only for the transaction that started it", () => {
  assert.equal(relayMatchesTx([TX.toLowerCase()], TX), true);
  // Mismatched rid: the request was started by another transaction.
  assert.equal(relayMatchesTx(["0x" + "ab".repeat(32)], TX), false);
  assert.equal(relayMatchesTx([], TX), false);
  assert.equal(relayMatchesTx(null, TX), false);
  assert.equal(relayMatchesTx([TX], ""), false);
});

test("Solana signatures compare exactly", () => {
  const sig = "5".repeat(70);
  assert.equal(relayMatchesTx([sig], sig), true);
  assert.equal(relayMatchesTx([sig.toLowerCase() + "x"], sig), false);
});
