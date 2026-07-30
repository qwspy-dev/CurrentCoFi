// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Current CoFi testnet token
/// @notice Fixed-supply token used to prove Current CoFi project locking and
/// product-fee routing on Arc testnet. The production allocation remains a
/// separate mainnet launch decision.
contract CurrentToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    constructor(address initialOwner)
        ERC20("Current CoFi", "CURRENT")
        ERC20Permit("Current CoFi")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
}
