# InheritableEOA

InheritableEOA is a Solidity contract designed to be delegated to by an EOA using EIP-7702 transactions. It implements inheritance logic where an inheritor can assume full access to an account after proving the account nonce hasn't changed over a specified delay period.

The project verifies account state (nonce, balance, storage root, code hash) against Ethereum's state root using Merkle Patricia Trie proofs and RLP decoding.

## Project Structure

- **src/**: Contains the main contract files.
  - **InheritableEOA.sol**: Main contract implementing EIP-7702 delegated EOA with inheritance logic.
  - **AccountTrie.sol**: Library for verifying account state against Ethereum state roots.
  - **IBlockHashRecorder.sol**: Interface for accessing historical block hashes.
  - **account-abstraction/**: Base account abstraction implementation (BareAccount).

- **lib/**: Contains external libraries.
  - **forge-std/**: Standard library for Foundry.
  - **solidity-merkle-trees/**: Library for MPT and RLP operations.
  - **openzeppelin-contracts/**: OpenZeppelin standard contracts.

- **script/**: Contains deployment scripts.
  - **Deploy.s.sol**: Script for deploying contracts using Foundry.

- **test/**: Contains test files for the project.
  - **hardhat/**: Hardhat-based tests including EIP-7702 delegation tests.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ieoa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize git submodules:
   ```bash
   git submodule update --init --recursive
   ```

4. Compile contracts:
   ```bash
   # Using Foundry
   forge build

   # Or using Hardhat
   npx hardhat compile
   ```

## Testing

Run tests using npm scripts:

```bash
# Run all Hardhat tests
npm test

# Run specific EIP-7702 delegation test
npm run test:nonce

# Run Foundry tests
npm run test:forge
```

## Usage

The `InheritableEOA` contract implements the following key functions:

- **setConfig(address inheritor, uint256 delay)**: Configure the inheritor address and delay period (EOA only).
- **record(bytes memory blockHeaderRlp, bytes[] memory proof)**: Record the account's nonce at a specific block using state proof.
- **claim(bytes memory blockHeaderRlp, bytes[] memory proof)**: Claim inheritance by proving nonce unchanged after delay period.
- **execute(address dest, uint256 value, bytes calldata func)**: Execute calls from the account (available to EOA or claimed inheritor).

For detailed EIP-7702 implementation details, see `EIP7702-IMPLEMENTATION.md`.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.