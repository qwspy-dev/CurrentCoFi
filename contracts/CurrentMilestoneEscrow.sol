// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Current CoFi Milestone Escrow
/// @notice Fully funded ERC-20 agreements with sequential deliverables, explicit
/// proof submission, client approval, timeout recovery, mutual cancellation,
/// and bounded third-party dispute resolution.
contract CurrentMilestoneEscrow is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_MILESTONES = 32;
    uint256 public constant EXPIRY_GRACE_PERIOD = 7 days;

    enum DealState { Empty, Active, Disputed, Completed, Cancelled }
    enum MilestoneState { Pending, Submitted, Released, Disputed, Refunded }

    struct Deal {
        address client;
        address provider;
        address refundAddress;
        address token;
        address arbitrator;
        uint128 totalAmount;
        uint128 remainingAmount;
        uint32 nextMilestone;
        uint32 milestoneCount;
        bytes32 termsHash;
        bool cancellationRequested;
        DealState state;
    }

    struct Milestone {
        uint128 amount;
        uint64 dueAt;
        uint64 submittedAt;
        bytes32 proofHash;
        MilestoneState state;
    }

    struct CreateEscrowInput {
        bytes32 dealId;
        address provider;
        address refundAddress;
        address token;
        address arbitrator;
        uint256[] amounts;
        uint64[] dueDates;
        bytes32 termsHash;
    }

    error AlreadyExists();
    error InvalidParty();
    error InvalidAmount();
    error InvalidMilestones();
    error InvalidDeadline();
    error UnsupportedTransferBehavior();
    error NotActive();
    error NotClient();
    error NotProvider();
    error NotArbitrator();
    error WrongMilestone();
    error InvalidProof();
    error NotSubmitted();
    error NotDisputed();
    error NotExpired();
    error CancellationNotRequested();

    event EscrowCreated(bytes32 indexed dealId, address indexed client, address indexed provider, address token, uint256 amount, uint32 milestoneCount, address arbitrator, bytes32 termsHash);
    event MilestoneSubmitted(bytes32 indexed dealId, uint32 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(bytes32 indexed dealId, uint32 indexed milestoneIndex, uint256 providerAmount, uint256 refundAmount);
    event DisputeRaised(bytes32 indexed dealId, uint32 indexed milestoneIndex, address indexed raisedBy);
    event CancellationRequested(bytes32 indexed dealId);
    event EscrowCancelled(bytes32 indexed dealId, uint256 refundedAmount);

    mapping(bytes32 dealId => Deal deal) public deals;
    mapping(bytes32 dealId => mapping(uint32 index => Milestone milestone)) public milestones;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createEscrow(CreateEscrowInput calldata input) external nonReentrant whenNotPaused {
        if (deals[input.dealId].state != DealState.Empty) revert AlreadyExists();
        if (input.provider == address(0) || input.provider == msg.sender || input.refundAddress == address(0) || input.token == address(0) || input.arbitrator == address(0)) revert InvalidParty();
        if (input.amounts.length == 0 || input.amounts.length > MAX_MILESTONES || input.amounts.length != input.dueDates.length || input.termsHash == bytes32(0)) revert InvalidMilestones();

        uint256 total;
        uint64 previousDeadline;
        for (uint32 index = 0; index < input.amounts.length; index++) {
            if (input.amounts[index] == 0 || input.amounts[index] > type(uint128).max) revert InvalidAmount();
            if (input.dueDates[index] <= block.timestamp || input.dueDates[index] < previousDeadline) revert InvalidDeadline();
            total += input.amounts[index];
            if (total > type(uint128).max) revert InvalidAmount();
            milestones[input.dealId][index] = Milestone(uint128(input.amounts[index]), input.dueDates[index], 0, bytes32(0), MilestoneState.Pending);
            previousDeadline = input.dueDates[index];
        }

        IERC20 asset = IERC20(input.token);
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), total);
        if (asset.balanceOf(address(this)) - beforeBalance != total) revert UnsupportedTransferBehavior();

        Deal storage deal = deals[input.dealId];
        deal.client = msg.sender;
        deal.provider = input.provider;
        deal.refundAddress = input.refundAddress;
        deal.token = input.token;
        deal.arbitrator = input.arbitrator;
        deal.totalAmount = uint128(total);
        deal.remainingAmount = uint128(total);
        deal.milestoneCount = uint32(input.amounts.length);
        deal.termsHash = input.termsHash;
        deal.state = DealState.Active;
        emit EscrowCreated(input.dealId, msg.sender, input.provider, input.token, total, uint32(input.amounts.length), input.arbitrator, input.termsHash);
    }

    function submitMilestone(bytes32 dealId, uint32 milestoneIndex, bytes32 proofHash) external whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.provider != msg.sender) revert NotProvider();
        if (deal.state != DealState.Active) revert NotActive();
        if (milestoneIndex != deal.nextMilestone) revert WrongMilestone();
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        if (milestone.state != MilestoneState.Pending) revert WrongMilestone();
        if (proofHash == bytes32(0)) revert InvalidProof();
        milestone.proofHash = proofHash;
        milestone.submittedAt = uint64(block.timestamp);
        milestone.state = MilestoneState.Submitted;
        emit MilestoneSubmitted(dealId, milestoneIndex, proofHash);
    }

    function approveMilestone(bytes32 dealId, uint32 milestoneIndex) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.client != msg.sender) revert NotClient();
        if (deal.state != DealState.Active) revert NotActive();
        if (milestoneIndex != deal.nextMilestone) revert WrongMilestone();
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        if (milestone.state != MilestoneState.Submitted) revert NotSubmitted();
        _settleMilestone(dealId, milestoneIndex, milestone.amount, 0);
    }

    function raiseDispute(bytes32 dealId, uint32 milestoneIndex) external whenNotPaused {
        Deal storage deal = deals[dealId];
        if (msg.sender != deal.client && msg.sender != deal.provider) revert InvalidParty();
        if (deal.state != DealState.Active) revert NotActive();
        if (milestoneIndex != deal.nextMilestone) revert WrongMilestone();
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        if (milestone.state != MilestoneState.Submitted) revert NotSubmitted();
        milestone.state = MilestoneState.Disputed;
        deal.state = DealState.Disputed;
        emit DisputeRaised(dealId, milestoneIndex, msg.sender);
    }

    function resolveDispute(bytes32 dealId, uint32 milestoneIndex, uint256 providerAward) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.arbitrator != msg.sender) revert NotArbitrator();
        if (deal.state != DealState.Disputed) revert NotDisputed();
        if (milestoneIndex != deal.nextMilestone) revert WrongMilestone();
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        if (milestone.state != MilestoneState.Disputed || providerAward > milestone.amount) revert InvalidAmount();
        _settleMilestone(dealId, milestoneIndex, providerAward, uint256(milestone.amount) - providerAward);
    }

    function refundExpiredMilestone(bytes32 dealId, uint32 milestoneIndex) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.client != msg.sender) revert NotClient();
        if (deal.state != DealState.Active) revert NotActive();
        if (milestoneIndex != deal.nextMilestone) revert WrongMilestone();
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        if (milestone.state != MilestoneState.Pending) revert WrongMilestone();
        if (block.timestamp <= uint256(milestone.dueAt) + EXPIRY_GRACE_PERIOD) revert NotExpired();
        _settleMilestone(dealId, milestoneIndex, 0, milestone.amount);
    }

    function requestCancellation(bytes32 dealId) external whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.client != msg.sender) revert NotClient();
        if (deal.state != DealState.Active) revert NotActive();
        deal.cancellationRequested = true;
        emit CancellationRequested(dealId);
    }

    function acceptCancellation(bytes32 dealId) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.provider != msg.sender) revert NotProvider();
        if (deal.state != DealState.Active) revert NotActive();
        if (!deal.cancellationRequested) revert CancellationNotRequested();
        uint256 refund = deal.remainingAmount;
        deal.remainingAmount = 0;
        deal.state = DealState.Cancelled;
        IERC20(deal.token).safeTransfer(deal.refundAddress, refund);
        emit EscrowCancelled(dealId, refund);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _settleMilestone(bytes32 dealId, uint32 milestoneIndex, uint256 providerAmount, uint256 refundAmount) private {
        Deal storage deal = deals[dealId];
        Milestone storage milestone = milestones[dealId][milestoneIndex];
        uint256 total = providerAmount + refundAmount;
        if (total != milestone.amount || total > deal.remainingAmount) revert InvalidAmount();
        milestone.state = providerAmount == 0 ? MilestoneState.Refunded : MilestoneState.Released;
        deal.remainingAmount -= uint128(total);
        deal.nextMilestone += 1;
        deal.cancellationRequested = false;
        deal.state = deal.nextMilestone == deal.milestoneCount ? DealState.Completed : DealState.Active;
        IERC20 asset = IERC20(deal.token);
        if (providerAmount > 0) asset.safeTransfer(deal.provider, providerAmount);
        if (refundAmount > 0) asset.safeTransfer(deal.refundAddress, refundAmount);
        emit MilestoneReleased(dealId, milestoneIndex, providerAmount, refundAmount);
    }
}
