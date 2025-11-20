# EIP-7702 Debugging Guide

## Why Owner Address Code Isn't Updated

There are **two main issues** preventing the EIP-7702 delegation from working:

### Issue 1: Incorrect Authorization Nonce ❌

**Location:** `test/hardhat/EIP7702-Delegation.test.js:54`

```javascript
const nonce = await owner.getTransactionCount();  // ❌ WRONG for same-wallet tx
```

**Problem:** The authorization uses the current nonce, but EIP-7702 spec requires:

- **Same-wallet transactions** (sender == authorized account): Use `current_nonce + 1`
- **Sponsored transactions** (sender != authorized account): Use `current_nonce`

Since the transaction is `from: owner.address` → `to: owner.address`, this is a **same-wallet transaction**.

**Why?** The sender's nonce is incremented **before** the authorization list is validated. The authorization must match the account's nonce **at validation time**, not at creation time.

**Fix:**
```javascript
const nonce = await owner.getTransactionCount() + 1;  // ✅ CORRECT for same-wallet tx
```

### Issue 2: ethers.js v5 Doesn't Support EIP-7702 ❌

**Problem:** ethers.js v5 doesn't properly serialize the `authorizationList` field when sending transactions via `eth_sendTransaction`.

Result:
- ✅ Transaction succeeds (no syntax error)
- ❌ Authorization list is ignored/dropped
- ❌ Code delegation doesn't happen

**Solutions:**

#### Option A: Use `cast` (Recommended) ✅

Cast has native EIP-7702 support built-in:

```bash
# 1. Deploy contract first
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep "should deploy"

# 2. Copy the contract address from output, then:
cast send <OWNER_ADDRESS> \
    "setConfig(address,uint256)" \
    <INHERITOR_ADDRESS> \
    86400 \
    --auth <CONTRACT_ADDRESS> \
    --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    --rpc-url http://127.0.0.1:8545

# 3. Verify delegation
cast code <OWNER_ADDRESS> --rpc-url http://127.0.0.1:8545
# Should output: 0xef0100<CONTRACT_ADDRESS>
```

#### Option B: Upgrade to ethers.js v6 ✅

Ethers.js v6 has proper EIP-7702 support with the `authorizationList` field.

#### Option C: Use Viem ✅

Viem has excellent EIP-7702 support:

```javascript
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'
import { eip7702Actions } from 'viem/experimental'

const client = createWalletClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
}).extend(eip7702Actions())

const authorization = await client.signAuthorization({
  account: privateKeyToAccount(OWNER_KEY),
  contractAddress: CONTRACT_ADDRESS,
})

const hash = await client.sendTransaction({
  to: OWNER_ADDRESS,
  authorizationList: [authorization],
  data: setConfigCalldata,
})
```

## Verification Steps

After sending a successful EIP-7702 transaction:

### 1. Check Code at Owner Address

```bash
cast code <OWNER_ADDRESS> --rpc-url http://127.0.0.1:8545
```

**Expected Output:**
```
0xef0100<CONTRACT_ADDRESS_40_HEX_CHARS>
```

**Format:** `0xef01` + `00` (version byte) + `<20-byte contract address>`

### 2. Verify Configuration

```bash
# Read inheritor
cast call <OWNER_ADDRESS> "getInheritor()(address)" --rpc-url http://127.0.0.1:8545

# Read delay
cast call <OWNER_ADDRESS> "getDelay()(uint256)" --rpc-url http://127.0.0.1:8545
```

### 3. Check Transaction Receipt

```bash
cast receipt <TX_HASH> --rpc-url http://127.0.0.1:8545
```

Look for:
- `status: 1` (success)
- `type: 4` (EIP-7702)
- No revert reason

## Quick Test Script

A test script is available: `./test-7702-cast.sh`

Usage:
```bash
# Terminal 1: Start Anvil
./scripts/start-anvil.sh

# Terminal 2: Deploy contract and get address
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep "should deploy"

# Terminal 3: Run cast test
./test-7702-cast.sh
# Enter the contract address when prompted
```

## Common Issues

### Issue: "Code delegation did not work - no code at owner address"

**Causes:**
1. ❌ Authorization nonce is wrong
2. ❌ Authorization signature is invalid
3. ❌ ethers.js v5 dropped the authorizationList
4. ❌ Chain ID mismatch

**Solution:** Use `cast` with the `--auth` flag instead of ethers.js

### Issue: "Owner address is delegated to wrong contract address"

**Cause:** Previous test run already delegated the owner to a different contract

**Solution:** Restart Anvil to reset state:
```bash
# Ctrl+C in Anvil terminal, then:
./scripts/start-anvil.sh
```

### Issue: Transaction succeeds but code is still "0x"

**Cause:** Authorization list was not processed (ethers.js v5 limitation)

**Solution:** Use `cast` or upgrade to ethers.js v6

## Anvil Configuration

Current setup (verified working):
- Chain ID: 1 ✅
- Hardfork: prague ✅
- EIP-7702: Supported ✅

## References

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Foundry EIP-7702 Guide](https://getfoundry.sh/cheatcodes/sign-delegation)
- [QuickNode EIP-7702 with ethers.js](https://www.quicknode.com/guides/ethereum-development/transactions/eip-7702-transactions-with-ethers)
