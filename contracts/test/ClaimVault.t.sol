// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ClaimVault} from "../src/ClaimVault.sol";

contract MockERC20 {
    string public constant name = "Test USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract ClaimVaultTest is Test {
    uint256 private constant AUTHORIZER_KEY = 0xA11CE;
    uint128 private constant AMOUNT = 25_000_000;

    address private authorizer;
    address private recipient = makeAddr("recipient");
    address private sender = makeAddr("sender");
    bytes32 private claimId = keccak256("claim-1");
    bytes32 private secret = keccak256("unguessable-secret");

    ClaimVault private vault;
    MockERC20 private token;

    function setUp() external {
        authorizer = vm.addr(AUTHORIZER_KEY);
        vault = new ClaimVault(address(this), authorizer);
        token = new MockERC20();

        token.mint(sender, 100_000_000);
        vm.prank(sender);
        token.approve(address(vault), type(uint256).max);
    }

    function testClaimTransfersFundsToAuthorizedRecipient() external {
        _createClaim(block.timestamp + 1 days, true);
        uint64 deadline = uint64(block.timestamp + 10 minutes);
        bytes memory signature = _sign(claimId, recipient, deadline);

        vault.claim(claimId, secret, recipient, deadline, signature);

        assertEq(token.balanceOf(recipient), AMOUNT);
        (,,,,,, ClaimVault.Status status,) = vault.claims(claimId);
        assertEq(uint256(status), uint256(ClaimVault.Status.Claimed));
    }

    function testCannotClaimTwice() external {
        _createClaim(block.timestamp + 1 days, true);
        uint64 deadline = uint64(block.timestamp + 10 minutes);
        bytes memory signature = _sign(claimId, recipient, deadline);

        vault.claim(claimId, secret, recipient, deadline, signature);

        vm.expectRevert(ClaimVault.InvalidStatus.selector);
        vault.claim(claimId, secret, recipient, deadline, signature);
    }

    function testAuthorizationCannotBeRedirected() external {
        _createClaim(block.timestamp + 1 days, true);
        uint64 deadline = uint64(block.timestamp + 10 minutes);
        bytes memory signature = _sign(claimId, recipient, deadline);

        vm.expectRevert(ClaimVault.InvalidAuthorization.selector);
        vault.claim(claimId, secret, makeAddr("attacker"), deadline, signature);
    }

    function testExpiredClaimCanBeRefunded() external {
        uint64 expiry = uint64(block.timestamp + 1 days);
        _createClaim(expiry, false);

        vm.warp(expiry);
        vault.refundExpired(claimId);

        assertEq(token.balanceOf(sender), 100_000_000);
        (,,,,,, ClaimVault.Status status,) = vault.claims(claimId);
        assertEq(uint256(status), uint256(ClaimVault.Status.Refunded));
    }

    function testSenderCanCancelCancelableClaim() external {
        _createClaim(block.timestamp + 1 days, true);

        vm.prank(sender);
        vault.cancel(claimId);

        assertEq(token.balanceOf(sender), 100_000_000);
    }

    function _createClaim(uint256 expiry, bool cancelable) private {
        vm.prank(sender);
        vault.createClaim(
            claimId,
            address(token),
            AMOUNT,
            keccak256(abi.encodePacked(secret)),
            uint64(expiry),
            sender,
            cancelable
        );
    }

    function _sign(bytes32 id, address authorizedRecipient, uint64 deadline)
        private
        view
        returns (bytes memory)
    {
        bytes32 digest = vault.authorizationDigest(id, authorizedRecipient, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHORIZER_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
