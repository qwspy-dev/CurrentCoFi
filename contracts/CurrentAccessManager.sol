// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICurrentLockPositions {
    function positions(bytes32 lockId)
        external
        view
        returns (address owner, bytes32 projectId, uint128 amount, uint64 unlockAt, bool withdrawn);
}

/// @title Current CoFi project access manager
/// @notice Turns a project's non-custodial $CURRENT lock into an expiring,
/// publicly verifiable product-access tier.
contract CurrentAccessManager {
    enum AccessTier {
        None,
        Stream,
        Surge,
        Current
    }

    struct ProjectAccess {
        address owner;
        bytes32 lockId;
        AccessTier tier;
        uint64 expiresAt;
    }

    uint256 public constant STREAM_REQUIREMENT = 100 ether;
    uint256 public constant SURGE_REQUIREMENT = 5_000 ether;
    uint256 public constant CURRENT_REQUIREMENT = 25_000 ether;

    ICurrentLockPositions public immutable lockVault;
    uint256 public totalAccessActivations;
    mapping(bytes32 projectId => ProjectAccess access) private projectAccess;

    error InvalidLock();
    error NotLockOwner();
    error ProjectMismatch();
    error LockExpired();
    error RequirementNotMet();
    error AccessWouldNotImprove();

    event ProjectAccessActivated(
        bytes32 indexed projectId,
        bytes32 indexed lockId,
        address indexed owner,
        AccessTier tier,
        uint256 amount,
        uint64 expiresAt
    );

    constructor(address currentLockVault) {
        if (currentLockVault == address(0)) revert InvalidLock();
        lockVault = ICurrentLockPositions(currentLockVault);
    }

    function tierFor(uint256 amount) public pure returns (AccessTier) {
        if (amount >= CURRENT_REQUIREMENT) return AccessTier.Current;
        if (amount >= SURGE_REQUIREMENT) return AccessTier.Surge;
        if (amount >= STREAM_REQUIREMENT) return AccessTier.Stream;
        return AccessTier.None;
    }

    function syncAccess(bytes32 projectId, bytes32 lockId) external returns (AccessTier tier) {
        (
            address lockOwner,
            bytes32 lockedProjectId,
            uint128 amount,
            uint64 unlockAt,
            bool withdrawn
        ) = lockVault.positions(lockId);
        if (lockOwner == address(0) || withdrawn) revert InvalidLock();
        if (lockOwner != msg.sender) revert NotLockOwner();
        if (lockedProjectId != projectId) revert ProjectMismatch();
        if (unlockAt <= block.timestamp) revert LockExpired();
        tier = tierFor(amount);
        if (tier == AccessTier.None) revert RequirementNotMet();

        ProjectAccess memory previous = projectAccess[projectId];
        if (
            previous.expiresAt > block.timestamp &&
            uint8(tier) < uint8(previous.tier)
        ) revert AccessWouldNotImprove();
        if (
            previous.expiresAt > block.timestamp &&
            tier == previous.tier &&
            unlockAt <= previous.expiresAt
        ) revert AccessWouldNotImprove();

        projectAccess[projectId] = ProjectAccess({
            owner: msg.sender,
            lockId: lockId,
            tier: tier,
            expiresAt: unlockAt
        });
        totalAccessActivations++;
        emit ProjectAccessActivated(projectId, lockId, msg.sender, tier, amount, unlockAt);
    }

    function accessOf(bytes32 projectId)
        external
        view
        returns (AccessTier tier, uint64 expiresAt, bytes32 lockId, address owner)
    {
        ProjectAccess memory access = projectAccess[projectId];
        if (access.expiresAt <= block.timestamp) {
            return (AccessTier.None, access.expiresAt, access.lockId, access.owner);
        }
        return (access.tier, access.expiresAt, access.lockId, access.owner);
    }
}
