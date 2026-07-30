// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockExchangeAdapter {
    using SafeERC20 for IERC20;

    uint256 public immutable rate;

    constructor(uint256 currentPerUSDC) {
        rate = currentPerUSDC;
    }

    function swapExactUSDCForCurrent(
        address usdc,
        address current,
        uint256 amountIn,
        uint256 minimumOut,
        address recipient,
        bytes calldata
    ) external returns (uint256 currentOut) {
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amountIn);
        currentOut = amountIn * rate;
        require(currentOut >= minimumOut, "minimum");
        IERC20(current).safeTransfer(recipient, currentOut);
    }
}
