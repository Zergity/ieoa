# InheritableEOA

InheritableEOA is a Solidity contract designed to be delegated to by an EOA using EIP-7702 transactions. It implements inheritance logic where an inheritor can assume full access to an account after proving the account nonce hasn't changed over a specified delay period.

The project verifies account state (nonce, balance, storage root, code hash) against Ethereum's state root using Merkle Patricia Trie proofs and RLP decoding.

## Why InheritableEOA?

- **Zero disruption to normal usage** - The EOA continues to work exactly as before. Send transactions, sign messages, interact with dApps - nothing changes. EIP-7702 delegation is purely additive.

- **Automatic protection against hijacking** - Any regular activity from the EOA (sending a transaction, deploying a contract, etc.) increments the nonce and automatically invalidates any pending inheritance claims. Simply using your wallet cancels hijacking attempts.

- **No trusted third parties** - Inheritance is verified entirely on-chain using Merkle Patricia Trie proofs against Ethereum's state root. No oracles, multisigs, or centralized services required.

- **Configurable and revocable** - The EOA owner can change the inheritor, adjust the delay period, or clear the configuration entirely at any time.

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

### Contract Functions

| Function | Description | Access |
|----------|-------------|--------|
| `setConfig(address inheritor, uint256 delay)` | Configure inheritor and delay period | EOA only |
| `getConfig()` | Returns `(address inheritor, uint256 delay)` | Public |
| `record(bytes blockHeaderRlp, bytes[] proof)` | Record account nonce at a specific block | Anyone |
| `claim(bytes blockHeaderRlp, bytes[] proof)` | Claim inheritance after delay period | Anyone |
| `recordAndClaim(...)` | Record and claim in one transaction | Anyone |
| `execute(address dest, uint256 value, bytes func)` | Execute calls from the account | EOA or claimed inheritor |
| `isClaimed()` | Check if inheritance has been claimed | Public |

### Inheritance Flow

#### Step 1: Delegate EOA to InheritableEOA (EIP-7702)

```bash
# Using Foundry's cast with EIP-7702 authorization
cast send $EOA_ADDRESS --auth $INHERITABLE_EOA_CONTRACT \
  --private-key $EOA_PRIVATE_KEY --rpc-url $RPC_URL
```

After delegation, the EOA address behaves as the InheritableEOA contract while retaining EOA capabilities.

#### Step 2: Configure Inheritance (EOA only)

```solidity
// Call from the EOA itself (msg.sender == address(this) in EIP-7702 context)
InheritableEOA(eoaAddress).setConfig(inheritorAddress, delayInSeconds);

// To clear configuration, pass zero values for both
InheritableEOA(eoaAddress).setConfig(address(0), 0);
```

#### Step 3: Record Initial State

Anyone can call `record()` with a valid block header and Merkle proof to record the account's nonce at that block:

```javascript
// Get block data and account proof
const block = await provider.getBlock(blockNumber);
const proof = await provider.send("eth_getProof", [eoaAddress, [], blockNumber]);

// Encode block header as RLP
const blockHeaderRlp = encodeBlockHeader(block);

// Record the state
await contract.record(blockHeaderRlp, proof.accountProof);
```

#### Step 4: Claim Inheritance

After the delay period has passed and the account nonce remains unchanged:

```javascript
// Get recent block data and proof
const recentBlock = await provider.getBlock(recentBlockNumber);
const recentProof = await provider.send("eth_getProof", [eoaAddress, [], recentBlockNumber]);

// Claim inheritance (proves nonce unchanged over delay period)
await contract.connect(inheritor).claim(recentBlockHeaderRlp, recentProof.accountProof);
```

If successful, the inheritor can now call `execute()` to control the account.

### Old Blocks (Beyond 256 Block Limit)

The `blockhash()` opcode only works for the most recent 256 blocks. For older blocks, use `BlockHashRecorder`:

```solidity
// Record block hash while block is still recent (within 256 blocks)
BlockHashRecorder(recorder).record(blockNumber);

// Later, record() and claim() will automatically use BlockHashRecorder
// when blockhash() returns 0 for blocks older than 256 blocks
```

### Protection Against Premature Inheritance

If the EOA sends any transaction (changing its nonce), the inheritance claim will fail with `NonceChanged` error. This ensures the original owner can always prevent inheritance by simply using their account.

For detailed EIP-7702 implementation details, see `EIP7702-IMPLEMENTATION.md`.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.