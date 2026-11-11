import "server-only";
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, parseAbi, type Hex } from "viem";
import { CANONICAL, HYPER_BLOCK_SECONDS, TOPICS } from "@/config/chains";
import { RpcFail, hex, pool, rpcOn } from "@/lib/server/multirpc";
import { addressTopic, stageOf, type Assertion, type RollupState, type WithdrawalEvent, type WithdrawalStatus } from "@/lib/withdrawal";

/*
 * Reads the canonical bridge state: the latest confirmed BoLD assertion on HyperEVM and the pending ones after it, the
 * withdrawals (L2ToL1Tx) of an address or a transaction on Elysium, whether each is spent in the Outbox, and the Merkle
 * proof to claim one. Tested against real outbox data on 12 Nov 2026 (referensi/qa/claim-sim.txt).
 *
 * HyperEVM's public RPC answers eth_getLogs for at most 1,000 blocks, so assertions are never scanned: getAssertion()
 * gives the exact HyperEVM block where each assertion and its first child were created, and a one-block log read there
 * returns the AssertionCreated event.
 */

export const ROLLUP_ABI = parseAbi([
  "function latestConfirmed() view returns (bytes32)",
  "function confirmPeriodBlocks() view returns (uint64)",
  "function getAssertion(bytes32) view returns ((uint64 firstChildBlock, uint64 secondChildBlock, uint64 createdAtBlock, bool isFirstChild, uint8 status, bytes32 configHash))",
]);

export const CREATED_ABI = parseAbi([
  "struct ConfigData { bytes32 wasmModuleRoot; uint256 requiredStake; address challengeManager; uint64 confirmPeriodBlocks; uint64 nextInboxPosition; }",
  "struct BeforeStateData { bytes32 prevPrevAssertionHash; bytes32 sequencerBatchAcc; ConfigData configData; }",
  "struct GlobalState { bytes32[2] bytes32Vals; uint64[2] u64Vals; }",
  "struct AssertionState { GlobalState globalState; uint8 machineStatus; bytes32 endHistoryRoot; }",
  "struct AssertionInputs { BeforeStateData beforeStateData; AssertionState beforeState; AssertionState afterState; }",
  "event AssertionCreated(bytes32 indexed assertionHash, bytes32 indexed parentAssertionHash, AssertionInputs assertion, bytes32 afterInboxBatchAcc, uint256 inboxMaxCount, bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks)",
]);

export const L2TOL1_ABI = parseAbi([
  "event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)",
]);

export const NODE_ABI = parseAbi(["function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)"]);

export const OUTBOX_ABI = parseAbi([
  "function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)",
  "function isSpent(uint256 index) view returns (bool)",
  "function roots(bytes32) view returns (bytes32)",
]);

type Node = { firstChildBlock: bigint; secondChildBlock: bigint; createdAtBlock: bigint; isFirstChild: boolean; status: number; configHash: Hex };

async function rollupRead<T>(fn: "latestConfirmed" | "confirmPeriodBlocks" | "getAssertion", args: readonly unknown[] = []): Promise<T> {
  const data = encodeFunctionData({ abi: ROLLUP_ABI, functionName: fn, args } as never);
  const raw = await rpcOn<Hex>("hyperevm", "eth_call", [{ to: CANONICAL.rollup, data }, "latest"]);
  return decodeFunctionResult({ abi: ROLLUP_ABI, functionName: fn, data: raw } as never) as T;
}

/** The AssertionCreated event of `hash`, read from the single HyperEVM block where it was emitted. */
async function createdEvent(block: bigint, topicIndex: 1 | 2, hash: string) {
  const topics: (string | null)[] = [TOPICS.assertionCreated, null, null];
  topics[topicIndex] = hash;
  const logs = await rpcOn<{ data: Hex; topics: Hex[] }[]>("hyperevm", "eth_getLogs", [{ address: CANONICAL.rollup, fromBlock: hex(block), toBlock: hex(block), topics }]);
  return logs.map((l) => decodeEventLog({ abi: CREATED_ABI, data: l.data, topics: l.topics as [Hex, ...Hex[]] }).args as unknown as {
    assertionHash: Hex;
    parentAssertionHash: Hex;
    assertion: { afterState: { globalState: { bytes32Vals: readonly [Hex, Hex] } } };
    confirmPeriodBlocks: bigint;
  });
}

async function elysiumBlockByHash(hash: string) {
  const b = await rpcOn<{ number: Hex; sendCount?: Hex; timestamp: Hex } | null>("elysium", "eth_getBlockByHash", [hash, false]);
  if (!b || !b.sendCount) throw new RpcFail("Elysium block missing sendCount.");
  return { number: Number(BigInt(b.number)), sendCount: Number(BigInt(b.sendCount)), timestamp: Number(BigInt(b.timestamp)) };
}

async function toAssertion(ev: Awaited<ReturnType<typeof createdEvent>>[number], node: Node): Promise<Assertion> {
  const l2 = await elysiumBlockByHash(ev.assertion.afterState.globalState.bytes32Vals[0]);
  return {
    hash: ev.assertionHash,
    createdAtBlock: Number(node.createdAtBlock),
    confirmPeriodBlocks: Number(ev.confirmPeriodBlocks),
    l2Block: l2.number,
    sendCount: l2.sendCount,
    l2Timestamp: l2.timestamp,
    rival: node.secondChildBlock !== 0n,
  };
}

/** At most this many pending assertions are walked (one is posted about every 12 hours; a confirm period is ~1–6 days). */
const MAX_PENDING = 40;

export async function readRollup(): Promise<RollupState> {
  const [latest, cpb, head] = await Promise.all([
    rollupRead<Hex>("latestConfirmed"),
    rollupRead<bigint>("confirmPeriodBlocks"),
    rpcOn<{ number: Hex; timestamp: Hex }>("hyperevm", "eth_getBlockByNumber", ["latest", false]),
  ]);
  const node = await rollupRead<Node>("getAssertion", [latest]);
  const [ev] = await createdEvent(node.createdAtBlock, 1, latest);
  if (!ev) throw new RpcFail("Confirmed assertion event not found.");
  const confirmed = await toAssertion(ev, node);

  const pending: Assertion[] = [];
  let parent: Hex = latest;
  let parentNode = node;
  for (let k = 0; k < MAX_PENDING && parentNode.firstChildBlock !== 0n; k++) {
    const children = await createdEvent(parentNode.firstChildBlock, 2, parent);
    const child = children[0];
    if (!child) break;
    const childNode = await rollupRead<Node>("getAssertion", [child.assertionHash]);
    const a = await toAssertion(child, childNode);
    // A rival sibling on the parent also means a challenge.
    if (parentNode.secondChildBlock !== 0n) a.rival = true;
    pending.push(a);
    parent = child.assertionHash;
    parentNode = childNode;
  }
  return {
    confirmed,
    pending,
    hyperBlock: Number(BigInt(head.number)),
    hyperTimestamp: Number(BigInt(head.timestamp)),
    currentConfirmPeriodBlocks: Number(cpb),
    secPerBlock: HYPER_BLOCK_SECONDS,
  };
}

let rollupCache: { at: number; value: RollupState } | null = null;
let rollupInflight: Promise<RollupState> | null = null;

/** Rollup state, shared by every visitor for 60 s (single flight). */
export async function rollupState(): Promise<RollupState & { readAt: number }> {
  if (rollupCache && Date.now() - rollupCache.at < 60_000) return { ...rollupCache.value, readAt: rollupCache.at };
  rollupInflight ??= readRollup()
    .then((v) => {
      rollupCache = { at: Date.now(), value: v };
      return v;
    })
    .finally(() => {
      rollupInflight = null;
    });
  try {
    const v = await rollupInflight;
    return { ...v, readAt: rollupCache?.at ?? Date.now() };
  } catch (e) {
    // A stale state (under 15 minutes) is better than none; the page shows its read time.
    if (rollupCache && Date.now() - rollupCache.at < 15 * 60_000) return { ...rollupCache.value, readAt: rollupCache.at };
    throw e;
  }
}

type RawLog = { address: string; data: Hex; topics: Hex[]; transactionHash: Hex };

function decodeWithdrawal(l: RawLog): WithdrawalEvent | null {
  if (l.address.toLowerCase() !== CANONICAL.arbSys || l.topics[0] !== TOPICS.l2ToL1Tx) return null;
  try {
    const a = decodeEventLog({ abi: L2TOL1_ABI, data: l.data, topics: l.topics as [Hex, ...Hex[]] }).args;
    return {
      txHash: l.transactionHash,
      position: Number(a.position),
      caller: a.caller,
      destination: a.destination,
      arbBlockNum: Number(a.arbBlockNum),
      ethBlockNum: Number(a.ethBlockNum),
      timestamp: Number(a.timestamp),
      callvalue: a.callvalue.toString(),
      data: a.data,
    };
  } catch {
    return null;
  }
}

/** Withdrawals sent to `address` (it receives them on HyperEVM), newest first, capped. */
export async function withdrawalsTo(address: string, max = 50): Promise<{ list: WithdrawalEvent[]; total: number }> {
  const logs = await rpcOn<RawLog[]>("elysium", "eth_getLogs", [{ address: CANONICAL.arbSys, fromBlock: "0x0", toBlock: "latest", topics: [TOPICS.l2ToL1Tx, addressTopic(address)] }]);
  const all = logs.map(decodeWithdrawal).filter((w): w is WithdrawalEvent => w !== null);
  all.sort((a, b) => b.position - a.position);
  return { list: all.slice(0, max), total: all.length };
}

/** Withdrawals in one Elysium transaction. */
export async function withdrawalsInTx(hash: string): Promise<WithdrawalEvent[] | null> {
  const r = await rpcOn<{ logs: RawLog[] } | null>("elysium", "eth_getTransactionReceipt", [hash]);
  if (!r) return null;
  return r.logs.map((l) => decodeWithdrawal({ ...l, transactionHash: hash as Hex })).filter((w): w is WithdrawalEvent => w !== null);
}

export async function isSpent(position: number): Promise<boolean> {
  const data = encodeFunctionData({ abi: OUTBOX_ABI, functionName: "isSpent", args: [BigInt(position)] });
  const raw = await rpcOn<Hex>("hyperevm", "eth_call", [{ to: CANONICAL.outbox, data }, "latest"]);
  return decodeFunctionResult({ abi: OUTBOX_ABI, functionName: "isSpent", data: raw });
}

export type TrackedWithdrawal = WithdrawalEvent & { status: WithdrawalStatus };

export async function withStatus(list: WithdrawalEvent[], state: RollupState): Promise<TrackedWithdrawal[]> {
  const spent = await pool(list, 3, async (w) => (w.position < state.confirmed.sendCount ? isSpent(w.position) : false));
  return list.map((w, i) => ({ ...w, status: stageOf(w, spent[i], state) }));
}

/**
 * Builds the claim for a confirmed, unspent withdrawal: the Merkle proof from Elysium's NodeInterface against the
 * confirmed send count, checked against Outbox.roots() on HyperEVM, then simulated with eth_estimateGas from `from`.
 */
export async function buildClaim(w: WithdrawalEvent, state: RollupState, from: string) {
  if (w.position >= state.confirmed.sendCount) throw new RpcFail("This withdrawal is not covered by a confirmed assertion yet.", true);
  const proofRaw = await rpcOn<Hex>("elysium", "eth_call", [{ to: CANONICAL.nodeInterface, data: encodeFunctionData({ abi: NODE_ABI, functionName: "constructOutboxProof", args: [BigInt(state.confirmed.sendCount), BigInt(w.position)] }) }, "latest"]);
  const [, root, proof] = decodeFunctionResult({ abi: NODE_ABI, functionName: "constructOutboxProof", data: proofRaw });
  const known = decodeFunctionResult({
    abi: OUTBOX_ABI,
    functionName: "roots",
    data: await rpcOn<Hex>("hyperevm", "eth_call", [{ to: CANONICAL.outbox, data: encodeFunctionData({ abi: OUTBOX_ABI, functionName: "roots", args: [root] }) }, "latest"]),
  });
  if (/^0x0+$/.test(known)) throw new RpcFail("The proof's root is not known to the Outbox yet.", true);
  const data = encodeFunctionData({
    abi: OUTBOX_ABI,
    functionName: "executeTransaction",
    args: [proof, BigInt(w.position), w.caller as Hex, w.destination as Hex, BigInt(w.arbBlockNum), BigInt(w.ethBlockNum), BigInt(w.timestamp), BigInt(w.callvalue), w.data as Hex],
  });
  let gas: string | null = null;
  let simError: string | null = null;
  try {
    gas = BigInt(await rpcOn<Hex>("hyperevm", "eth_estimateGas", [{ from, to: CANONICAL.outbox, data }])).toString();
  } catch (e) {
    simError = e instanceof Error ? e.message.slice(0, 240) : "Simulation failed.";
  }
  return { to: CANONICAL.outbox, data, root, proofLength: proof.length, sendCount: state.confirmed.sendCount, gas, simError };
}
