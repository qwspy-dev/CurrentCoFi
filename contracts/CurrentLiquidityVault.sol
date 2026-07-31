// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICurrentLiquidityAdapter {
    function provideLiquidity(
        address current,
        address usdc,
        uint256 currentAmount,
        uint256 usdcAmount,
        uint256 minimumShares,
        bytes calldata data
    ) external returns (bytes32 positionId, uint256 shares);

    function removeLiquidity(
        bytes32 positionId,
        uint256 shares,
        uint256 minimumCurrent,
        uint256 minimumUsdc,
        address recipient,
        bytes calldata data
    ) external returns (uint256 currentOut, uint256 usdcOut);
}

/// @title Current CoFi protocol-owned liquidity vault
/// @notice Custodies fee-funded USDC and $CURRENT, and may deploy the pair only
/// through explicitly allowlisted venue adapters controlled by delayed governance.
contract CurrentLiquidityVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable current;
    IERC20 public immutable usdc;
    mapping(address adapter => bool allowed) public liquidityAdapters;
    mapping(bytes32 positionId => uint256 shares) public positionShares;

    uint256 public totalCurrentDeployed;
    uint256 public totalUsdcDeployed;
    uint256 public totalLiquidityShares;
    uint256 public totalCurrentReturned;
    uint256 public totalUsdcReturned;
    uint256 public totalPositionsCreated;
    uint256 public totalPositionsRemoved;

    error InvalidAddress();
    error InvalidAmount();
    error AdapterNotAllowed();
    error MinimumOutputNotMet();
    error PositionUnavailable();

    event LiquidityAdapterUpdated(address indexed adapter, bool allowed);
    event LiquidityProvided(
        bytes32 indexed positionId,
        address indexed adapter,
        uint256 currentAmount,
        uint256 usdcAmount,
        uint256 shares
    );
    event LiquidityRemoved(
        bytes32 indexed positionId,
        address indexed adapter,
        uint256 shares,
        uint256 currentOut,
        uint256 usdcOut
    );
    event IdleReserveWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    constructor(address initialOwner, address currentToken, address usdcToken) Ownable(initialOwner) {
        if (currentToken == address(0) || usdcToken == address(0)) revert InvalidAddress();
        current = IERC20(currentToken);
        usdc = IERC20(usdcToken);
    }

    function idleReserves() external view returns (uint256 currentAmount, uint256 usdcAmount) {
        return (current.balanceOf(address(this)), usdc.balanceOf(address(this)));
    }

    function setLiquidityAdapter(address adapter, bool allowed) external onlyOwner {
        if (adapter == address(0)) revert InvalidAddress();
        liquidityAdapters[adapter] = allowed;
        emit LiquidityAdapterUpdated(adapter, allowed);
    }

    function provideLiquidity(
        address adapter,
        uint256 currentAmount,
        uint256 usdcAmount,
        uint256 minimumShares,
        bytes calldata data
    ) external onlyOwner nonReentrant whenNotPaused returns (bytes32 positionId, uint256 shares) {
        if (!liquidityAdapters[adapter]) revert AdapterNotAllowed();
        if (currentAmount == 0 || usdcAmount == 0 || minimumShares == 0) revert InvalidAmount();

        current.forceApprove(adapter, currentAmount);
        usdc.forceApprove(adapter, usdcAmount);
        (positionId, shares) = ICurrentLiquidityAdapter(adapter).provideLiquidity(
            address(current), address(usdc), currentAmount, usdcAmount, minimumShares, data
        );
        current.forceApprove(adapter, 0);
        usdc.forceApprove(adapter, 0);
        if (positionId == bytes32(0) || shares < minimumShares) revert MinimumOutputNotMet();

        positionShares[positionId] += shares;
        totalCurrentDeployed += currentAmount;
        totalUsdcDeployed += usdcAmount;
        totalLiquidityShares += shares;
        totalPositionsCreated++;
        emit LiquidityProvided(positionId, adapter, currentAmount, usdcAmount, shares);
    }

    function removeLiquidity(
        address adapter,
        bytes32 positionId,
        uint256 shares,
        uint256 minimumCurrent,
        uint256 minimumUsdc,
        bytes calldata data
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256 currentOut, uint256 usdcOut) {
        if (!liquidityAdapters[adapter]) revert AdapterNotAllowed();
        if (shares == 0 || shares > positionShares[positionId]) revert PositionUnavailable();
        (currentOut, usdcOut) = ICurrentLiquidityAdapter(adapter).removeLiquidity(
            positionId, shares, minimumCurrent, minimumUsdc, address(this), data
        );
        if (currentOut < minimumCurrent || usdcOut < minimumUsdc) revert MinimumOutputNotMet();
        positionShares[positionId] -= shares;
        totalLiquidityShares -= shares;
        totalCurrentReturned += currentOut;
        totalUsdcReturned += usdcOut;
        totalPositionsRemoved++;
        emit LiquidityRemoved(positionId, adapter, shares, currentOut, usdcOut);
    }

    function withdrawIdle(address token, address recipient, uint256 amount) external onlyOwner whenPaused {
        if (recipient == address(0) || (token != address(current) && token != address(usdc))) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IERC20(token).safeTransfer(recipient, amount);
        emit IdleReserveWithdrawn(token, recipient, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
