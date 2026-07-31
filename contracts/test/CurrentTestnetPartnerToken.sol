// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract CurrentTestnetPartnerToken is ERC20 {
    constructor(address recipient) ERC20("Current Partner Test Token", "CPT") { _mint(recipient, 1_000_000 ether); }
}
