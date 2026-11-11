import { parseAbi } from "viem";

/** ElyswapJourneyBook, the parts the site calls. The full ABI is in src/lib/contracts/artifacts.json. */
export const BOOK_ABI = parseAbi([
  "struct HopInput { uint64 fromChain; uint64 toChain; bytes32 bridge; }",
  "struct JourneyInput { bytes32 routeId; bytes32 recipient; bytes32 planHash; uint128 amountIn; HopInput[] hops; }",
  "struct Journey { address owner; uint8 status; uint8 hopCount; uint64 createdAt; uint64 updatedAt; address editor; address pendingOwner; bytes32 routeId; bytes32 recipient; bytes32 planHash; uint128 amountIn; uint64 originChain; uint64 destChain; }",
  "struct Hop { uint64 fromChain; uint64 toChain; uint8 status; uint8 attempts; uint64 sentAt; uint64 doneAt; bytes32 bridge; bytes32 sourceTx; bytes32 destTx; }",
  "function journeyCount() view returns (uint256)",
  "function open(JourneyInput input) returns (uint256 id)",
  "function recordSent(uint256 id, uint8 index, bytes32 sourceTx)",
  "function recordDelivered(uint256 id, uint8 index, bytes32 destTx)",
  "function recordFailed(uint256 id, uint8 index, bytes32 reason)",
  "function retryHop(uint256 id, uint8 index)",
  "function abandon(uint256 id, bytes32 reason)",
  "function setEditor(uint256 id, address editor)",
  "function offerOwnership(uint256 id, address to)",
  "function acceptOwnership(uint256 id)",
  "function journey(uint256 id) view returns (Journey)",
  "function hops(uint256 id) view returns (Hop[])",
  "function journeysOf(address owner, uint256 offset, uint256 limit) view returns (uint256[] ids, uint256 total)",
  "function claimed(uint64 chainId, bytes32 txHash) view returns (bool found, uint256 journeyId, uint256 index)",
  "event JourneyOpened(uint256 indexed id, address indexed owner, bytes32 indexed routeId, uint64 originChain, uint64 destChain, uint128 amountIn, bytes32 recipient, bytes32 planHash, uint8 hopCount)",
  "error UnknownJourney()",
  "error NotOwner()",
  "error NotOwnerOrEditor()",
  "error NotPendingOwner()",
  "error BadHopCount()",
  "error BadHop(uint256 index)",
  "error BrokenChain(uint256 index)",
  "error ZeroRecipient()",
  "error ZeroRoute()",
  "error ZeroHash()",
  "error BadIndex()",
  "error WrongJourneyStatus(uint8 status)",
  "error WrongHopStatus(uint8 status)",
  "error PreviousHopOpen(uint256 index)",
  "error TxAlreadyClaimed(uint256 journeyId, uint256 index)",
  "error TooManyAttempts()",
  "error SelfAddress()",
]);

/** Plain words for each revert. */
export const ERROR_WORDS: Record<string, string> = {
  UnknownJourney: "There is no journey with this number.",
  NotOwner: "Only the journey's owner can do that.",
  NotOwnerOrEditor: "Only the journey's owner or its editor can record hops.",
  NotPendingOwner: "Only the address the journey was offered to can accept it.",
  BadHopCount: "A journey has between one and six hops.",
  BadHop: "A hop needs two different chains and a bridge.",
  BrokenChain: "Each hop must start where the previous one ended.",
  ZeroRecipient: "Set the address that receives the HYPE at the end.",
  ZeroRoute: "Pick a route.",
  ZeroHash: "Paste a transaction hash.",
  BadIndex: "That hop does not exist on this journey.",
  WrongJourneyStatus: "This journey is finished or abandoned; it cannot change.",
  WrongHopStatus: "That hop is not in the right state for this step.",
  PreviousHopOpen: "Record the previous hop as delivered first.",
  TxAlreadyClaimed: "This transaction is already recorded on another hop or journey.",
  TooManyAttempts: "This hop has been retried five times; abandon the journey or open a new one.",
  SelfAddress: "That is already the owner's address.",
};

export const JOURNEY_STATUS = ["None", "Planned", "Underway", "Arrived", "Abandoned"] as const;
export const HOP_STATUS = ["None", "Planned", "Sent", "Delivered", "Failed"] as const;

/** Elysium's ArbSys precompile: the canonical withdrawal. */
export const ARBSYS_ABI = parseAbi(["function withdrawEth(address destination) payable returns (uint256)"]);
