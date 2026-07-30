// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Testnet-only fixed-rate adapter used to prove Current CoFi's
/// governed fee-to-$CURRENT path before a mainnet liquidity venue exists.
contract CurrentTestnetExchangeAdapter {
    using SafeERC20 for IERC20;

    address public immutable feeRouter;
    uint256 public immutable currentPerUsdcMicro;

    error OnlyFeeRouter();
    error InvalidAddress();
    error MinimumOutputNotMet();

    constructor(address feeRouter_, uint256 currentPerUsdcMicro_) {
        if (feeRouter_ == address(0) || currentPerUsdcMicro_ == 0) revert InvalidAddress();
        feeRouter = feeRouter_;
        currentPerUsdcMicro = currentPerUsdcMicro_;
    }

    function swapExactUSDCForCurrent(
        address usdc,
        address current,
        uint256 amountIn,
        uint256 minimumOut,
        address recipient,
        bytes calldata
    ) external returns (uint256 currentOut) {
        if (msg.sender != feeRouter) revert OnlyFeeRouter();
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amountIn);
        currentOut = amountIn * currentPerUsdcMicro;
        if (currentOut < minimumOut) revert MinimumOutputNotMet();
        IERC20(current).safeTransfer(recipient, currentOut);
    }
}
