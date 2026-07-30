// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Current CoFi Campaign Vault
/// @notice Fully funded, Merkle-allowlisted ERC-20 campaigns with gas-sponsored,
/// recipient-bound claims and recoverable unclaimed balances.
contract CurrentCampaignVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CampaignState {
        Empty,
        Active,
        Completed,
        Refunded,
        Cancelled
    }

    struct Campaign {
        address sender;
        address token;
        uint128 totalAmount;
        uint128 remainingAmount;
        uint64 expiresAt;
        uint32 recipientCount;
        bytes32 merkleRoot;
        CampaignState state;
    }

    error AlreadyExists();
    error InvalidAmount();
    error InvalidExpiration();
    error InvalidMerkleRoot();
    error InvalidRecipientCount();
    error InvalidAuthorizer();
    error UnsupportedTransferBehavior();
    error NotActive();
    error NotExpired();
    error AuthorizationExpired();
    error InvalidProof();
    error InvalidAuthorization();
    error AlreadyClaimed();
    error NotSender();

    event CampaignFunded(
        bytes32 indexed campaignId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint64 expiresAt,
        uint32 recipientCount,
        bytes32 merkleRoot
    );
    event CampaignClaimed(
        bytes32 indexed campaignId,
        uint256 indexed index,
        bytes32 indexed allocationId,
        address recipient,
        address token,
        uint256 amount
    );
    event CampaignRefunded(bytes32 indexed campaignId, address indexed sender, uint256 amount);
    event CampaignCancelled(bytes32 indexed campaignId, address indexed sender, uint256 amount);
    event AuthorizerUpdated(address indexed previousAuthorizer, address indexed newAuthorizer);

    mapping(bytes32 campaignId => Campaign campaign) public campaigns;
    mapping(bytes32 campaignId => mapping(uint256 wordIndex => uint256 claimedWord)) private claimedBitMap;
    address public authorizer;

    constructor(address initialOwner, address initialAuthorizer) Ownable(initialOwner) {
        if (initialAuthorizer == address(0)) revert InvalidAuthorizer();
        authorizer = initialAuthorizer;
    }

    function fundCampaign(
        bytes32 campaignId,
        address token,
        uint256 totalAmount,
        uint64 expiresAt,
        uint32 recipientCount,
        bytes32 merkleRoot
    ) external nonReentrant whenNotPaused {
        if (campaigns[campaignId].state != CampaignState.Empty) revert AlreadyExists();
        if (totalAmount == 0 || totalAmount > type(uint128).max) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiration();
        if (recipientCount == 0) revert InvalidRecipientCount();
        if (merkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        IERC20 asset = IERC20(token);
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), totalAmount);
        if (asset.balanceOf(address(this)) - beforeBalance != totalAmount) {
            revert UnsupportedTransferBehavior();
        }

        campaigns[campaignId] = Campaign({
            sender: msg.sender,
            token: token,
            totalAmount: uint128(totalAmount),
            remainingAmount: uint128(totalAmount),
            expiresAt: expiresAt,
            recipientCount: recipientCount,
            merkleRoot: merkleRoot,
            state: CampaignState.Active
        });

        emit CampaignFunded(campaignId, msg.sender, token, totalAmount, expiresAt, recipientCount, merkleRoot);
    }

    function claim(
        bytes32 campaignId,
        uint256 index,
        bytes32 allocationId,
        uint256 amount,
        address recipient,
        uint64 authorizationExpiresAt,
        bytes32[] calldata merkleProof,
        bytes calldata authorization
    ) external nonReentrant whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.state != CampaignState.Active || block.timestamp >= campaign.expiresAt) revert NotActive();
        if (index >= campaign.recipientCount || amount == 0 || amount > campaign.remainingAmount) revert InvalidAmount();
        if (authorizationExpiresAt < block.timestamp) revert AuthorizationExpired();
        if (isClaimed(campaignId, index)) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, allocationId, amount))));
        if (!MerkleProof.verifyCalldata(merkleProof, campaign.merkleRoot, leaf)) revert InvalidProof();

        bytes32 digest = claimDigest(
            campaignId,
            index,
            allocationId,
            recipient,
            amount,
            authorizationExpiresAt
        );
        if (ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), authorization) != authorizer) {
            revert InvalidAuthorization();
        }

        _setClaimed(campaignId, index);
        campaign.remainingAmount -= uint128(amount);
        if (campaign.remainingAmount == 0) campaign.state = CampaignState.Completed;
        IERC20(campaign.token).safeTransfer(recipient, amount);

        emit CampaignClaimed(campaignId, index, allocationId, recipient, campaign.token, amount);
    }

    function cancel(bytes32 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sender != msg.sender) revert NotSender();
        if (campaign.state != CampaignState.Active) revert NotActive();
        uint256 amount = campaign.remainingAmount;
        campaign.remainingAmount = 0;
        campaign.state = CampaignState.Cancelled;
        IERC20(campaign.token).safeTransfer(campaign.sender, amount);
        emit CampaignCancelled(campaignId, campaign.sender, amount);
    }

    function refund(bytes32 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sender != msg.sender) revert NotSender();
        if (campaign.state != CampaignState.Active) revert NotActive();
        if (block.timestamp < campaign.expiresAt) revert NotExpired();
        uint256 amount = campaign.remainingAmount;
        campaign.remainingAmount = 0;
        campaign.state = CampaignState.Refunded;
        IERC20(campaign.token).safeTransfer(campaign.sender, amount);
        emit CampaignRefunded(campaignId, campaign.sender, amount);
    }

    function isClaimed(bytes32 campaignId, uint256 index) public view returns (bool) {
        uint256 wordIndex = index >> 8;
        uint256 bitIndex = index & 255;
        return claimedBitMap[campaignId][wordIndex] & (1 << bitIndex) != 0;
    }

    function claimDigest(
        bytes32 campaignId,
        uint256 index,
        bytes32 allocationId,
        address recipient,
        uint256 amount,
        uint64 authorizationExpiresAt
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                address(this),
                block.chainid,
                campaignId,
                index,
                allocationId,
                recipient,
                amount,
                authorizationExpiresAt
            )
        );
    }

    function setAuthorizer(address nextAuthorizer) external onlyOwner {
        if (nextAuthorizer == address(0)) revert InvalidAuthorizer();
        address previous = authorizer;
        authorizer = nextAuthorizer;
        emit AuthorizerUpdated(previous, nextAuthorizer);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setClaimed(bytes32 campaignId, uint256 index) private {
        uint256 wordIndex = index >> 8;
        uint256 bitIndex = index & 255;
        claimedBitMap[campaignId][wordIndex] |= 1 << bitIndex;
    }
}
