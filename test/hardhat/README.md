# EIP-7702 Delegation Test

This test demonstrates setting up an EOA to delegate to InheritableEOA contract code using EIP-7702 transactions.

## Quick Start with Anvil

```bash
# Terminal 1: Start Anvil with Prague hardfork
./scripts/start-anvil.sh

# Terminal 2: Run the test
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil
```

## Test Overview

The `EIP7702-Delegation.test.js` test file demonstrates:

1. **Library Deployment**: Deploys required libraries (EthereumTrieDB, MerklePatricia)
2. **Contract Deployment**: Deploys the InheritableEOA contract
3. **EIP-7702 Authorization**: Creates a proper EIP-7702 authorization signature
4. **Delegation Transaction**: Attempts to send an EIP-7702 transaction to delegate an EOA to the contract

## Running the Test

### With Hardhat (Simulation Mode)

```bash
npx hardhat test test/hardhat/EIP7702-Delegation.test.js
```

**Note**: Hardhat does not currently support EIP-7702, so the test will gracefully skip the actual delegation but demonstrates the correct transaction structure.

### With Anvil (Real EIP-7702 Support) ✅ **RECOMMENDED**

Anvil supports EIP-7702 with the Prague hardfork. Follow these steps for real delegation testing:

1. **Start Anvil with Prague hardfork** (in terminal 1):
   ```bash
   # Using the provided script
   ./scripts/start-anvil.sh

   # Or directly
   anvil --hardfork prague
   ```

2. **Run the test against Anvil** (in terminal 2):
   ```bash
   npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil
   ```

The `anvil` network is already configured in `hardhat.config.js` with:
- URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Mnemonic: `test test test test test test test test test test test junk` (Anvil default)

#### Current Limitation

⚠️ **Note**: The current test uses ethers.js v5 which doesn't fully support EIP-7702 transaction serialization. While the test successfully demonstrates the correct EIP-7702 transaction structure and can send transactions to Anvil, the `authorizationList` field is not properly serialized in the signed transaction.

**Workaround**: For real EIP-7702 testing with Anvil, use Foundry's `cast` tool which has native EIP-7702 support:

```bash
# Example using cast to send EIP-7702 transaction
cast send <EOA_ADDRESS> \
  --auth <CONTRACT_ADDRESS> \
  --private-key <PRIVATE_KEY> \
  --rpc-url http://127.0.0.1:8545 \
  <FUNCTION_SIG> <ARGS>
```

See `cast send --help` for more details on the `--auth` flag.

## What the Test Does

### 1. Library Deployment (`deploy-libs.js`)

The helper script deploys required Merkle Patricia Trie libraries in dependency order:
- `EthereumTrieDB`: Core trie database operations
- `MerklePatricia`: Merkle proof verification (depends on EthereumTrieDB)

### 2. Contract Deployment

Deploys the `InheritableEOA` contract with library linking and a zero address for the BlockHashRecorder (not needed for this simple test).

### 3. EIP-7702 Authorization

Creates a proper EIP-7702 authorization:

```javascript
// Authorization hash format: keccak256(0x05 || chainId || address || nonce)
const authorizationHash = keccak256(concat([
  "0x05",           // EIP-7702 magic byte
  chainId,          // Network chain ID
  contractAddress,  // Contract to delegate to
  nonce             // Account nonce for replay protection
]));

// Sign with EIP-191 personal sign
const signature = await owner.signMessage(authorizationHash);

// Authorization object uses yParity instead of v
const authorization = {
  chainId: 31337,
  address: contractAddress,
  nonce: nonce,
  yParity: v - 27,  // Convert v to yParity
  r: r,
  s: s
};
```

### 4. EIP-7702 Transaction

Sends a type 4 transaction with the authorization:

```javascript
const eip7702Tx = {
  type: 4,                      // EIP-7702 transaction type
  to: owner.address,            // Send to the EOA being delegated
  data: setConfigCalldata,      // Call setConfig function
  authorizationList: [auth],    // Authorization signature
  gasLimit: 500000,
  maxFeePerGas: gasPrice,
  maxPriorityFeePerGas: priorityFee
};
```

## Expected Behavior

### Current (Hardhat without EIP-7702)

The test will:
- ✅ Deploy libraries successfully
- ✅ Deploy InheritableEOA contract
- ✅ Create valid EIP-7702 authorization
- ⚠️  Skip actual delegation (not supported)
- ℹ️  Show transaction structure for future use

### Future (With EIP-7702 Support)

When EIP-7702 is supported, the test will:
- ✅ Deploy libraries and contract
- ✅ Create EIP-7702 authorization
- ✅ Successfully delegate EOA code to contract
- ✅ Execute `setConfig` on delegated address
- ✅ Verify the EOA now has contract code
- ✅ Interact with the EOA as if it's the contract

## Transaction Flow

```
1. Owner EOA signs authorization to delegate to InheritableEOA contract
   ↓
2. Deployer sends EIP-7702 transaction with authorization
   ↓
3. Owner's address code becomes InheritableEOA contract code
   ↓
4. Transaction executes setConfig(inheritor, delay) on owner's address
   ↓
5. Inheritor and delay are stored in owner's storage
   ↓
6. Owner can now use all InheritableEOA functionality from their EOA
```

## EIP-7702 Specification

This test implements EIP-7702 according to the specification:

- **Transaction Type**: 4 (0x04)
- **Authorization Format**: `keccak256(0x05 || chainId || address || nonce)`
- **Signature Format**: Uses `yParity` instead of `v` (0 or 1, not 27/28)
- **Authorization List**: Array of authorization objects in the transaction
- **Execution**: Transaction can call functions on the delegated address

## References

- [EIP-7702: Set EOA account code](https://eips.ethereum.org/EIPS/eip-7702)
- [InheritableEOA Contract](../../src/InheritableEOA.sol)
- [EIP-7702 Implementation Notes](../../EIP7702-IMPLEMENTATION.md)
