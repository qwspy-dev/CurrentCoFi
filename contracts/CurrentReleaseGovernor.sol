// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ICurrentReleaseRegistry {
    struct ComponentInput { bytes32 componentId; address implementation; bytes32 codeHash; bytes32 versionHash; }
    function applyRelease(bytes32, ComponentInput[] calldata) external returns (bytes32);
    function deactivateCurrentRelease() external;
}

/// @notice Public review delay and independent cancellation for protocol releases.
contract CurrentReleaseGovernor is Ownable, Pausable {
    struct Operation { uint64 executeAfter; bool executed; bool cancelled; uint8 kind; bytes32 payloadHash; }
    ICurrentReleaseRegistry public immutable registry;
    address public guardian;
    uint64 public immutable minimumDelay;
    uint256 public operationNonce;
    uint256 public totalQueued;
    uint256 public totalExecuted;
    uint256 public totalCancelled;
    mapping(bytes32 => Operation) public operations;

    error InvalidAddress(); error InvalidDelay(); error InvalidPayload(); error OperationUnavailable();
    error OperationNotReady(); error PayloadMismatch(); error NotGuardianOrOwner();
    event ReleaseOperationQueued(bytes32 indexed operationId, bytes32 indexed releaseId, uint64 executeAfter, uint256 componentCount);
    event DeactivationQueued(bytes32 indexed operationId, uint64 executeAfter);
    event OperationExecuted(bytes32 indexed operationId, address indexed executedBy);
    event OperationCancelled(bytes32 indexed operationId, address indexed cancelledBy);

    constructor(address initialOwner, address guardian_, address registry_, uint64 delay_) Ownable(initialOwner) {
        if (guardian_ == address(0) || registry_ == address(0)) revert InvalidAddress();
        if (delay_ < 30 seconds || delay_ > 30 days) revert InvalidDelay();
        guardian = guardian_; registry = ICurrentReleaseRegistry(registry_); minimumDelay = delay_;
    }

    function queueRelease(bytes32 releaseId, ICurrentReleaseRegistry.ComponentInput[] calldata components) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (releaseId == bytes32(0) || components.length == 0) revert InvalidPayload();
        bytes32 payloadHash = keccak256(abi.encode(releaseId, components));
        id = keccak256(abi.encode(address(this), block.chainid, operationNonce++));
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[id] = Operation(executeAfter, false, false, 1, payloadHash); totalQueued++;
        emit ReleaseOperationQueued(id, releaseId, executeAfter, components.length);
    }

    function executeRelease(bytes32 id, bytes32 releaseId, ICurrentReleaseRegistry.ComponentInput[] calldata components) external whenNotPaused {
        Operation storage operation = _available(id, 1);
        if (block.timestamp < operation.executeAfter) revert OperationNotReady();
        if (operation.payloadHash != keccak256(abi.encode(releaseId, components))) revert PayloadMismatch();
        operation.executed = true; totalExecuted++;
        registry.applyRelease(releaseId, components);
        emit OperationExecuted(id, msg.sender);
    }

    function queueDeactivation() external onlyOwner whenNotPaused returns (bytes32 id) {
        id = keccak256(abi.encode(address(this), block.chainid, operationNonce++));
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[id] = Operation(executeAfter, false, false, 2, bytes32(0)); totalQueued++;
        emit DeactivationQueued(id, executeAfter);
    }

    function executeDeactivation(bytes32 id) external whenNotPaused {
        Operation storage operation = _available(id, 2);
        if (block.timestamp < operation.executeAfter) revert OperationNotReady();
        operation.executed = true; totalExecuted++;
        registry.deactivateCurrentRelease(); emit OperationExecuted(id, msg.sender);
    }

    function cancel(bytes32 id) external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); Operation storage operation = _available(id, 0); operation.cancelled = true; totalCancelled++; emit OperationCancelled(id, msg.sender); }
    function pause() external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function _available(bytes32 id, uint8 kind) private view returns (Operation storage operation) { operation = operations[id]; if (operation.executeAfter == 0 || operation.executed || operation.cancelled || (kind != 0 && operation.kind != kind)) revert OperationUnavailable(); }
}
