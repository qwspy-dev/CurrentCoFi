// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Canonical, bytecode-bound release manifest for the Current CoFi protocol.
contract CurrentReleaseRegistry is Ownable {
    struct ComponentInput { bytes32 componentId; address implementation; bytes32 codeHash; bytes32 versionHash; }
    struct Component { address implementation; bytes32 codeHash; bytes32 versionHash; uint64 verifiedAt; bool active; }
    struct Release { bytes32 manifestHash; uint64 appliedAt; uint32 componentCount; bool active; }

    bytes32 public currentReleaseId;
    bytes32 public currentManifestHash;
    uint256 public totalReleases;
    mapping(bytes32 => Component) public components;
    mapping(bytes32 => Release) public releases;
    bytes32[] private activeComponentIds;

    error InvalidRelease();
    error InvalidComponent();
    error DuplicateComponent();
    error CodeHashMismatch();
    error ReleaseNotActive();

    event ReleaseApplied(bytes32 indexed releaseId, bytes32 indexed manifestHash, uint256 componentCount);
    event ReleaseDeactivated(bytes32 indexed releaseId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function applyRelease(bytes32 releaseId, ComponentInput[] calldata next) external onlyOwner returns (bytes32 manifestHash) {
        if (releaseId == bytes32(0) || next.length == 0 || next.length > 32) revert InvalidRelease();
        for (uint256 i; i < next.length; i++) {
            ComponentInput calldata item = next[i];
            if (item.componentId == bytes32(0) || item.implementation == address(0) || item.codeHash == bytes32(0) || item.versionHash == bytes32(0)) revert InvalidComponent();
            if (item.implementation.codehash != item.codeHash) revert CodeHashMismatch();
            for (uint256 j; j < i; j++) if (next[j].componentId == item.componentId) revert DuplicateComponent();
        }
        _deactivateCurrent();
        manifestHash = keccak256(abi.encode(block.chainid, releaseId, next));
        for (uint256 i; i < next.length; i++) {
            ComponentInput calldata item = next[i];
            components[item.componentId] = Component(item.implementation, item.codeHash, item.versionHash, uint64(block.timestamp), true);
            activeComponentIds.push(item.componentId);
        }
        currentReleaseId = releaseId;
        currentManifestHash = manifestHash;
        releases[releaseId] = Release(manifestHash, uint64(block.timestamp), uint32(next.length), true);
        totalReleases++;
        emit ReleaseApplied(releaseId, manifestHash, next.length);
    }

    function deactivateCurrentRelease() external onlyOwner {
        if (currentReleaseId == bytes32(0) || !releases[currentReleaseId].active) revert ReleaseNotActive();
        bytes32 releaseId = currentReleaseId;
        _deactivateCurrent();
        currentReleaseId = bytes32(0);
        currentManifestHash = bytes32(0);
        emit ReleaseDeactivated(releaseId);
    }

    function validateComponent(bytes32 componentId) external view returns (bool) {
        Component storage item = components[componentId];
        return item.active && item.implementation != address(0) && item.implementation.codehash == item.codeHash;
    }

    function currentComponentIds() external view returns (bytes32[] memory) { return activeComponentIds; }

    function _deactivateCurrent() private {
        bytes32 prior = currentReleaseId;
        if (prior != bytes32(0)) releases[prior].active = false;
        for (uint256 i; i < activeComponentIds.length; i++) components[activeComponentIds[i]].active = false;
        delete activeComponentIds;
    }
}
