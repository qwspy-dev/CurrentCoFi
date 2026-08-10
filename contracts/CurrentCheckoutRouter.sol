// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICurrentCheckoutAdapter {
    function quoteExactUSDC(address tokenIn, address usdc, uint256 usdcOut) external view returns (uint256 amountIn);
    function swapExactUSDC(
        address tokenIn,
        address usdc,
        uint256 amountInMaximum,
        uint256 usdcOut,
        address merchant,
        bytes calldata routeData
    ) external returns (uint256 amountIn);
}

/// @notice Non-custodial checkout settlement boundary. A customer approves an
/// exact input ceiling, an allowlisted adapter settles the merchant's exact USDC
/// price, and unused input is returned in the same transaction.
contract CurrentCheckoutRouter is Ownable {
    using SafeERC20 for IERC20;

    address public immutable usdc;
    mapping(address adapter => bool approved) public adapters;
    mapping(address token => mapping(address adapter => bool approved)) public routes;

    uint256 public totalSettlements;
    uint256 public totalUSDCSettled;

    error InvalidAddress();
    error InvalidAmount();
    error RouteUnavailable();
    error QuoteExceeded();
    error SettlementExpired();
    error MerchantUnderpaid();

    event AdapterUpdated(address indexed adapter, bool approved);
    event RouteUpdated(address indexed token, address indexed adapter, bool approved);
    event CheckoutSettled(
        bytes32 indexed paymentId,
        address indexed customer,
        address indexed merchant,
        address tokenIn,
        uint256 amountIn,
        uint256 usdcOut,
        address adapter
    );

    constructor(address initialOwner, address usdcToken) Ownable(initialOwner) {
        if (usdcToken == address(0)) revert InvalidAddress();
        usdc = usdcToken;
    }

    function setAdapter(address adapter, bool approved) external onlyOwner {
        if (adapter == address(0) || (approved && adapter.code.length == 0)) revert InvalidAddress();
        adapters[adapter] = approved;
        emit AdapterUpdated(adapter, approved);
    }

    function setRoute(address token, address adapter, bool approved) external onlyOwner {
        if (token == address(0) || adapter == address(0)) revert InvalidAddress();
        if (approved && !adapters[adapter]) revert RouteUnavailable();
        routes[token][adapter] = approved;
        emit RouteUpdated(token, adapter, approved);
    }

    function quote(address tokenIn, uint256 usdcOut, address adapter) external view returns (uint256 amountIn) {
        if (usdcOut == 0) revert InvalidAmount();
        if (!adapters[adapter] || !routes[tokenIn][adapter]) revert RouteUnavailable();
        amountIn = ICurrentCheckoutAdapter(adapter).quoteExactUSDC(tokenIn, usdc, usdcOut);
        if (amountIn == 0) revert RouteUnavailable();
    }

    function settleExactUSDC(
        bytes32 paymentId,
        address tokenIn,
        uint256 amountInMaximum,
        uint256 usdcOut,
        address merchant,
        uint64 deadline,
        address adapter,
        bytes calldata routeData
    ) external returns (uint256 amountIn) {
        if (paymentId == bytes32(0) || merchant == address(0) || tokenIn == address(0)) revert InvalidAddress();
        if (amountInMaximum == 0 || usdcOut == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert SettlementExpired();
        if (!adapters[adapter] || !routes[tokenIn][adapter]) revert RouteUnavailable();

        IERC20 input = IERC20(tokenIn);
        input.safeTransferFrom(msg.sender, address(this), amountInMaximum);
        input.forceApprove(adapter, amountInMaximum);
        uint256 beforeBalance = IERC20(usdc).balanceOf(merchant);
        amountIn = ICurrentCheckoutAdapter(adapter).swapExactUSDC(
            tokenIn, usdc, amountInMaximum, usdcOut, merchant, routeData
        );
        input.forceApprove(adapter, 0);
        if (amountIn > amountInMaximum) revert QuoteExceeded();
        if (IERC20(usdc).balanceOf(merchant) < beforeBalance + usdcOut) revert MerchantUnderpaid();
        if (amountInMaximum > amountIn) input.safeTransfer(msg.sender, amountInMaximum - amountIn);

        totalSettlements++;
        totalUSDCSettled += usdcOut;
        emit CheckoutSettled(paymentId, msg.sender, merchant, tokenIn, amountIn, usdcOut, adapter);
    }
}
