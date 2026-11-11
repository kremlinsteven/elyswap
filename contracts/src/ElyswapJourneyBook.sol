// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title ElyswapJourneyBook
 * @notice A public journal of multi-hop bridge journeys out of Elysium. A traveller opens a journey with its planned
 *         hops (from chain, to chain, bridge label), then records the source transaction of each hop when it is sent
 *         and the destination transaction when it arrives. A journey can be shared by its id and checked by anyone:
 *         the Elyswap site reads every recorded transaction hash back from its own chain.
 *
 *         What the book does NOT do: it cannot see other chains, so a recorded hash is the traveller's claim until a
 *         reader checks it. It holds no funds, moves none, has no payable function, no admin, no fee and no upgrade path.
 *         Each journey has one owner (two-step transfer) and an optional editor who may record hops but cannot
 *         abandon the journey or change roles.
 *
 *         A source or destination transaction hash, keyed by its chain id, can be claimed by one hop of one journey
 *         only, so a single transfer cannot be shown as the proof of two journeys.
 *
 *         Time is block.timestamp. On Elysium (Arbitrum Orbit) block.number inside a contract is the parent chain's
 *         block number, so it is not used.
 */
contract ElyswapJourneyBook {
    // ---------------------------------------------------------------------------------------------------------------
    // Types

    enum JourneyStatus {
        None,
        Planned,
        Underway,
        Arrived,
        Abandoned
    }

    enum HopStatus {
        None,
        Planned,
        Sent,
        Delivered,
        Failed
    }

    struct Journey {
        address owner;
        JourneyStatus status;
        uint8 hopCount;
        uint64 createdAt;
        uint64 updatedAt;
        address editor;
        address pendingOwner;
        bytes32 routeId;
        bytes32 recipient;
        bytes32 planHash;
        uint128 amountIn;
        uint64 originChain;
        uint64 destChain;
    }

    struct Hop {
        uint64 fromChain;
        uint64 toChain;
        HopStatus status;
        uint8 attempts;
        uint64 sentAt;
        uint64 doneAt;
        bytes32 bridge;
        bytes32 sourceTx;
        bytes32 destTx;
    }

    struct HopInput {
        uint64 fromChain;
        uint64 toChain;
        bytes32 bridge;
    }

    struct JourneyInput {
        bytes32 routeId;
        bytes32 recipient;
        bytes32 planHash;
        uint128 amountIn;
        HopInput[] hops;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Constants

    uint8 public constant MAX_HOPS = 6;
    /// @notice A failed hop may be retried; after this many attempts the journey must be abandoned or a new one opened.
    uint8 public constant MAX_ATTEMPTS = 5;
    uint256 public constant MAX_PAGE = 100;

    // ---------------------------------------------------------------------------------------------------------------
    // Storage

    uint256 public journeyCount;
    mapping(uint256 => Journey) private _journeys;
    mapping(uint256 => mapping(uint256 => Hop)) private _hops;
    mapping(address => uint256[]) private _byOwner;
    /// @notice keccak256(chainId, txHash) => journeyId * 8 + hop index + 1 (0 = unclaimed).
    mapping(bytes32 => uint256) public claimOf;

    // ---------------------------------------------------------------------------------------------------------------
    // Events

    event JourneyOpened(uint256 indexed id, address indexed owner, bytes32 indexed routeId, uint64 originChain, uint64 destChain, uint128 amountIn, bytes32 recipient, bytes32 planHash, uint8 hopCount);
    event HopPlanned(uint256 indexed id, uint8 indexed index, uint64 fromChain, uint64 toChain, bytes32 bridge);
    event HopSent(uint256 indexed id, uint8 indexed index, bytes32 sourceTx, address by, uint8 attempt);
    event HopDelivered(uint256 indexed id, uint8 indexed index, bytes32 destTx, address by);
    event HopFailed(uint256 indexed id, uint8 indexed index, bytes32 reason, address by);
    event HopRetried(uint256 indexed id, uint8 indexed index, uint8 attempt);
    event JourneyArrived(uint256 indexed id);
    event JourneyAbandoned(uint256 indexed id, bytes32 reason);
    event EditorSet(uint256 indexed id, address indexed editor);
    event OwnershipOffered(uint256 indexed id, address indexed to);
    event OwnershipAccepted(uint256 indexed id, address indexed from, address indexed to);

    // ---------------------------------------------------------------------------------------------------------------
    // Errors

    error UnknownJourney();
    error NotOwner();
    error NotOwnerOrEditor();
    error NotPendingOwner();
    error BadHopCount();
    error BadHop(uint256 index);
    error BrokenChain(uint256 index);
    error ZeroRecipient();
    error ZeroRoute();
    error ZeroHash();
    error BadIndex();
    error WrongJourneyStatus(JourneyStatus status);
    error WrongHopStatus(HopStatus status);
    error PreviousHopOpen(uint256 index);
    error TxAlreadyClaimed(uint256 journeyId, uint256 index);
    error TooManyAttempts();
    error SelfAddress();

    // ---------------------------------------------------------------------------------------------------------------
    // Opening

    /// @notice Opens a journey with its full hop plan. The hops must form one connected path with no hop to itself.
    function open(JourneyInput calldata input) external returns (uint256 id) {
        uint256 n = input.hops.length;
        if (n == 0 || n > MAX_HOPS) revert BadHopCount();
        if (input.routeId == bytes32(0)) revert ZeroRoute();
        if (input.recipient == bytes32(0)) revert ZeroRecipient();
        for (uint256 i; i < n; ++i) {
            HopInput calldata h = input.hops[i];
            if (h.fromChain == 0 || h.toChain == 0 || h.fromChain == h.toChain || h.bridge == bytes32(0)) revert BadHop(i);
            if (i > 0 && input.hops[i - 1].toChain != h.fromChain) revert BrokenChain(i);
        }

        id = ++journeyCount;
        Journey storage j = _journeys[id];
        j.owner = msg.sender;
        j.status = JourneyStatus.Planned;
        j.hopCount = uint8(n);
        j.createdAt = uint64(block.timestamp);
        j.updatedAt = uint64(block.timestamp);
        j.routeId = input.routeId;
        j.recipient = input.recipient;
        j.planHash = input.planHash;
        j.amountIn = input.amountIn;
        j.originChain = input.hops[0].fromChain;
        j.destChain = input.hops[n - 1].toChain;
        _byOwner[msg.sender].push(id);

        emit JourneyOpened(id, msg.sender, input.routeId, j.originChain, j.destChain, input.amountIn, input.recipient, input.planHash, uint8(n));
        for (uint256 i; i < n; ++i) {
            HopInput calldata h = input.hops[i];
            Hop storage hop = _hops[id][i];
            hop.fromChain = h.fromChain;
            hop.toChain = h.toChain;
            hop.bridge = h.bridge;
            hop.status = HopStatus.Planned;
            emit HopPlanned(id, uint8(i), h.fromChain, h.toChain, h.bridge);
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Recording hops

    /// @notice Records the transaction that started hop `index` on its source chain. Hops are recorded in order.
    function recordSent(uint256 id, uint8 index, bytes32 sourceTx) external {
        Journey storage j = _editable(id);
        Hop storage h = _hop(j, id, index);
        if (h.status != HopStatus.Planned) revert WrongHopStatus(h.status);
        if (index > 0 && _hops[id][index - 1].status != HopStatus.Delivered) revert PreviousHopOpen(index - 1);
        if (sourceTx == bytes32(0)) revert ZeroHash();
        if (h.attempts >= MAX_ATTEMPTS) revert TooManyAttempts();
        _claim(h.fromChain, sourceTx, id, index);

        h.status = HopStatus.Sent;
        h.sourceTx = sourceTx;
        h.sentAt = uint64(block.timestamp);
        h.attempts += 1;
        if (j.status == JourneyStatus.Planned) j.status = JourneyStatus.Underway;
        j.updatedAt = uint64(block.timestamp);
        emit HopSent(id, index, sourceTx, msg.sender, h.attempts);
    }

    /// @notice Records the transaction that delivered hop `index` on its destination chain. The last delivery ends the journey.
    function recordDelivered(uint256 id, uint8 index, bytes32 destTx) external {
        Journey storage j = _editable(id);
        Hop storage h = _hop(j, id, index);
        if (h.status != HopStatus.Sent) revert WrongHopStatus(h.status);
        if (destTx == bytes32(0)) revert ZeroHash();
        _claim(h.toChain, destTx, id, index);

        h.status = HopStatus.Delivered;
        h.destTx = destTx;
        h.doneAt = uint64(block.timestamp);
        j.updatedAt = uint64(block.timestamp);
        emit HopDelivered(id, index, destTx, msg.sender);
        if (index + 1 == j.hopCount) {
            j.status = JourneyStatus.Arrived;
            emit JourneyArrived(id);
        }
    }

    /// @notice Marks a sent hop as failed (refunded, stuck, wrong output). Its source transaction stays claimed.
    function recordFailed(uint256 id, uint8 index, bytes32 reason) external {
        Journey storage j = _editable(id);
        Hop storage h = _hop(j, id, index);
        if (h.status != HopStatus.Sent) revert WrongHopStatus(h.status);
        h.status = HopStatus.Failed;
        h.doneAt = uint64(block.timestamp);
        j.updatedAt = uint64(block.timestamp);
        emit HopFailed(id, index, reason, msg.sender);
    }

    /// @notice Puts a failed hop back to Planned so a new source transaction can be recorded. History stays in events.
    function retryHop(uint256 id, uint8 index) external {
        Journey storage j = _editable(id);
        Hop storage h = _hop(j, id, index);
        if (h.status != HopStatus.Failed) revert WrongHopStatus(h.status);
        if (h.attempts >= MAX_ATTEMPTS) revert TooManyAttempts();
        h.status = HopStatus.Planned;
        h.sourceTx = bytes32(0);
        h.sentAt = 0;
        h.doneAt = 0;
        j.updatedAt = uint64(block.timestamp);
        emit HopRetried(id, index, h.attempts + 1);
    }

    /// @notice Ends a journey that will not be finished. Owner only.
    function abandon(uint256 id, bytes32 reason) external {
        Journey storage j = _owned(id);
        if (j.status != JourneyStatus.Planned && j.status != JourneyStatus.Underway) revert WrongJourneyStatus(j.status);
        j.status = JourneyStatus.Abandoned;
        j.updatedAt = uint64(block.timestamp);
        emit JourneyAbandoned(id, reason);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Roles

    /// @notice Sets (or clears with address(0)) a second wallet that may record hops for this journey.
    function setEditor(uint256 id, address editor) external {
        Journey storage j = _owned(id);
        if (editor == j.owner) revert SelfAddress();
        j.editor = editor;
        emit EditorSet(id, editor);
    }

    function offerOwnership(uint256 id, address to) external {
        Journey storage j = _owned(id);
        if (to == j.owner) revert SelfAddress();
        j.pendingOwner = to;
        emit OwnershipOffered(id, to);
    }

    /// @notice The new owner accepts. The editor is cleared so the old owner's helper loses access.
    function acceptOwnership(uint256 id) external {
        Journey storage j = _journeys[id];
        if (j.status == JourneyStatus.None) revert UnknownJourney();
        if (msg.sender != j.pendingOwner || msg.sender == address(0)) revert NotPendingOwner();
        address from = j.owner;
        j.owner = msg.sender;
        j.pendingOwner = address(0);
        j.editor = address(0);
        _byOwner[msg.sender].push(id);
        emit OwnershipAccepted(id, from, msg.sender);
        emit EditorSet(id, address(0));
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Views

    function journey(uint256 id) external view returns (Journey memory) {
        Journey memory j = _journeys[id];
        if (j.status == JourneyStatus.None) revert UnknownJourney();
        return j;
    }

    function hops(uint256 id) external view returns (Hop[] memory out) {
        Journey storage j = _journeys[id];
        if (j.status == JourneyStatus.None) revert UnknownJourney();
        out = new Hop[](j.hopCount);
        for (uint256 i; i < j.hopCount; ++i) out[i] = _hops[id][i];
    }

    /// @notice Journey ids an address has owned (current or past, in order). Check `journey(id).owner` for the current owner.
    function journeysOf(address owner, uint256 offset, uint256 limit) external view returns (uint256[] memory ids, uint256 total) {
        uint256[] storage all = _byOwner[owner];
        total = all.length;
        if (offset >= total) return (new uint256[](0), total);
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        uint256 end = offset + limit > total ? total : offset + limit;
        ids = new uint256[](end - offset);
        for (uint256 i = offset; i < end; ++i) ids[i - offset] = all[i];
    }

    /// @notice Which journey and hop claimed a transaction hash on a chain. found=false when unclaimed.
    function claimed(uint64 chainId, bytes32 txHash) external view returns (bool found, uint256 journeyId, uint256 index) {
        uint256 v = claimOf[_claimKey(chainId, txHash)];
        if (v == 0) return (false, 0, 0);
        return (true, (v - 1) / 8, (v - 1) % 8);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Internal

    function _owned(uint256 id) private view returns (Journey storage j) {
        j = _journeys[id];
        if (j.status == JourneyStatus.None) revert UnknownJourney();
        if (msg.sender != j.owner) revert NotOwner();
    }

    function _editable(uint256 id) private view returns (Journey storage j) {
        j = _journeys[id];
        if (j.status == JourneyStatus.None) revert UnknownJourney();
        if (msg.sender != j.owner && (j.editor == address(0) || msg.sender != j.editor)) revert NotOwnerOrEditor();
        if (j.status != JourneyStatus.Planned && j.status != JourneyStatus.Underway) revert WrongJourneyStatus(j.status);
    }

    function _hop(Journey storage j, uint256 id, uint8 index) private view returns (Hop storage) {
        if (index >= j.hopCount) revert BadIndex();
        return _hops[id][index];
    }

    function _claimKey(uint64 chainId, bytes32 txHash) private pure returns (bytes32) {
        return keccak256(abi.encode(chainId, txHash));
    }

    function _claim(uint64 chainId, bytes32 txHash, uint256 id, uint8 index) private {
        bytes32 key = _claimKey(chainId, txHash);
        uint256 v = claimOf[key];
        if (v != 0) revert TxAlreadyClaimed((v - 1) / 8, (v - 1) % 8);
        claimOf[key] = id * 8 + index + 1;
    }
}
