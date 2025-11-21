// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice Re-export BlockHashRecorder from submodule for Hardhat compilation
 * @dev This file exists so Hardhat will compile BlockHashRecorder and create
 *      artifacts for it, allowing test files to use ethers.getContractFactory()
 *      Without this, Hardhat won't compile contracts outside the src/ directory
 */
import {BlockHashRecorder} from "../lib/block-hash-recorder/src/BlockHashRecorder.sol";
