# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Solidity project implementing **InheritableEOA** - a contract designed to be delegated to by an EOA using EIP-7702 transactions. The contract enables inheritance logic where an inheritor can assume full access to an account after proving the account nonce hasn't changed over a specified delay period.

The project verifies account state (nonce, balance, storage root, code hash) against Ethereum's state root using Merkle Patricia Trie proofs and RLP decoding.

## Development Commands

### Testing
```bash
# Run all tests with Hardhat
npm test

# Run specific test (NonceChanged scenario)
npm run test:nonce

# Run Foundry tests
npm run test:forge
```

### Deployment
```bash
# Deploy using Foundry script
npm run deploy
```

### Building
```bash
# Compile contracts with Hardhat
npx hardhat compile

# Compile with Foundry
forge build
```

## Project Architecture

### Core Contracts

**InheritableEOA** (`src/InheritableEOA.sol`)
- Designed for EIP-7702 delegation from EOA to contract
- Implements inheritance with nonce-based inactivity detection
- Uses `BareAccount` as base for execution logic
- Storage variables (`s_inheritor`, `s_delay`, `s_claimed`) can only be set by the EOA (address(this) in EIP-7702 context)
- Key functions:
  - `record()`: Records account nonce/timestamp from a block header + proof
  - `claim()`: Claims inheritance by proving nonce unchanged over delay period
  - `setConfig()`: EOA-only function to configure inheritor and delay
  - `execute()`: Inherited from BareAccount, allows executing calls from the account

**AccountTrie** (`src/AccountTrie.sol`)
- Library for verifying account state against Ethereum state roots
- Uses Merkle Patricia Trie proofs and RLP decoding
- Key functions:
  - `extractFromBlockHeader()`: Extracts block number, timestamp, state root from RLP
  - `verify()`: Verifies account against state root using Merkle proof
  - `decode()`: Decodes RLP account data into nonce/balance/storageRoot/codeHash
  - `verifyNonceTime()`: Combined verification of account nonce and block hash via BlockHashRecorder

**IBlockHashRecorder** (`src/IBlockHashRecorder.sol`)
- Interface for accessing historical block hashes beyond the 256 block limit
- Used by AccountTrie when verifying older blocks

**BareAccount** (`src/account-abstraction/core/BareAccount.sol`)
- Base implementation for account abstraction
- Provides `execute()` function for calling external contracts
- InheritableEOA overrides `_requireForExecute()` to add inheritance permissions

### Dependencies

The project uses git submodules in `lib/`:
- `solidity-merkle-trees`: Merkle Patricia Trie implementation (from polytope-labs)
- `openzeppelin-contracts`: Standard OpenZeppelin contracts
- `forge-std`: Foundry standard library

### Remappings

```
solidity-merkle-trees/=lib/solidity-merkle-trees/src/
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
```

## Dual Build System

This project uses both **Foundry** and **Hardhat**:

- **Foundry** (`foundry.toml`): Primary build tool with IR optimization enabled
  - `via_ir = true` for better optimization
  - `optimizer_runs = 1000`

- **Hardhat** (`hardhat.config.js`): Used for JavaScript-based tests (especially EIP-7702 testing)
  - Test directory: `test/hardhat/`
  - Sources from `src/` directory
  - Optimizer runs: 200

## EIP-7702 Implementation

The project has a complete EIP-7702 implementation (see `EIP7702-IMPLEMENTATION.md`):
- Transaction type 4 with authorization lists
- Proper authorization hash format: `keccak256(0x05 || chainId || address || nonce)`
- yParity instead of v for signatures
- Graceful fallback when EIP-7702 is not supported (current Hardhat environment)
- Tests use real RLP-encoded block headers and Merkle proofs

## Testing Approach

**Hardhat Tests** (`test/hardhat/NonceChanged.test.js`):
- Custom RLP encoder for block headers and arrays
- Tests real blockchain state verification
- Simulates EIP-7702 delegation (with fallback for unsupported environments)
- Uses `eth_getProof` data format for account state verification

**Library Deployment** (`test/hardhat/deploy-libs.js`):
- Deploys Merkle Patricia Trie libraries (MerklePatricia, TrieDB, etc.)
- Required for linking before contract deployment in Hardhat tests

## Key Concepts

### Nonce-Based Inheritance
1. EOA configures inheritor and delay via `setConfig()`
2. Someone calls `record()` with proof of account state at time T
3. After delay period, inheritor calls `claim()` with proof that nonce is unchanged
4. If nonce unchanged, inheritor gains full control via `execute()`

### State Verification Flow
1. Provide RLP-encoded block header
2. Extract state root and verify block hash (via blockhash() or BlockHashRecorder)
3. Verify account state against state root using Merkle proof
4. Decode RLP account data to get nonce/balance/storage/code

### Block Hash Verification
- Recent blocks (< 256): Use `blockhash()` opcode
- Older blocks: Require BlockHashRecorder contract (immutable address set at deployment)

## Important Notes

- The main contract name in README is "AccountVerifier" but the actual implementation is "InheritableEOA"
- AccountTrie is a library, not a deployable contract
- Storage variables use `s_` prefix convention
- Uses Solidity 0.8.30 (Hardhat) and 0.8.0+ (contracts)
- IR compilation required due to complexity of Merkle Patricia operations
