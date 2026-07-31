// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ICurrentLiquidityVenueRegistry {
    function setVenue(address, bytes32, bytes32, bytes32, uint16, uint16, bool) external;
}

/// @notice Public review delay and independent cancellation for every liquidity
/// venue qualification or revocation.
contract CurrentVenueRegistryGovernor is Ownable, Pausable {
    struct Operation { uint64 executeAfter; bool executed; bool cancelled; address adapter; bytes32 payloadHash; }
    ICurrentLiquidityVenueRegistry public immutable registry;
    address public guardian;
    uint64 public immutable minimumDelay;
    uint256 public operationNonce;
    uint256 public totalQueued;
    uint256 public totalExecuted;
    uint256 public totalCancelled;
    mapping(bytes32 id => Operation operation) public operations;

    error InvalidAddress(); error InvalidDelay(); error InvalidPolicy();
    error OperationUnavailable(); error OperationNotReady(); error PayloadMismatch(); error NotGuardianOrOwner();
    event VenueOperationQueued(bytes32 indexed operationId, address indexed adapter, uint64 executeAfter, bool approved);
    event VenueOperationExecuted(bytes32 indexed operationId, address indexed executedBy);
    event VenueOperationCancelled(bytes32 indexed operationId, address indexed cancelledBy);
    event GuardianUpdated(address indexed previousGuardian, address indexed nextGuardian);

    constructor(address initialOwner, address guardian_, address registry_, uint64 delay_) Ownable(initialOwner) {
        if (guardian_ == address(0) || registry_ == address(0)) revert InvalidAddress();
        if (delay_ < 30 seconds || delay_ > 30 days) revert InvalidDelay();
        guardian = guardian_; registry = ICurrentLiquidityVenueRegistry(registry_); minimumDelay = delay_;
    }

    function queueVenue(address adapter, bytes32 venueId, bytes32 venueNameHash, bytes32 adapterCodeHash, uint16 maxSlippageBps, uint16 maxAllocationBps, bool approved) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (adapter == address(0) || venueId == bytes32(0) || venueNameHash == bytes32(0) || adapterCodeHash == bytes32(0)) revert InvalidAddress();
        if (maxSlippageBps == 0 || maxAllocationBps == 0) revert InvalidPolicy();
        bytes32 payloadHash = keccak256(abi.encode(venueId, venueNameHash, adapterCodeHash, maxSlippageBps, maxAllocationBps, approved));
        id = keccak256(abi.encode(address(this), block.chainid, adapter, operationNonce++));
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[id] = Operation(executeAfter, false, false, adapter, payloadHash); totalQueued++;
        emit VenueOperationQueued(id, adapter, executeAfter, approved);
    }

    function executeVenue(bytes32 id, bytes32 venueId, bytes32 venueNameHash, bytes32 adapterCodeHash, uint16 maxSlippageBps, uint16 maxAllocationBps, bool approved) external whenNotPaused {
        Operation storage operation = available(id);
        if (block.timestamp < operation.executeAfter) revert OperationNotReady();
        if (operation.payloadHash != keccak256(abi.encode(venueId, venueNameHash, adapterCodeHash, maxSlippageBps, maxAllocationBps, approved))) revert PayloadMismatch();
        operation.executed = true; totalExecuted++;
        registry.setVenue(operation.adapter, venueId, venueNameHash, adapterCodeHash, maxSlippageBps, maxAllocationBps, approved);
        emit VenueOperationExecuted(id, msg.sender);
    }

    function cancel(bytes32 id) external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); Operation storage operation = available(id); operation.cancelled = true; totalCancelled++; emit VenueOperationCancelled(id, msg.sender); }
    function pause() external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function setGuardian(address next) external onlyOwner { if (next == address(0)) revert InvalidAddress(); address previous = guardian; guardian = next; emit GuardianUpdated(previous, next); }
    function available(bytes32 id) private view returns (Operation storage operation) { operation = operations[id]; if (operation.executeAfter == 0 || operation.executed || operation.cancelled) revert OperationUnavailable(); }
}
