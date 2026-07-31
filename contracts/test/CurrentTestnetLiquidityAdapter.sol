// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Testnet-only paired-reserve adapter. It proves Current CoFi's
/// governance and accounting path without claiming production market depth.
contract CurrentTestnetLiquidityAdapter {
    using SafeERC20 for IERC20;
    address public immutable vault;
    uint256 public nonce;
    struct Position { address current; address usdc; uint256 currentAmount; uint256 usdcAmount; uint256 shares; }
    mapping(bytes32 => Position) public positions;
    error OnlyVault(); error InvalidAmount(); error MinimumOutputNotMet();

    constructor(address vault_) { if (vault_ == address(0)) revert InvalidAmount(); vault = vault_; }

    function provideLiquidity(address current, address usdc, uint256 currentAmount, uint256 usdcAmount, uint256 minimumShares, bytes calldata) external returns (bytes32 positionId, uint256 shares) {
        if (msg.sender != vault) revert OnlyVault();
        IERC20(current).safeTransferFrom(msg.sender, address(this), currentAmount);
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), usdcAmount);
        shares = currentAmount / 1e12 < usdcAmount ? currentAmount / 1e12 : usdcAmount;
        if (shares < minimumShares) revert MinimumOutputNotMet();
        positionId = keccak256(abi.encode(address(this), block.chainid, nonce++));
        positions[positionId] = Position(current, usdc, currentAmount, usdcAmount, shares);
    }

    function removeLiquidity(bytes32 positionId, uint256 shares, uint256 minimumCurrent, uint256 minimumUsdc, address recipient, bytes calldata) external returns (uint256 currentOut, uint256 usdcOut) {
        if (msg.sender != vault) revert OnlyVault();
        Position storage position = positions[positionId];
        if (shares == 0 || shares > position.shares) revert InvalidAmount();
        currentOut = position.currentAmount * shares / position.shares;
        usdcOut = position.usdcAmount * shares / position.shares;
        if (currentOut < minimumCurrent || usdcOut < minimumUsdc) revert MinimumOutputNotMet();
        position.currentAmount -= currentOut; position.usdcAmount -= usdcOut; position.shares -= shares;
        IERC20(position.current).safeTransfer(recipient, currentOut);
        IERC20(position.usdc).safeTransfer(recipient, usdcOut);
    }
}
