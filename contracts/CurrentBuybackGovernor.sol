// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICurrentGovernedFeeRouter {
    function setExchangeAdapter(address adapter, bool allowed) external;
    function executeBuyback(
        address adapter,
        uint256 usdcAmount,
        uint256 minimumCurrentOut,
        bytes calldata adapterData
    ) external returns (uint256 currentAmount);
}

/// @title Current CoFi buyback governor
/// @notice Adds a public delay and independent cancellation authority to
/// adapter changes and batched fee-funded $CURRENT purchases.
contract CurrentBuybackGovernor is Ownable, Pausable, ReentrancyGuard {
    enum OperationKind {
        AdapterUpdate,
        Buyback
    }

    struct Operation {
        OperationKind kind;
        uint64 executeAfter;
        bool executed;
        bool cancelled;
        address adapter;
        bool allowed;
        uint256 usdcAmount;
        uint256 minimumCurrentOut;
        bytes32 adapterDataHash;
    }

    ICurrentGovernedFeeRouter public immutable feeRouter;
    address public guardian;
    uint64 public immutable minimumDelay;
    uint256 public operationNonce;
    uint256 public totalQueued;
    uint256 public totalExecuted;
    uint256 public totalCancelled;
    mapping(bytes32 operationId => Operation operation) public operations;

    error InvalidAddress();
    error InvalidDelay();
    error InvalidAmount();
    error OperationUnavailable();
    error OperationNotReady();
    error WrongOperationKind();
    error AdapterDataMismatch();
    error NotGuardianOrOwner();

    event OperationQueued(
        bytes32 indexed operationId,
        OperationKind indexed kind,
        address indexed adapter,
        uint64 executeAfter,
        uint256 usdcAmount,
        uint256 minimumCurrentOut
    );
    event OperationCancelled(bytes32 indexed operationId, address indexed cancelledBy);
    event OperationExecuted(bytes32 indexed operationId, address indexed executedBy, uint256 currentOut);
    event GuardianUpdated(address indexed previousGuardian, address indexed newGuardian);

    constructor(
        address initialOwner,
        address guardian_,
        address currentFeeRouter,
        uint64 minimumDelay_
    ) Ownable(initialOwner) {
        if (guardian_ == address(0) || currentFeeRouter == address(0)) revert InvalidAddress();
        if (minimumDelay_ < 30 seconds || minimumDelay_ > 30 days) revert InvalidDelay();
        guardian = guardian_;
        feeRouter = ICurrentGovernedFeeRouter(currentFeeRouter);
        minimumDelay = minimumDelay_;
    }

    function queueAdapterUpdate(address adapter, bool allowed)
        external
        onlyOwner
        whenNotPaused
        returns (bytes32 operationId)
    {
        if (adapter == address(0)) revert InvalidAddress();
        operationId = nextOperationId(OperationKind.AdapterUpdate, adapter);
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[operationId] = Operation({
            kind: OperationKind.AdapterUpdate,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false,
            adapter: adapter,
            allowed: allowed,
            usdcAmount: 0,
            minimumCurrentOut: 0,
            adapterDataHash: bytes32(0)
        });
        totalQueued++;
        emit OperationQueued(operationId, OperationKind.AdapterUpdate, adapter, executeAfter, 0, 0);
    }

    function queueBuyback(
        address adapter,
        uint256 usdcAmount,
        uint256 minimumCurrentOut,
        bytes32 adapterDataHash
    ) external onlyOwner whenNotPaused returns (bytes32 operationId) {
        if (adapter == address(0)) revert InvalidAddress();
        if (usdcAmount == 0 || minimumCurrentOut == 0) revert InvalidAmount();
        operationId = nextOperationId(OperationKind.Buyback, adapter);
        uint64 executeAfter = uint64(block.timestamp) + minimumDelay;
        operations[operationId] = Operation({
            kind: OperationKind.Buyback,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false,
            adapter: adapter,
            allowed: false,
            usdcAmount: usdcAmount,
            minimumCurrentOut: minimumCurrentOut,
            adapterDataHash: adapterDataHash
        });
        totalQueued++;
        emit OperationQueued(
            operationId,
            OperationKind.Buyback,
            adapter,
            executeAfter,
            usdcAmount,
            minimumCurrentOut
        );
    }

    function cancel(bytes32 operationId) external {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner();
        Operation storage operation = availableOperation(operationId);
        operation.cancelled = true;
        totalCancelled++;
        emit OperationCancelled(operationId, msg.sender);
    }

    function executeAdapterUpdate(bytes32 operationId) external whenNotPaused {
        Operation storage operation = readyOperation(operationId, OperationKind.AdapterUpdate);
        operation.executed = true;
        totalExecuted++;
        feeRouter.setExchangeAdapter(operation.adapter, operation.allowed);
        emit OperationExecuted(operationId, msg.sender, 0);
    }

    function executeBuyback(bytes32 operationId, bytes calldata adapterData)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 currentOut)
    {
        Operation storage operation = readyOperation(operationId, OperationKind.Buyback);
        if (keccak256(adapterData) != operation.adapterDataHash) revert AdapterDataMismatch();
        operation.executed = true;
        totalExecuted++;
        currentOut = feeRouter.executeBuyback(
            operation.adapter,
            operation.usdcAmount,
            operation.minimumCurrentOut,
            adapterData
        );
        emit OperationExecuted(operationId, msg.sender, currentOut);
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0)) revert InvalidAddress();
        address previous = guardian;
        guardian = newGuardian;
        emit GuardianUpdated(previous, newGuardian);
    }

    function pause() external {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner();
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function nextOperationId(OperationKind kind, address adapter) private returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, kind, adapter, operationNonce++));
    }

    function availableOperation(bytes32 operationId) private view returns (Operation storage operation) {
        operation = operations[operationId];
        if (operation.executeAfter == 0 || operation.executed || operation.cancelled) {
            revert OperationUnavailable();
        }
    }

    function readyOperation(bytes32 operationId, OperationKind expected)
        private
        view
        returns (Operation storage operation)
    {
        operation = availableOperation(operationId);
        if (operation.kind != expected) revert WrongOperationKind();
        if (block.timestamp < operation.executeAfter) revert OperationNotReady();
    }
}
