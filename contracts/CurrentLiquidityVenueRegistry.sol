// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Mainnet-readiness registry for liquidity adapters. Each approval is
/// bound to exact deployed bytecode, the immutable $CURRENT/USDC pair, a venue
/// identity, and protocol risk ceilings before delayed liquidity governance may use it.
contract CurrentLiquidityVenueRegistry is Ownable {
    struct Venue {
        bool approved;
        bytes32 venueId;
        bytes32 venueNameHash;
        bytes32 adapterCodeHash;
        uint16 maxSlippageBps;
        uint16 maxAllocationBps;
        uint64 activatedAt;
        uint64 updatedAt;
    }

    address public immutable current;
    address public immutable usdc;
    mapping(address adapter => Venue venue) public venues;
    uint256 public approvedVenueCount;
    uint256 public totalVenueApprovals;
    uint256 public totalVenueRevocations;

    error InvalidAddress();
    error InvalidMetadata();
    error InvalidRiskPolicy();
    error AdapterCodeMismatch();
    error VenueNotApproved();
    error PairMismatch();
    error RiskLimitExceeded();

    event VenueUpdated(
        address indexed adapter,
        bytes32 indexed venueId,
        bytes32 venueNameHash,
        bytes32 adapterCodeHash,
        uint16 maxSlippageBps,
        uint16 maxAllocationBps,
        bool approved
    );

    constructor(address initialOwner, address currentToken, address usdcToken) Ownable(initialOwner) {
        if (currentToken == address(0) || usdcToken == address(0) || currentToken == usdcToken) revert InvalidAddress();
        current = currentToken;
        usdc = usdcToken;
    }

    function setVenue(
        address adapter,
        bytes32 venueId,
        bytes32 venueNameHash,
        bytes32 adapterCodeHash,
        uint16 maxSlippageBps,
        uint16 maxAllocationBps,
        bool approved
    ) external onlyOwner {
        if (adapter == address(0)) revert InvalidAddress();
        if (venueId == bytes32(0) || venueNameHash == bytes32(0) || adapterCodeHash == bytes32(0)) revert InvalidMetadata();
        if (maxSlippageBps == 0 || maxSlippageBps > 1_000 || maxAllocationBps == 0 || maxAllocationBps > 5_000) revert InvalidRiskPolicy();
        if (approved && adapter.codehash != adapterCodeHash) revert AdapterCodeMismatch();
        Venue storage venue = venues[adapter];
        if (approved && !venue.approved) { approvedVenueCount++; totalVenueApprovals++; }
        if (!approved && venue.approved) { approvedVenueCount--; totalVenueRevocations++; }
        uint64 activatedAt = venue.activatedAt;
        if (approved && activatedAt == 0) activatedAt = uint64(block.timestamp);
        venues[adapter] = Venue(approved, venueId, venueNameHash, adapterCodeHash, maxSlippageBps, maxAllocationBps, activatedAt, uint64(block.timestamp));
        emit VenueUpdated(adapter, venueId, venueNameHash, adapterCodeHash, maxSlippageBps, maxAllocationBps, approved);
    }

    function validateExecution(
        address adapter,
        address currentToken,
        address usdcToken,
        uint16 requestedSlippageBps,
        uint16 requestedAllocationBps
    ) external view returns (bytes32 venueId) {
        Venue storage venue = venues[adapter];
        if (!venue.approved || adapter.codehash != venue.adapterCodeHash) revert VenueNotApproved();
        if (currentToken != current || usdcToken != usdc) revert PairMismatch();
        if (requestedSlippageBps > venue.maxSlippageBps || requestedAllocationBps > venue.maxAllocationBps) revert RiskLimitExceeded();
        return venue.venueId;
    }
}
