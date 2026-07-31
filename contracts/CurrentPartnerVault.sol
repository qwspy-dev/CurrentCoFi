// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICurrentPartnerCampaignVault {
    function fundCampaign(bytes32 campaignId, address token, uint256 totalAmount, uint64 expiresAt, uint32 recipientCount, bytes32 merkleRoot) external;
}

/// @notice Transparent reserves contributed by Arc projects and deployed into
/// fully funded Current CoFi campaigns only through delayed governance.
contract CurrentPartnerVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Asset {
        bool approved;
        address treasury;
        bytes32 metadataHash;
        uint256 totalDeposited;
        uint256 totalCampaignFunded;
    }

    ICurrentPartnerCampaignVault public immutable campaignVault;
    mapping(address token => Asset asset) public assets;
    uint256 public approvedAssetCount;
    uint256 public totalDeposits;
    uint256 public totalCampaignsFunded;

    error InvalidAddress(); error InvalidAmount(); error AssetNotApproved(); error UnsupportedTransferBehavior();
    event PartnerAssetUpdated(address indexed token, address indexed treasury, bytes32 metadataHash, bool approved);
    event PartnerTokensDeposited(address indexed token, address indexed contributor, uint256 amount, bytes32 indexed depositReference);
    event PartnerCampaignFunded(address indexed token, bytes32 indexed campaignId, uint256 amount, uint32 recipientCount);
    event IdleReserveReturned(address indexed token, address indexed treasury, uint256 amount);

    constructor(address initialOwner, address campaignVault_) Ownable(initialOwner) {
        if (campaignVault_ == address(0)) revert InvalidAddress();
        campaignVault = ICurrentPartnerCampaignVault(campaignVault_);
    }

    function setPartnerAsset(address token, address treasury, bytes32 metadataHash, bool approved) external onlyOwner {
        if (token == address(0) || treasury == address(0) || metadataHash == bytes32(0)) revert InvalidAddress();
        Asset storage asset = assets[token];
        if (approved && !asset.approved) approvedAssetCount++;
        if (!approved && asset.approved) approvedAssetCount--;
        asset.approved = approved; asset.treasury = treasury; asset.metadataHash = metadataHash;
        emit PartnerAssetUpdated(token, treasury, metadataHash, approved);
    }

    function deposit(address token, uint256 amount, bytes32 depositReference) external nonReentrant whenNotPaused {
        Asset storage asset = assets[token];
        if (!asset.approved) revert AssetNotApproved();
        if (amount == 0 || depositReference == bytes32(0)) revert InvalidAmount();
        IERC20 erc20 = IERC20(token); uint256 beforeBalance = erc20.balanceOf(address(this));
        erc20.safeTransferFrom(msg.sender, address(this), amount);
        if (erc20.balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedTransferBehavior();
        asset.totalDeposited += amount; totalDeposits++;
        emit PartnerTokensDeposited(token, msg.sender, amount, depositReference);
    }

    function fundCampaign(address token, bytes32 campaignId, uint256 amount, uint64 expiresAt, uint32 recipientCount, bytes32 merkleRoot) external onlyOwner nonReentrant whenNotPaused {
        Asset storage asset = assets[token];
        if (!asset.approved) revert AssetNotApproved();
        if (amount == 0 || recipientCount == 0 || campaignId == bytes32(0) || merkleRoot == bytes32(0)) revert InvalidAmount();
        IERC20 erc20 = IERC20(token); erc20.forceApprove(address(campaignVault), amount);
        campaignVault.fundCampaign(campaignId, token, amount, expiresAt, recipientCount, merkleRoot);
        erc20.forceApprove(address(campaignVault), 0);
        asset.totalCampaignFunded += amount; totalCampaignsFunded++;
        emit PartnerCampaignFunded(token, campaignId, amount, recipientCount);
    }

    function returnIdle(address token, uint256 amount) external onlyOwner whenPaused nonReentrant {
        Asset storage asset = assets[token];
        if (asset.treasury == address(0)) revert AssetNotApproved();
        if (amount == 0) revert InvalidAmount();
        IERC20(token).safeTransfer(asset.treasury, amount);
        emit IdleReserveReturned(token, asset.treasury, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
