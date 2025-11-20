# EIP-7702 Implementation with Cast

## ✅ Successfully Implemented

The project now uses `cast send --auth` for EIP-7702 transactions instead of `eth_sendTransaction`.

## What Changed

### Updated Test: `test/hardhat/EIP7702-Delegation.test.js`

**Before:** Used ethers.js `eth_sendTransaction` with `authorizationList` (didn't work)

**After:** Uses `cast send --auth` via Node.js `execSync` (works perfectly!)

```javascript
const { execSync } = require("child_process");

// Step 1: Delegate owner to contract
const delegateCommand = `cast send ${owner.address} --auth ${contractAddress} --private-key ${ownerPrivateKey} --rpc-url http://127.0.0.1:8545 --value 0 --json`;

const delegateOutput = execSync(delegateCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
const delegateReceipt = JSON.parse(delegateOutput);
```

## Test Results

```bash
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil
```

**Output:**
```
  EIP-7702 Delegation Test
    ✔ should deploy InheritableEOA contract (129ms)
    ✔ should create EIP-7702 authorization and delegate EOA to contract (41ms)
    ✔ should verify EOA code delegation is persistent

  3 passing (701ms)
```

### Successful Features

1. **Contract Deployment** ✅
   - Libraries deploy correctly
   - InheritableEOA contract deploys with library linking

2. **EIP-7702 Delegation** ✅
   - Uses `cast send --auth` for delegation
   - Creates proper authorization automatically
   - Calculates correct nonce automatically
   - Signs with provided private key
   - Sends type 4 transaction successfully

3. **Code Verification** ✅
   - Owner address has EIP-7702 designator (`0xef01`)
   - Delegation points to correct contract address
   - Code format: `0xef01` + `00` (version) + contract address (20 bytes)

4. **Persistence** ✅
   - Delegation persists across transactions
   - Can read delegated contract state

## Known Limitation

### `setConfig()` Function with `onlyEoa` Modifier

The `setConfig` function requires `msg.sender == address(this)` via the `onlyEoa` modifier. While this should work for EIP-7702 delegated accounts, it currently reverts when called.

**Error:**
```
Error: Failed to estimate gas: server returned an error response:
error code 3: execution reverted, data: "0x"
```

**Status:** Needs further investigation

**Workaround:** The delegation itself works perfectly. Setting configuration after delegation requires either:
1. Removing the `onlyEoa` modifier
2. Using a different authorization mechanism
3. Investigating why `msg.sender == address(this)` fails for EIP-7702

## How It Works

### 1. Delegation Transaction

```bash
cast send <OWNER_ADDRESS> \
  --auth <CONTRACT_ADDRESS> \
  --private-key <PRIVATE_KEY> \
  --rpc-url http://127.0.0.1:8545 \
  --value 0
```

This creates an EIP-7702 transaction that:
- Sets the owner's code to a delegation designator
- Points to the contract address
- Allows the owner to execute contract functions

### 2. Verification

```bash
# Check delegation
cast code <OWNER_ADDRESS> --rpc-url http://127.0.0.1:8545

# Expected output
0xef01<version><contract_address>

# Read delegated contract
cast call <OWNER_ADDRESS> "getInheritor()(address)" --rpc-url http://127.0.0.1:8545
```

## Advantages of Using Cast

| Feature | eth_sendTransaction | cast send --auth |
|---------|---------------------|------------------|
| Authorization creation | Manual | Automatic ✅ |
| Nonce calculation | Manual (+1 for same-wallet) | Automatic ✅ |
| Signature format | Manual (yParity conversion) | Automatic ✅ |
| Transaction type | Manual (type 4) | Automatic ✅ |
| **Works with Anvil** | ❌ No | ✅ **Yes!** |

## Usage Examples

### In Tests

```javascript
const { execSync } = require("child_process");

// Delegate owner to contract
const result = execSync(
  `cast send ${ownerAddress} --auth ${contractAddress} --private-key ${key} --rpc-url http://127.0.0.1:8545 --value 0 --json`,
  { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
);

const receipt = JSON.parse(result);
console.log("Delegated! TX:", receipt.transactionHash);
```

### From Command Line

```bash
# Start Anvil
./scripts/start-anvil.sh

# Deploy contract
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep "should deploy"

# Delegate using cast
cast send 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --auth <CONTRACT_ADDRESS_FROM_ABOVE> \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url http://127.0.0.1:8545 \
  --value 0

# Verify
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://127.0.0.1:8545
```

## Technical Details

### EIP-7702 Specification

- **Transaction Type:** 4 (`0x04`)
- **Authorization Format:** `keccak256(0x05 || rlp([chain_id, address, nonce]))`
- **Delegation Designator:** `0xef01` + version byte + contract address
- **Nonce Handling:** For same-wallet tx, use `current_nonce + 1`

### Cast Handles Everything

When you use `cast send --auth`:
1. Retrieves current nonce from the network
2. Calculates authorization nonce (`current + 1` for same-wallet)
3. Creates authorization hash with `0x05` magic byte
4. Signs with correct format (yParity instead of v)
5. Constructs type 4 transaction
6. Includes authorization list
7. Sends and waits for confirmation

## References

- Main test: `test/hardhat/EIP7702-Delegation.test.js`
- Start script: `scripts/start-anvil.sh`
- EIP-7702 Spec: https://eips.ethereum.org/EIPS/eip-7702
- Foundry Cast Docs: https://book.getfoundry.sh/reference/cast/

## Summary

✅ **EIP-7702 delegation is working perfectly with `cast send --auth`!**

The implementation successfully demonstrates:
- Contract deployment
- EIP-7702 delegation using cast
- Code verification
- Delegation persistence

Next steps:
- Investigate `onlyEoa` modifier behavior with EIP-7702
- Consider alternative authorization mechanisms for post-delegation function calls
