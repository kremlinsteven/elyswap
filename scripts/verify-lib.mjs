// Checks behind scripts/verify-deployment.mjs, free of I/O so they can be tested with a fake chain.
//
// How it decides that an address runs this repository's ElyearnRangeBook:
//   - Runtime code is compared byte for byte with src/lib/contracts/artifacts.json (`npm run contracts:artifacts -- --check`
//     proves that file is a fresh forge build). The contract has no immutables and no constructor arguments.
//   - The creation transaction is required (no tx => FAIL, never MATCH). It must have succeeded, created exactly the address
//     checked, have no recipient, and its input must be exactly this build's creation code.
// Every check fails closed: an RPC error, an empty or malformed answer is a FAIL, never a skip.

export const CHAIN_ID = 99901;
export const NAME = "ElyearnRangeBook";

const isAddr = (v) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const isHex = (v) => typeof v === "string" && /^0x([0-9a-fA-F]{2})*$/.test(v);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/** Compares `code` with this build's runtime, byte for byte. */
export function match(ART, kind, code) {
  const a = ART[kind];
  if (!a) return { ok: false, why: "unknown contract" };
  if ((a.immutables ?? []).length) return { ok: false, why: "this build has immutables; the checker expects none" };
  const got = String(code).toLowerCase();
  if (got.length !== a.runtime.length) return { ok: false, why: "runtime length differs" };
  if (got !== a.runtime) return { ok: false, why: "runtime differs" };
  return { ok: true, why: "" };
}

/** input: { book, bookTx, rpc, ART }. rpc(method, params) -> result (may throw). Returns { ok, lines }. */
export async function verifyDeployment({ book, bookTx, rpc, ART }) {
  const lines = [];
  let failed = false;
  const ok = (m) => lines.push(`OK   ${m}`);
  const fail = (m) => {
    failed = true;
    lines.push(`FAIL ${m}`);
  };
  const done = () => ({ ok: !failed, lines });

  try {
    const id = await rpc("eth_chainId", []);
    if (Number(BigInt(id)) !== CHAIN_ID) {
      fail(`chain id ${id}, expected ${CHAIN_ID}`);
      return done();
    }
    ok(`chain id ${CHAIN_ID} (Elysium)`);
  } catch (e) {
    fail(`chain id unreadable: ${e.message}`);
    return done();
  }
  if (!book || !isAddr(book)) {
    fail("--book must be an address");
    return done();
  }
  try {
    const c = await rpc("eth_getCode", [book, "latest"]);
    if (!isHex(c) || c.length <= 2) throw new Error(`no code at ${book}`);
    const m = match(ART, NAME, c);
    if (m.ok) ok(`${NAME} at ${book}: runtime matches this build`);
    else fail(`${NAME} at ${book}: ${m.why}`);
  } catch (e) {
    fail(`${NAME}: ${e.message}`);
  }
  if (!bookTx) {
    fail(`${NAME}: no creation tx given (pass --book-tx); runtime alone is not a full match`);
    return done();
  }
  if (typeof bookTx !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(bookTx)) {
    fail(`${NAME}: --book-tx is not a 32-byte transaction hash`);
    return done();
  }
  try {
    const [tx, rc] = await Promise.all([rpc("eth_getTransactionByHash", [bookTx]), rpc("eth_getTransactionReceipt", [bookTx])]);
    if (!tx || !rc) fail(`${NAME}: creation tx ${bookTx} not found`);
    else if (rc.status !== "0x1") fail(`${NAME}: creation tx failed`);
    else if (!same(rc.contractAddress, book)) fail(`${NAME}: tx created ${rc.contractAddress}, not ${book}`);
    else if (tx.to) fail(`${NAME}: tx has a recipient, not a deployment`);
    else if (String(tx.input).toLowerCase() === ART[NAME].creation) ok(`${NAME}: creation input is exactly this build`);
    else fail(`${NAME}: creation input differs from this build`);
  } catch (e) {
    fail(`${NAME}: creation tx unreadable: ${e.message}`);
  }
  return done();
}
