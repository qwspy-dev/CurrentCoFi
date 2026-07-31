// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ICurrentGovernedPartnerVault {
    function setPartnerAsset(address token, address treasury, bytes32 metadataHash, bool approved) external;
    function fundCampaign(address token, bytes32 campaignId, uint256 amount, uint64 expiresAt, uint32 recipientCount, bytes32 merkleRoot) external;
    function returnIdle(address token, uint256 amount) external;
    function pause() external;
    function unpause() external;
}

contract CurrentPartnerGovernor is Ownable, Pausable {
    enum OperationKind { AssetUpdate, FundCampaign, ReturnIdle }
    struct Operation { OperationKind kind; uint64 executeAfter; bool executed; bool cancelled; address token; bytes32 payloadHash; }
    ICurrentGovernedPartnerVault public immutable partnerVault;
    address public guardian; uint64 public immutable minimumDelay; uint256 public operationNonce; uint256 public totalQueued; uint256 public totalExecuted; uint256 public totalCancelled;
    mapping(bytes32 id => Operation operation) public operations;
    error InvalidAddress(); error InvalidDelay(); error InvalidAmount(); error OperationUnavailable(); error OperationNotReady(); error WrongOperationKind(); error NotGuardianOrOwner();
    event OperationQueued(bytes32 indexed operationId, OperationKind indexed kind, address indexed token, uint64 executeAfter, bytes32 campaignId, uint256 amount);
    event OperationCancelled(bytes32 indexed operationId, address indexed cancelledBy);
    event OperationExecuted(bytes32 indexed operationId, address indexed executedBy);
    event GuardianUpdated(address indexed previousGuardian, address indexed nextGuardian);

    constructor(address initialOwner, address guardian_, address vault_, uint64 delay_) Ownable(initialOwner) {
        if (guardian_ == address(0) || vault_ == address(0)) revert InvalidAddress();
        if (delay_ < 30 seconds || delay_ > 30 days) revert InvalidDelay();
        guardian = guardian_; partnerVault = ICurrentGovernedPartnerVault(vault_); minimumDelay = delay_;
    }

    function queueAssetUpdate(address token, address treasury, bytes32 metadataHash, bool allowed) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (token == address(0) || treasury == address(0) || metadataHash == bytes32(0)) revert InvalidAddress();
        id = create(OperationKind.AssetUpdate, token, keccak256(abi.encode(treasury, metadataHash, allowed)));
    }
    function queueCampaign(address token, bytes32 campaignId, uint256 amount, uint64 expiresAt, uint32 recipientCount, bytes32 merkleRoot) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (token == address(0) || campaignId == bytes32(0) || merkleRoot == bytes32(0)) revert InvalidAddress();
        if (amount == 0 || recipientCount == 0) revert InvalidAmount();
        id = create(OperationKind.FundCampaign, token, keccak256(abi.encode(campaignId, amount, expiresAt, recipientCount, merkleRoot)));
    }
    function queueReturn(address token, uint256 amount) external onlyOwner whenNotPaused returns (bytes32 id) {
        if (token == address(0)) revert InvalidAddress(); if (amount == 0) revert InvalidAmount();
        id = create(OperationKind.ReturnIdle, token, keccak256(abi.encode(amount)));
    }
    function cancel(bytes32 id) external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); Operation storage op = available(id); op.cancelled = true; totalCancelled++; emit OperationCancelled(id, msg.sender); }
    function executeAssetUpdate(bytes32 id, address treasury, bytes32 metadataHash, bool allowed) external whenNotPaused { Operation storage op = ready(id, OperationKind.AssetUpdate, keccak256(abi.encode(treasury, metadataHash, allowed))); op.executed = true; totalExecuted++; partnerVault.setPartnerAsset(op.token, treasury, metadataHash, allowed); emit OperationExecuted(id, msg.sender); }
    function executeCampaign(bytes32 id, bytes32 campaignId, uint256 amount, uint64 expiresAt, uint32 recipientCount, bytes32 merkleRoot) external whenNotPaused { Operation storage op = ready(id, OperationKind.FundCampaign, keccak256(abi.encode(campaignId, amount, expiresAt, recipientCount, merkleRoot))); op.executed = true; totalExecuted++; partnerVault.fundCampaign(op.token, campaignId, amount, expiresAt, recipientCount, merkleRoot); emit OperationExecuted(id, msg.sender); }
    function executeReturn(bytes32 id, uint256 amount) external whenNotPaused { Operation storage op = ready(id, OperationKind.ReturnIdle, keccak256(abi.encode(amount))); op.executed = true; totalExecuted++; partnerVault.returnIdle(op.token, amount); emit OperationExecuted(id, msg.sender); }
    function emergencyPauseVault() external { if (msg.sender != guardian && msg.sender != owner()) revert NotGuardianOrOwner(); partnerVault.pause(); }
    function unpauseVault() external onlyOwner { partnerVault.unpause(); }
    function setGuardian(address next) external onlyOwner { if (next == address(0)) revert InvalidAddress(); address previous = guardian; guardian = next; emit GuardianUpdated(previous, next); }
    function create(OperationKind kind, address token, bytes32 payloadHash) private returns (bytes32 id) { id = keccak256(abi.encode(address(this), block.chainid, kind, token, operationNonce++)); operations[id] = Operation(kind, uint64(block.timestamp) + minimumDelay, false, false, token, payloadHash); totalQueued++; emit OperationQueued(id, kind, token, operations[id].executeAfter, bytes32(0), 0); }
    function available(bytes32 id) private view returns (Operation storage op) { op = operations[id]; if (op.executeAfter == 0 || op.executed || op.cancelled) revert OperationUnavailable(); }
    function ready(bytes32 id, OperationKind kind, bytes32 payloadHash) private view returns (Operation storage op) { op = available(id); if (op.kind != kind || op.payloadHash != payloadHash) revert WrongOperationKind(); if (block.timestamp < op.executeAfter) revert OperationNotReady(); }
}
