// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ICurrentGovernedLiquidityVault {
    function setLiquidityAdapter(address adapter, bool allowed) external;
    function provideLiquidity(address adapter, uint256 currentAmount, uint256 usdcAmount, uint256 minimumShares, bytes calldata data) external returns (bytes32, uint256);
    function removeLiquidity(address adapter, bytes32 positionId, uint256 shares, uint256 minimumCurrent, uint256 minimumUsdc, bytes calldata data) external returns (uint256, uint256);
    function pause() external;
    function unpause() external;
}

/// @notice Public delay and independent cancellation authority for every
/// protocol-owned liquidity adapter change, provision, and removal.
contract CurrentLiquidityGovernor is Ownable, Pausable {
    enum OperationKind { AdapterUpdate, Provide, Remove }
    struct Operation {
        OperationKind kind;
        uint64 executeAfter;
        bool executed;
        bool cancelled;
        address adapter;
        bool allowed;
        bytes32 positionId;
        uint256 amountA;
        uint256 amountB;
        uint256 amountC;
        bytes32 dataHash;
    }

    ICurrentGovernedLiquidityVault public immutable liquidityVault;
    address public guardian;
    uint64 public immutable minimumDelay;
    uint256 public operationNonce;
    uint256 public totalQueued;
    uint256 public totalExecuted;
    uint256 public totalCancelled;
    mapping(bytes32 operationId => Operation operation) public operations;

    error InvalidAddress(); error InvalidDelay(); error InvalidAmount();
    error OperationUnavailable(); error OperationNotReady(); error WrongOperationKind();
    error AdapterDataMismatch(); error NotGuardianOrOwner();

    event OperationQueued(bytes32 indexed operationId, OperationKind indexed kind, address indexed adapter, uint64 executeAfter);
    event OperationCancelled(bytes32 indexed operationId, address indexed cancelledBy);
    event OperationExecuted(bytes32 indexed operationId, address indexed executedBy, bytes32 positionId, uint256 resultA, uint256 resultB);
    event GuardianUpdated(address indexed previousGuardian, address indexed newGuardian);

    constructor(address initialOwner, address guardian_, address vault_, uint64 minimumDelay_) Ownable(initialOwner) {
        if (guardian_ == address(0) || vault_ == address(0)) revert InvalidAddress();
        if (minimumDelay_ < 30 seconds || minimumDelay_ > 30 days) revert InvalidDelay();
        guardian = guardian_;
        liquidityVault = ICurrentGovernedLiquidityVault(vault_);
        minimumDelay = minimumDelay_;
    }

    function queueAdapterUpdate(address adapter, bool allowed) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (adapter == address(0)) revert InvalidAddress();
        id = create(OperationKind.AdapterUpdate, adapter, allowed, bytes32(0), 0, 0, 0, bytes32(0));
    }

    function queueProvide(address adapter, uint256 currentAmount, uint256 usdcAmount, uint256 minimumShares, bytes32 dataHash) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (adapter == address(0)) revert InvalidAddress();
        if (currentAmount == 0 || usdcAmount == 0 || minimumShares == 0) revert InvalidAmount();
        id = create(OperationKind.Provide, adapter, false, bytes32(0), currentAmount, usdcAmount, minimumShares, dataHash);
    }

    function queueRemove(address adapter, bytes32 positionId, uint256 shares, uint256 minimumCurrent, uint256 minimumUsdc, bytes32 dataHash) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (adapter == address(0) || positionId == bytes32(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();
        id = create(OperationKind.Remove, adapter, false, positionId, shares, minimumCurrent, minimumUsdc, dataHash);
    }

    function cancel(bytes32 id) external {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner();
        Operation storage operation = available(id);
        operation.cancelled = true; totalCancelled++;
        emit OperationCancelled(id, msg.sender);
    }

    function executeAdapterUpdate(bytes32 id) external whenNotPaused {
        Operation storage operation = ready(id, OperationKind.AdapterUpdate);
        operation.executed = true; totalExecuted++;
        liquidityVault.setLiquidityAdapter(operation.adapter, operation.allowed);
        emit OperationExecuted(id, msg.sender, bytes32(0), 0, 0);
    }

    function executeProvide(bytes32 id, bytes calldata data) external whenNotPaused returns (bytes32 positionId, uint256 shares) {
        Operation storage operation = ready(id, OperationKind.Provide);
        verifyData(operation, data); operation.executed = true; totalExecuted++;
        (positionId, shares) = liquidityVault.provideLiquidity(operation.adapter, operation.amountA, operation.amountB, operation.amountC, data);
        emit OperationExecuted(id, msg.sender, positionId, shares, 0);
    }

    function executeRemove(bytes32 id, bytes calldata data) external whenNotPaused returns (uint256 currentOut, uint256 usdcOut) {
        Operation storage operation = ready(id, OperationKind.Remove);
        verifyData(operation, data); operation.executed = true; totalExecuted++;
        (currentOut, usdcOut) = liquidityVault.removeLiquidity(operation.adapter, operation.positionId, operation.amountA, operation.amountB, operation.amountC, data);
        emit OperationExecuted(id, msg.sender, operation.positionId, currentOut, usdcOut);
    }

    function emergencyPauseVault() external {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner();
        liquidityVault.pause();
    }
    function unpauseVault() external onlyOwner { liquidityVault.unpause(); }
    function setGuardian(address next) external onlyOwner { if (next == address(0)) revert InvalidAddress(); address old = guardian; guardian = next; emit GuardianUpdated(old, next); }

    function create(OperationKind kind, address adapter, bool allowed, bytes32 positionId, uint256 a, uint256 b, uint256 c, bytes32 dataHash) private returns (bytes32 id) {
        id = keccak256(abi.encode(address(this), block.chainid, kind, adapter, operationNonce++));
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[id] = Operation(kind, executeAfter, false, false, adapter, allowed, positionId, a, b, c, dataHash);
        totalQueued++; emit OperationQueued(id, kind, adapter, executeAfter);
    }
    function available(bytes32 id) private view returns (Operation storage operation) { operation = operations[id]; if (operation.executeAfter == 0 || operation.executed || operation.cancelled) revert OperationUnavailable(); }
    function ready(bytes32 id, OperationKind kind) private view returns (Operation storage operation) { operation = available(id); if (operation.kind != kind) revert WrongOperationKind(); if (block.timestamp < operation.executeAfter) revert OperationNotReady(); }
    function verifyData(Operation storage operation, bytes calldata data) private view { if (keccak256(data) != operation.dataHash) revert AdapterDataMismatch(); }
}
