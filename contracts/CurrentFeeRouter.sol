// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICurrentLockVault {
    function createLock(
        bytes32 lockId,
        bytes32 projectId,
        address beneficiary,
        uint256 amount,
        uint64 unlockAt
    ) external;
}

interface ICurrentBurnable is IERC20 {
    function burn(uint256 amount) external;
}

interface ICurrentExchangeAdapter {
    function swapExactUSDCForCurrent(
        address usdc,
        address current,
        uint256 amountIn,
        uint256 minimumOut,
        address recipient,
        bytes calldata data
    ) external returns (uint256 currentOut);
}

/// @title Current CoFi Fee Router
/// @notice Transparently allocates every USDC product fee and batches the
/// buyback reserve through allowlisted exchange adapters.
contract CurrentFeeRouter is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant BUYBACK_BPS = 3_500;
    uint256 public constant GAS_BPS = 2_500;
    uint256 public constant LIQUIDITY_BPS = 2_000;
    uint256 public constant OPERATIONS_BPS = 2_000;

    uint256 public constant PURCHASE_BURN_BPS = 5_000;
    uint256 public constant PURCHASE_LOCK_BPS = 2_500;
    uint64 public constant PROTOCOL_LOCK_DURATION = 365 days;
    bytes32 public constant PROTOCOL_PROJECT_ID = keccak256("CURRENT_PROTOCOL_RESERVE");

    IERC20 public immutable usdc;
    ICurrentBurnable public immutable current;
    ICurrentLockVault public immutable lockVault;
    address public immutable gasTreasury;
    address public immutable liquidityTreasury;
    address public immutable operationsTreasury;
    address public immutable protocolLockBeneficiary;

    uint256 public totalProductFees;
    uint256 public buybackReserve;
    uint256 public totalBuybackUSDC;
    uint256 public totalCurrentPurchased;
    uint256 public totalCurrentBurned;
    uint256 public totalCurrentProtocolLocked;
    uint256 public buybackNonce;
    mapping(address adapter => bool allowed) public exchangeAdapters;
    mapping(bytes32 feeReference => bool recorded) public feeReferences;

    error DuplicateFeeReference();
    error InvalidAddress();
    error InvalidAmount();
    error AdapterNotAllowed();
    error InsufficientReserve();
    error MinimumOutputNotMet();
    error UnsupportedTransferBehavior();

    event ProductFeeRouted(
        bytes32 indexed feeReference,
        address indexed payer,
        uint256 totalAmount,
        uint256 buybackAmount,
        uint256 gasAmount,
        uint256 liquidityAmount,
        uint256 operationsAmount
    );
    event ExchangeAdapterUpdated(address indexed adapter, bool allowed);
    event BuybackExecuted(
        bytes32 indexed executionId,
        address indexed adapter,
        uint256 usdcAmount,
        uint256 currentAmount,
        uint256 burnedAmount,
        uint256 lockedAmount,
        uint256 liquidityAmount,
        bytes32 protocolLockId
    );

    constructor(
        address initialOwner,
        address usdcToken,
        address currentToken,
        address currentLockVault,
        address gasTreasury_,
        address liquidityTreasury_,
        address operationsTreasury_,
        address protocolLockBeneficiary_
    ) Ownable(initialOwner) {
        if (
            usdcToken == address(0) ||
            currentToken == address(0) ||
            currentLockVault == address(0) ||
            gasTreasury_ == address(0) ||
            liquidityTreasury_ == address(0) ||
            operationsTreasury_ == address(0) ||
            protocolLockBeneficiary_ == address(0)
        ) revert InvalidAddress();
        usdc = IERC20(usdcToken);
        current = ICurrentBurnable(currentToken);
        lockVault = ICurrentLockVault(currentLockVault);
        gasTreasury = gasTreasury_;
        liquidityTreasury = liquidityTreasury_;
        operationsTreasury = operationsTreasury_;
        protocolLockBeneficiary = protocolLockBeneficiary_;
    }

    function routeProductFee(bytes32 feeReference, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (feeReferences[feeReference]) revert DuplicateFeeReference();
        if (amount == 0) revert InvalidAmount();

        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        if (usdc.balanceOf(address(this)) - beforeBalance != amount) {
            revert UnsupportedTransferBehavior();
        }

        uint256 gasAmount = amount * GAS_BPS / BPS;
        uint256 liquidityAmount = amount * LIQUIDITY_BPS / BPS;
        uint256 operationsAmount = amount * OPERATIONS_BPS / BPS;
        uint256 buybackAmount = amount - gasAmount - liquidityAmount - operationsAmount;

        feeReferences[feeReference] = true;
        totalProductFees += amount;
        buybackReserve += buybackAmount;

        usdc.safeTransfer(gasTreasury, gasAmount);
        usdc.safeTransfer(liquidityTreasury, liquidityAmount);
        usdc.safeTransfer(operationsTreasury, operationsAmount);
        emit ProductFeeRouted(
            feeReference,
            msg.sender,
            amount,
            buybackAmount,
            gasAmount,
            liquidityAmount,
            operationsAmount
        );
    }

    function setExchangeAdapter(address adapter, bool allowed) external onlyOwner {
        if (adapter == address(0)) revert InvalidAddress();
        exchangeAdapters[adapter] = allowed;
        emit ExchangeAdapterUpdated(adapter, allowed);
    }

    function executeBuyback(
        address adapter,
        uint256 usdcAmount,
        uint256 minimumCurrentOut,
        bytes calldata adapterData
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256 currentAmount) {
        if (!exchangeAdapters[adapter]) revert AdapterNotAllowed();
        if (usdcAmount == 0 || usdcAmount > buybackReserve) revert InsufficientReserve();

        uint256 currentBefore = current.balanceOf(address(this));
        usdc.safeIncreaseAllowance(adapter, usdcAmount);
        currentAmount = ICurrentExchangeAdapter(adapter).swapExactUSDCForCurrent(
            address(usdc),
            address(current),
            usdcAmount,
            minimumCurrentOut,
            address(this),
            adapterData
        );
        usdc.forceApprove(adapter, 0);
        uint256 verifiedCurrent = current.balanceOf(address(this)) - currentBefore;
        if (verifiedCurrent < minimumCurrentOut || currentAmount != verifiedCurrent) {
            revert MinimumOutputNotMet();
        }

        buybackReserve -= usdcAmount;
        totalBuybackUSDC += usdcAmount;
        totalCurrentPurchased += currentAmount;

        uint256 burnAmount = currentAmount * PURCHASE_BURN_BPS / BPS;
        uint256 lockAmount = currentAmount * PURCHASE_LOCK_BPS / BPS;
        uint256 liquidityAmount = currentAmount - burnAmount - lockAmount;
        current.burn(burnAmount);
        totalCurrentBurned += burnAmount;

        bytes32 executionId = keccak256(abi.encode(address(this), block.chainid, buybackNonce++));
        bytes32 protocolLockId = keccak256(abi.encode(executionId, "protocol-lock"));
        IERC20(address(current)).forceApprove(address(lockVault), lockAmount);
        lockVault.createLock(
            protocolLockId,
            PROTOCOL_PROJECT_ID,
            protocolLockBeneficiary,
            lockAmount,
            uint64(block.timestamp + PROTOCOL_LOCK_DURATION)
        );
        IERC20(address(current)).forceApprove(address(lockVault), 0);
        totalCurrentProtocolLocked += lockAmount;
        IERC20(address(current)).safeTransfer(liquidityTreasury, liquidityAmount);

        emit BuybackExecuted(
            executionId,
            adapter,
            usdcAmount,
            currentAmount,
            burnAmount,
            lockAmount,
            liquidityAmount,
            protocolLockId
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
