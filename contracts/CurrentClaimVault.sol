// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Current CoFi Claim Vault
/// @notice Fully funded, expiring ERC-20 claim links with recipient-bound authorizations.
/// @dev The owner can pause new funding and claims or rotate the authorization signer,
///      but cannot withdraw a sender's distribution.
contract CurrentClaimVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum DistributionState {
        Empty,
        Active,
        Claimed,
        Refunded,
        Cancelled
    }

    struct Distribution {
        address sender;
        address token;
        uint128 amount;
        uint64 expiresAt;
        bytes32 secretHash;
        DistributionState state;
    }

    error AlreadyExists();
    error InvalidAmount();
    error InvalidExpiration();
    error InvalidSecretHash();
    error InvalidAuthorizer();
    error UnsupportedTransferBehavior();
    error NotActive();
    error NotExpired();
    error AuthorizationExpired();
    error InvalidSecret();
    error InvalidAuthorization();
    error NotSender();

    event DistributionFunded(
        bytes32 indexed distributionId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint64 expiresAt
    );
    event DistributionClaimed(
        bytes32 indexed distributionId,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );
    event DistributionRefunded(bytes32 indexed distributionId, address indexed sender, uint256 amount);
    event DistributionCancelled(bytes32 indexed distributionId, address indexed sender, uint256 amount);
    event AuthorizerUpdated(address indexed previousAuthorizer, address indexed newAuthorizer);

    mapping(bytes32 distributionId => Distribution distribution) public distributions;
    address public authorizer;

    constructor(address initialOwner, address initialAuthorizer) Ownable(initialOwner) {
        if (initialAuthorizer == address(0)) revert InvalidAuthorizer();
        authorizer = initialAuthorizer;
    }

    function fundDistribution(
        bytes32 distributionId,
        address token,
        uint256 amount,
        uint64 expiresAt,
        bytes32 secretHash
    ) external nonReentrant whenNotPaused {
        if (distributions[distributionId].state != DistributionState.Empty) revert AlreadyExists();
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiration();
        if (secretHash == bytes32(0)) revert InvalidSecretHash();

        IERC20 asset = IERC20(token);
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), amount);
        if (asset.balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedTransferBehavior();

        distributions[distributionId] = Distribution({
            sender: msg.sender,
            token: token,
            amount: uint128(amount),
            expiresAt: expiresAt,
            secretHash: secretHash,
            state: DistributionState.Active
        });
        emit DistributionFunded(distributionId, msg.sender, token, amount, expiresAt);
    }

    function claim(
        bytes32 distributionId,
        bytes32 secret,
        address recipient,
        uint64 authorizationDeadline,
        bytes calldata authorization
    ) external nonReentrant whenNotPaused {
        Distribution storage distribution = distributions[distributionId];
        if (distribution.state != DistributionState.Active) revert NotActive();
        if (block.timestamp >= distribution.expiresAt) revert NotActive();
        if (block.timestamp > authorizationDeadline) revert AuthorizationExpired();
        if (keccak256(abi.encodePacked(secret)) != distribution.secretHash) revert InvalidSecret();
        if (
            ECDSA.recover(
                MessageHashUtils.toEthSignedMessageHash(
                    claimDigest(distributionId, recipient, authorizationDeadline)
                ),
                authorization
            ) != authorizer
        ) revert InvalidAuthorization();

        distribution.state = DistributionState.Claimed;
        IERC20(distribution.token).safeTransfer(recipient, distribution.amount);
        emit DistributionClaimed(distributionId, recipient, distribution.token, distribution.amount);
    }

    function refund(bytes32 distributionId) external nonReentrant {
        Distribution storage distribution = distributions[distributionId];
        if (distribution.state != DistributionState.Active) revert NotActive();
        if (msg.sender != distribution.sender) revert NotSender();
        if (block.timestamp < distribution.expiresAt) revert NotExpired();

        distribution.state = DistributionState.Refunded;
        IERC20(distribution.token).safeTransfer(distribution.sender, distribution.amount);
        emit DistributionRefunded(distributionId, distribution.sender, distribution.amount);
    }

    function cancel(bytes32 distributionId) external nonReentrant {
        Distribution storage distribution = distributions[distributionId];
        if (distribution.state != DistributionState.Active) revert NotActive();
        if (msg.sender != distribution.sender) revert NotSender();

        distribution.state = DistributionState.Cancelled;
        IERC20(distribution.token).safeTransfer(distribution.sender, distribution.amount);
        emit DistributionCancelled(distributionId, distribution.sender, distribution.amount);
    }

    function claimDigest(
        bytes32 distributionId,
        address recipient,
        uint64 authorizationDeadline
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(address(this), block.chainid, distributionId, recipient, authorizationDeadline)
        );
    }

    function setAuthorizer(address newAuthorizer) external onlyOwner {
        if (newAuthorizer == address(0)) revert InvalidAuthorizer();
        emit AuthorizerUpdated(authorizer, newAuthorizer);
        authorizer = newAuthorizer;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
