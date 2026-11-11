// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ElyswapJourneyBook} from "../src/ElyswapJourneyBook.sol";

contract ElyswapJourneyBookTest is Test {
    ElyswapJourneyBook book;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xC0C);

    uint64 constant ELYSIUM = 99901;
    uint64 constant HYPEREVM = 999;
    uint64 constant ROBINHOOD = 4663;
    uint64 constant SOLANA = 792703809;
    bytes32 constant RELAY = "relay";
    bytes32 constant ROUTE_RH = "via-robinhood";

    function setUp() public {
        book = new ElyswapJourneyBook();
    }

    function _twoHops() internal pure returns (ElyswapJourneyBook.JourneyInput memory input) {
        ElyswapJourneyBook.HopInput[] memory h = new ElyswapJourneyBook.HopInput[](2);
        h[0] = ElyswapJourneyBook.HopInput(ELYSIUM, ROBINHOOD, RELAY);
        h[1] = ElyswapJourneyBook.HopInput(ROBINHOOD, HYPEREVM, RELAY);
        input = ElyswapJourneyBook.JourneyInput({routeId: ROUTE_RH, recipient: bytes32(uint256(uint160(address(0xA11CE)))), planHash: keccak256("plan"), amountIn: 5 ether, hops: h});
    }

    function _open() internal returns (uint256 id) {
        vm.prank(alice);
        id = book.open(_twoHops());
    }

    // ------------------------------------------------------------------ open

    function test_open_records_plan() public {
        uint256 id = _open();
        assertEq(id, 1);
        ElyswapJourneyBook.Journey memory j = book.journey(id);
        assertEq(j.owner, alice);
        assertEq(uint8(j.status), uint8(ElyswapJourneyBook.JourneyStatus.Planned));
        assertEq(j.hopCount, 2);
        assertEq(j.originChain, ELYSIUM);
        assertEq(j.destChain, HYPEREVM);
        assertEq(j.amountIn, 5 ether);
        ElyswapJourneyBook.Hop[] memory h = book.hops(id);
        assertEq(h.length, 2);
        assertEq(h[1].fromChain, ROBINHOOD);
        assertEq(uint8(h[0].status), uint8(ElyswapJourneyBook.HopStatus.Planned));
        (uint256[] memory ids, uint256 total) = book.journeysOf(alice, 0, 10);
        assertEq(total, 1);
        assertEq(ids[0], 1);
    }

    function test_open_emits() public {
        vm.expectEmit(true, true, true, true);
        emit ElyswapJourneyBook.JourneyOpened(1, alice, ROUTE_RH, ELYSIUM, HYPEREVM, 5 ether, bytes32(uint256(uint160(address(0xA11CE)))), keccak256("plan"), 2);
        _open();
    }

    function test_open_rejects_no_hops() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.hops = new ElyswapJourneyBook.HopInput[](0);
        vm.expectRevert(ElyswapJourneyBook.BadHopCount.selector);
        book.open(input);
    }

    function test_open_rejects_too_many_hops() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        ElyswapJourneyBook.HopInput[] memory h = new ElyswapJourneyBook.HopInput[](7);
        for (uint64 i; i < 7; ++i) h[i] = ElyswapJourneyBook.HopInput(i + 1, i + 2, RELAY);
        input.hops = h;
        vm.expectRevert(ElyswapJourneyBook.BadHopCount.selector);
        book.open(input);
    }

    function test_open_accepts_six_hops() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        ElyswapJourneyBook.HopInput[] memory h = new ElyswapJourneyBook.HopInput[](6);
        for (uint64 i; i < 6; ++i) h[i] = ElyswapJourneyBook.HopInput(i + 1, i + 2, RELAY);
        input.hops = h;
        uint256 id = book.open(input);
        assertEq(book.journey(id).hopCount, 6);
    }

    function test_open_rejects_broken_path() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.hops[1].fromChain = SOLANA;
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.BrokenChain.selector, 1));
        book.open(input);
    }

    function test_open_rejects_self_hop() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.hops[0].toChain = ELYSIUM;
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.BadHop.selector, 0));
        book.open(input);
    }

    function test_open_rejects_zero_chain_and_bridge() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.hops[0].bridge = bytes32(0);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.BadHop.selector, 0));
        book.open(input);
        input = _twoHops();
        input.hops[1].toChain = 0;
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.BadHop.selector, 1));
        book.open(input);
    }

    function test_open_rejects_zero_route_and_recipient() public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.routeId = bytes32(0);
        vm.expectRevert(ElyswapJourneyBook.ZeroRoute.selector);
        book.open(input);
        input = _twoHops();
        input.recipient = bytes32(0);
        vm.expectRevert(ElyswapJourneyBook.ZeroRecipient.selector);
        book.open(input);
    }

    // ------------------------------------------------------------------ happy path

    function test_full_journey() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.recordSent(id, 0, bytes32(uint256(1)));
        assertEq(uint8(book.journey(id).status), uint8(ElyswapJourneyBook.JourneyStatus.Underway));
        book.recordDelivered(id, 0, bytes32(uint256(2)));
        book.recordSent(id, 1, bytes32(uint256(3)));
        vm.expectEmit(true, false, false, false);
        emit ElyswapJourneyBook.JourneyArrived(id);
        book.recordDelivered(id, 1, bytes32(uint256(4)));
        vm.stopPrank();
        ElyswapJourneyBook.Journey memory j = book.journey(id);
        assertEq(uint8(j.status), uint8(ElyswapJourneyBook.JourneyStatus.Arrived));
        ElyswapJourneyBook.Hop[] memory h = book.hops(id);
        assertEq(h[1].destTx, bytes32(uint256(4)));
        (bool found, uint256 jid, uint256 idx) = book.claimed(ROBINHOOD, bytes32(uint256(3)));
        assertTrue(found);
        assertEq(jid, id);
        assertEq(idx, 1);
    }

    function test_arrived_journey_is_frozen() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.recordSent(id, 0, bytes32(uint256(1)));
        book.recordDelivered(id, 0, bytes32(uint256(2)));
        book.recordSent(id, 1, bytes32(uint256(3)));
        book.recordDelivered(id, 1, bytes32(uint256(4)));
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongJourneyStatus.selector, ElyswapJourneyBook.JourneyStatus.Arrived));
        book.recordFailed(id, 1, "late");
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongJourneyStatus.selector, ElyswapJourneyBook.JourneyStatus.Arrived));
        book.abandon(id, "x");
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ ordering and status rules

    function test_hops_in_order() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.PreviousHopOpen.selector, 0));
        book.recordSent(id, 1, bytes32(uint256(1)));
    }

    function test_deliver_needs_sent() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongHopStatus.selector, ElyswapJourneyBook.HopStatus.Planned));
        book.recordDelivered(id, 0, bytes32(uint256(1)));
    }

    function test_send_twice_reverts() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.recordSent(id, 0, bytes32(uint256(1)));
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongHopStatus.selector, ElyswapJourneyBook.HopStatus.Sent));
        book.recordSent(id, 0, bytes32(uint256(9)));
        vm.stopPrank();
    }

    function test_bad_index() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(ElyswapJourneyBook.BadIndex.selector);
        book.recordSent(id, 2, bytes32(uint256(1)));
    }

    function test_zero_hash() public {
        uint256 id = _open();
        vm.startPrank(alice);
        vm.expectRevert(ElyswapJourneyBook.ZeroHash.selector);
        book.recordSent(id, 0, bytes32(0));
        book.recordSent(id, 0, bytes32(uint256(1)));
        vm.expectRevert(ElyswapJourneyBook.ZeroHash.selector);
        book.recordDelivered(id, 0, bytes32(0));
        vm.stopPrank();
    }

    function test_unknown_journey() public {
        vm.expectRevert(ElyswapJourneyBook.UnknownJourney.selector);
        book.journey(42);
        vm.expectRevert(ElyswapJourneyBook.UnknownJourney.selector);
        book.hops(42);
        vm.expectRevert(ElyswapJourneyBook.UnknownJourney.selector);
        book.recordSent(42, 0, bytes32(uint256(1)));
        vm.expectRevert(ElyswapJourneyBook.UnknownJourney.selector);
        book.acceptOwnership(42);
    }

    // ------------------------------------------------------------------ tx claims

    function test_same_tx_cannot_prove_two_journeys() public {
        uint256 a = _open();
        uint256 b = _open();
        vm.startPrank(alice);
        book.recordSent(a, 0, bytes32(uint256(77)));
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.TxAlreadyClaimed.selector, a, 0));
        book.recordSent(b, 0, bytes32(uint256(77)));
        vm.stopPrank();
    }

    function test_same_hash_on_other_chain_is_separate() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.recordSent(id, 0, bytes32(uint256(5)));
        // Same 32 bytes as a delivery on Robinhood Chain is a different (chain, hash) key.
        book.recordDelivered(id, 0, bytes32(uint256(5)));
        vm.stopPrank();
    }

    function test_other_user_cannot_squat_claim() public {
        uint256 id = _open();
        vm.prank(bob);
        vm.expectRevert(ElyswapJourneyBook.NotOwnerOrEditor.selector);
        book.recordSent(id, 0, bytes32(uint256(1)));
        (bool found,,) = book.claimed(ELYSIUM, bytes32(uint256(1)));
        assertFalse(found);
    }

    // ------------------------------------------------------------------ failure + retry

    function test_fail_and_retry() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.recordSent(id, 0, bytes32(uint256(1)));
        book.recordFailed(id, 0, "refunded");
        assertEq(uint8(book.hops(id)[0].status), uint8(ElyswapJourneyBook.HopStatus.Failed));
        book.retryHop(id, 0);
        ElyswapJourneyBook.Hop memory h = book.hops(id)[0];
        assertEq(uint8(h.status), uint8(ElyswapJourneyBook.HopStatus.Planned));
        assertEq(h.sourceTx, bytes32(0));
        // The failed transaction stays claimed: it cannot be reused for the retry.
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.TxAlreadyClaimed.selector, id, 0));
        book.recordSent(id, 0, bytes32(uint256(1)));
        book.recordSent(id, 0, bytes32(uint256(2)));
        assertEq(book.hops(id)[0].attempts, 2);
        vm.stopPrank();
    }

    function test_retry_needs_failed() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongHopStatus.selector, ElyswapJourneyBook.HopStatus.Planned));
        book.retryHop(id, 0);
    }

    function test_attempt_cap() public {
        uint256 id = _open();
        vm.startPrank(alice);
        for (uint256 i = 1; i <= 5; ++i) {
            book.recordSent(id, 0, bytes32(i));
            book.recordFailed(id, 0, "x");
            if (i < 5) book.retryHop(id, 0);
        }
        vm.expectRevert(ElyswapJourneyBook.TooManyAttempts.selector);
        book.retryHop(id, 0);
        vm.stopPrank();
    }

    function test_fail_needs_sent() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongHopStatus.selector, ElyswapJourneyBook.HopStatus.Planned));
        book.recordFailed(id, 0, "x");
    }

    // ------------------------------------------------------------------ abandon

    function test_abandon_owner_only() public {
        uint256 id = _open();
        vm.prank(alice);
        book.setEditor(id, bob);
        vm.prank(bob);
        vm.expectRevert(ElyswapJourneyBook.NotOwner.selector);
        book.abandon(id, "x");
        vm.prank(alice);
        book.abandon(id, "changed my mind");
        assertEq(uint8(book.journey(id).status), uint8(ElyswapJourneyBook.JourneyStatus.Abandoned));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyswapJourneyBook.WrongJourneyStatus.selector, ElyswapJourneyBook.JourneyStatus.Abandoned));
        book.recordSent(id, 0, bytes32(uint256(1)));
    }

    // ------------------------------------------------------------------ roles

    function test_editor_records_but_cannot_change_roles() public {
        uint256 id = _open();
        vm.prank(alice);
        book.setEditor(id, bob);
        vm.startPrank(bob);
        book.recordSent(id, 0, bytes32(uint256(1)));
        vm.expectRevert(ElyswapJourneyBook.NotOwner.selector);
        book.setEditor(id, carol);
        vm.expectRevert(ElyswapJourneyBook.NotOwner.selector);
        book.offerOwnership(id, bob);
        vm.stopPrank();
    }

    function test_editor_cleared() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.setEditor(id, bob);
        book.setEditor(id, address(0));
        vm.stopPrank();
        vm.prank(bob);
        vm.expectRevert(ElyswapJourneyBook.NotOwnerOrEditor.selector);
        book.recordSent(id, 0, bytes32(uint256(1)));
    }

    function test_editor_cannot_be_owner() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(ElyswapJourneyBook.SelfAddress.selector);
        book.setEditor(id, alice);
    }

    function test_two_step_ownership_clears_editor() public {
        uint256 id = _open();
        vm.startPrank(alice);
        book.setEditor(id, carol);
        book.offerOwnership(id, bob);
        vm.stopPrank();
        vm.prank(carol);
        vm.expectRevert(ElyswapJourneyBook.NotPendingOwner.selector);
        book.acceptOwnership(id);
        vm.prank(bob);
        book.acceptOwnership(id);
        ElyswapJourneyBook.Journey memory j = book.journey(id);
        assertEq(j.owner, bob);
        assertEq(j.editor, address(0));
        assertEq(j.pendingOwner, address(0));
        vm.prank(alice);
        vm.expectRevert(ElyswapJourneyBook.NotOwnerOrEditor.selector);
        book.recordSent(id, 0, bytes32(uint256(1)));
        vm.prank(carol);
        vm.expectRevert(ElyswapJourneyBook.NotOwnerOrEditor.selector);
        book.recordSent(id, 0, bytes32(uint256(1)));
        (, uint256 total) = book.journeysOf(bob, 0, 10);
        assertEq(total, 1);
    }

    function test_offer_to_self_rejected() public {
        uint256 id = _open();
        vm.prank(alice);
        vm.expectRevert(ElyswapJourneyBook.SelfAddress.selector);
        book.offerOwnership(id, alice);
    }

    function test_zero_pending_owner_cannot_accept() public {
        uint256 id = _open();
        vm.prank(address(0));
        vm.expectRevert(ElyswapJourneyBook.NotPendingOwner.selector);
        book.acceptOwnership(id);
    }

    // ------------------------------------------------------------------ funds

    function test_rejects_native_value() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(book).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(book).balance, 0);
    }

    function test_open_is_not_payable() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(book).call{value: 1}(abi.encodeWithSelector(book.open.selector, _twoHops()));
        assertFalse(ok);
    }

    // ------------------------------------------------------------------ paging

    function test_paging() public {
        for (uint256 i; i < 5; ++i) _open();
        (uint256[] memory ids, uint256 total) = book.journeysOf(alice, 3, 10);
        assertEq(total, 5);
        assertEq(ids.length, 2);
        assertEq(ids[0], 4);
        (ids,) = book.journeysOf(alice, 9, 10);
        assertEq(ids.length, 0);
        (ids,) = book.journeysOf(alice, 0, 1_000);
        assertEq(ids.length, 5);
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_path_validation(uint64 a, uint64 b, uint64 c) public {
        ElyswapJourneyBook.JourneyInput memory input = _twoHops();
        input.hops[0] = ElyswapJourneyBook.HopInput(a, b, RELAY);
        input.hops[1] = ElyswapJourneyBook.HopInput(b, c, RELAY);
        bool valid = a != 0 && b != 0 && c != 0 && a != b && b != c;
        if (!valid) vm.expectRevert();
        book.open(input);
    }

    function testFuzz_claims_unique(bytes32 tx1, bytes32 tx2) public {
        vm.assume(tx1 != bytes32(0) && tx2 != bytes32(0));
        uint256 a = _open();
        uint256 b = _open();
        vm.startPrank(alice);
        book.recordSent(a, 0, tx1);
        if (tx1 == tx2) vm.expectRevert();
        book.recordSent(b, 0, tx2);
        vm.stopPrank();
    }
}

/// Invariant: the book never holds a balance and every recorded hop status is consistent with its journey.
contract JourneyHandler is Test {
    ElyswapJourneyBook public book;
    uint256 public opened;
    address[3] actors = [address(0x1), address(0x2), address(0x3)];

    constructor(ElyswapJourneyBook b) {
        book = b;
    }

    function open(uint8 who, uint8 n) external {
        n = uint8(bound(n, 1, 6));
        ElyswapJourneyBook.HopInput[] memory h = new ElyswapJourneyBook.HopInput[](n);
        for (uint64 i; i < n; ++i) h[i] = ElyswapJourneyBook.HopInput(100 + i, 101 + i, "relay");
        vm.prank(actors[who % 3]);
        book.open(ElyswapJourneyBook.JourneyInput("r", bytes32(uint256(1)), bytes32(0), 1, h));
        opened++;
    }

    function step(uint8 who, uint256 id, uint8 index, uint8 action, bytes32 hash) external {
        if (opened == 0) return;
        id = bound(id, 1, opened);
        vm.startPrank(actors[who % 3]);
        if (action % 5 == 0) try book.recordSent(id, index % 6, hash) {} catch {}
        else if (action % 5 == 1) try book.recordDelivered(id, index % 6, hash) {} catch {}
        else if (action % 5 == 2) try book.recordFailed(id, index % 6, hash) {} catch {}
        else if (action % 5 == 3) try book.retryHop(id, index % 6) {} catch {}
        else try book.abandon(id, hash) {} catch {}
        vm.stopPrank();
    }
}

contract ElyswapJourneyBookInvariant is Test {
    ElyswapJourneyBook book;
    JourneyHandler handler;

    function setUp() public {
        book = new ElyswapJourneyBook();
        handler = new JourneyHandler(book);
        targetContract(address(handler));
    }

    function invariant_no_balance() public view {
        assertEq(address(book).balance, 0);
    }

    function invariant_arrived_means_all_delivered() public view {
        uint256 n = book.journeyCount();
        for (uint256 id = 1; id <= n; ++id) {
            ElyswapJourneyBook.Journey memory j = book.journey(id);
            ElyswapJourneyBook.Hop[] memory h = book.hops(id);
            bool all = true;
            uint256 sent;
            for (uint256 i; i < h.length; ++i) {
                if (h[i].status != ElyswapJourneyBook.HopStatus.Delivered) all = false;
                if (h[i].status == ElyswapJourneyBook.HopStatus.Sent || h[i].status == ElyswapJourneyBook.HopStatus.Delivered) sent++;
                // A hop after an undelivered one was never sent.
                if (i > 0 && h[i - 1].status != ElyswapJourneyBook.HopStatus.Delivered) {
                    assertTrue(h[i].status == ElyswapJourneyBook.HopStatus.Planned);
                }
            }
            if (j.status == ElyswapJourneyBook.JourneyStatus.Arrived) assertTrue(all);
            if (all) assertTrue(j.status == ElyswapJourneyBook.JourneyStatus.Arrived);
            if (j.status == ElyswapJourneyBook.JourneyStatus.Planned) assertEq(sent, 0);
        }
    }
}
