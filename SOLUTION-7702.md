# EIP-7702 Solution: Why Code Isn't Updated

## TL;DR

**Problem:** Transaction succeeds but owner code remains `0x`

**Root Cause:** **ethers.js v5 doesn't support EIP-7702** - the `authorizationList` field is silently ignored

**Solution:** Use `cast` instead

## The Issue

Your test at `test/hardhat/EIP7702-Delegation.test.js` has two problems:

### 1. Wrong Nonce (line 54) ❌

```javascript
const nonce = await owner.getTransactionCount();  // ❌ Wrong
```

Should be:
```javascript
const nonce = await owner.getTransactionCount() + 1;  // ✅ Correct for same-wallet tx
```

**Why?** In EIP-7702, when the sender and authorized account are the same (both `owner.address`), the nonce is incremented **before** checking the authorization. You must use `current_nonce + 1`.

### 2. ethers.js v5 Limitation ❌

ethers.js v5 **does not support** the `authorizationList` field. The transaction succeeds, but the authorization is **silently dropped**.

Result:
- ✅ Receipt shows `status: 1` (success)
- ❌ Code at owner address remains `0x`
- ❌ No delegation happens

## Working Solution: Use Cast

Cast has native EIP-7702 support. Here's how to test:

### Step 1: Deploy Contract

```bash
# Terminal 1: Make sure Anvil is running
./scripts/start-anvil.sh

# Terminal 2: Deploy the contract
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep "should deploy"
```

Copy the `InheritableEOA address` from the output.

### Step 2: Send EIP-7702 Transaction with Cast

```bash
# Replace <CONTRACT_ADDRESS> with the address from step 1
cast send 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
    "setConfig(address,uint256)" \
    0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
    86400 \
    --auth <CONTRACT_ADDRESS> \
    --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    --rpc-url http://127.0.0.1:8545
```

The `--auth` flag automatically:
- Creates the correct EIP-7702 authorization
- Uses the correct nonce (`current + 1` for same-wallet)
- Signs it properly with yParity
- Includes it in the transaction

### Step 3: Verify

```bash
# Check code delegation
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://127.0.0.1:8545

# Should output: 0xef0100<CONTRACT_ADDRESS>
```

## Alternative: Use the Test Scripts

### Quick Test with Cast

```bash
./test-7702-cast.sh
```

Follow the prompts to enter the contract address.

### Debug with JavaScript

```bash
node test-7702-minimal.js <CONTRACT_ADDRESS>
```

This will show you exactly what's happening and why it fails with ethers.js v5.

## Why Your Current Test Succeeds But Doesn't Work

```javascript
// Line 164: This sends the transaction
const txHash = await ethers.provider.send("eth_sendTransaction", [eip7702TxRpc]);

// Line 168: This waits for confirmation
const receipt = await ethers.provider.waitForTransaction(txHash);

// Line 170: This prints success!
console.log("✅ SUCCESS: EIP-7702 transaction confirmed!");
```

The transaction **succeeds** because the syntax is valid, but:
- ethers.js v5 doesn't understand `authorizationList`
- It sends a type 4 transaction **without** the authorization
- Anvil accepts it (no syntax error)
- But no delegation happens

## Proof

Run this to see the difference:

```bash
# Before the transaction
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://127.0.0.1:8545
# Output: 0x

# Run your current test
npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil

# After the transaction
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://127.0.0.1:8545
# Output: 0x  (still no code!)

# Now use cast
cast send 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
    --auth <CONTRACT> \
    --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    --rpc-url http://127.0.0.1:8545 \
    --value 0

# Check again
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://127.0.0.1:8545
# Output: 0xef0100... (delegation works!)
```

## Long-term Solutions

To fix the JavaScript test:

1. **Upgrade to ethers.js v6** (recommended for production)
2. **Use Viem** (has excellent EIP-7702 support)
3. **Use Foundry tests** with `vm.signDelegation` cheatcode

For quick testing and verification, stick with `cast` - it's the most reliable tool for EIP-7702 right now.

## References

- See `DEBUG-EIP7702.md` for detailed debugging steps
- See `test-7702-cast.sh` for automated testing with cast
- See `test-7702-minimal.js` for educational demonstration
