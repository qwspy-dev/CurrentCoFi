// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Current CoFi Lock Vault
/// @notice Non-custodial, time-bound $CURRENT positions for projects, users,
/// and protocol-owned reserves.
contract CurrentLockVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant MIN_LOCK_DURATION = 1 days;
    uint64 public constant MAX_LOCK_DURATION = 730 days;

    struct LockPosition {
        address owner;
        bytes32 projectId;
        uint128 amount;
        uint64 unlockAt;
        bool withdrawn;
    }

    IERC20 public immutable current;
    uint256 public totalLocked;
    mapping(bytes32 lockId => LockPosition position) public positions;

    error AlreadyExists();
    error InvalidAmount();
    error InvalidBeneficiary();
    error InvalidUnlockTime();
    error NotPositionOwner();
    error PositionUnavailable();
    error PositionStillLocked();
    error UnsupportedTransferBehavior();

    event CurrentLocked(
        bytes32 indexed lockId,
        bytes32 indexed projectId,
        address indexed owner,
        address funder,
        uint256 amount,
        uint64 unlockAt
    );
    event CurrentUnlocked(bytes32 indexed lockId, address indexed owner, uint256 amount);

    constructor(address initialOwner, address currentToken) Ownable(initialOwner) {
        if (currentToken == address(0)) revert InvalidBeneficiary();
        current = IERC20(currentToken);
    }

    function createLock(
        bytes32 lockId,
        bytes32 projectId,
        address beneficiary,
        uint256 amount,
        uint64 unlockAt
    ) external nonReentrant whenNotPaused {
        if (positions[lockId].owner != address(0)) revert AlreadyExists();
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (
            unlockAt < block.timestamp + MIN_LOCK_DURATION ||
            unlockAt > block.timestamp + MAX_LOCK_DURATION
        ) revert InvalidUnlockTime();

        uint256 beforeBalance = current.balanceOf(address(this));
        current.safeTransferFrom(msg.sender, address(this), amount);
        if (current.balanceOf(address(this)) - beforeBalance != amount) {
            revert UnsupportedTransferBehavior();
        }

        positions[lockId] = LockPosition({
            owner: beneficiary,
            projectId: projectId,
            amount: uint128(amount),
            unlockAt: unlockAt,
            withdrawn: false
        });
        totalLocked += amount;
        emit CurrentLocked(lockId, projectId, beneficiary, msg.sender, amount, unlockAt);
    }

    function withdraw(bytes32 lockId) external nonReentrant {
        LockPosition storage position = positions[lockId];
        if (position.owner != msg.sender) revert NotPositionOwner();
        if (position.withdrawn || position.amount == 0) revert PositionUnavailable();
        if (block.timestamp < position.unlockAt) revert PositionStillLocked();

        uint256 amount = position.amount;
        position.withdrawn = true;
        totalLocked -= amount;
        current.safeTransfer(msg.sender, amount);
        emit CurrentUnlocked(lockId, msg.sender, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
