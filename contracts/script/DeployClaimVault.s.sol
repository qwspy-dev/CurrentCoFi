// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {ClaimVault} from "../src/ClaimVault.sol";

contract DeployClaimVault is Script {
    function run() external returns (ClaimVault vault) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address authorizer = vm.envAddress("CLAIM_AUTHORIZER_ADDRESS");

        vm.startBroadcast(deployerKey);
        vault = new ClaimVault(deployer, authorizer);
        vm.stopBroadcast();
    }
}
