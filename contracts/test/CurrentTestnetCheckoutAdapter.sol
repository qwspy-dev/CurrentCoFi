// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Testnet-only fixed-rate CURRENT -> test USDC checkout route. This
/// proves user-controlled token payment and exact merchant settlement without
/// representing production liquidity or a market price.
contract CurrentTestnetCheckoutAdapter {
    using SafeERC20 for IERC20;

    address public immutable router;
    address public immutable current;
    address public immutable usdc;
    uint256 public immutable currentPerUsdcMicro;

    error OnlyRouter();
    error InvalidAddress();
    error RouteUnavailable();
    error QuoteExceeded();

    constructor(address router_, address current_, address usdc_, uint256 currentPerUsdcMicro_) {
        if (router_ == address(0) || current_ == address(0) || usdc_ == address(0) || currentPerUsdcMicro_ == 0) revert InvalidAddress();
        router = router_;
        current = current_;
        usdc = usdc_;
        currentPerUsdcMicro = currentPerUsdcMicro_;
    }

    function quoteExactUSDC(address tokenIn, address usdcToken, uint256 usdcOut) public view returns (uint256 amountIn) {
        if (tokenIn != current || usdcToken != usdc) revert RouteUnavailable();
        amountIn = usdcOut * currentPerUsdcMicro;
    }

    function swapExactUSDC(
        address tokenIn,
        address usdcToken,
        uint256 amountInMaximum,
        uint256 usdcOut,
        address merchant,
        bytes calldata
    ) external returns (uint256 amountIn) {
        if (msg.sender != router) revert OnlyRouter();
        amountIn = quoteExactUSDC(tokenIn, usdcToken, usdcOut);
        if (amountIn > amountInMaximum) revert QuoteExceeded();
        IERC20(current).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(usdc).safeTransfer(merchant, usdcOut);
    }
}
