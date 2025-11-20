/**
 * Minimal EIP-7702 Test
 *
 * This script demonstrates the correct way to send EIP-7702 transactions
 * and helps debug why code delegation might not be working.
 *
 * Prerequisites:
 * 1. Anvil running with: ./scripts/start-anvil.sh
 * 2. Contract deployed (run hardhat test first)
 */

const { ethers } = require("hardhat");

async function main() {
  // Connect to Anvil
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

  // Anvil default accounts
  const ownerKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Account[1]
  const owner = new ethers.Wallet(ownerKey, provider);

  console.log("\n=== EIP-7702 Authorization Test ===\n");
  console.log("Owner address:", owner.address);
  console.log("Expected:", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

  // Get contract address from command line
  const contractAddress = process.argv[2];
  if (!contractAddress || !ethers.utils.isAddress(contractAddress)) {
    console.error("\n❌ Error: Please provide a valid contract address");
    console.log("\nUsage: node test-7702-minimal.js <CONTRACT_ADDRESS>");
    console.log("\nTo get the contract address, run:");
    console.log("  npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep 'should deploy'");
    process.exit(1);
  }

  console.log("Contract address:", contractAddress);

  // Check current state
  const ownerCode = await provider.getCode(owner.address);
  const ownerNonce = await provider.getTransactionCount(owner.address);
  const chainId = (await provider.getNetwork()).chainId;

  console.log("\n=== Current State ===");
  console.log("Chain ID:", chainId);
  console.log("Owner nonce:", ownerNonce);
  console.log("Owner code:", ownerCode === "0x" ? "No code (EOA)" : ownerCode);

  if (ownerCode !== "0x" && ownerCode.startsWith("0xef01")) {
    const delegatedTo = "0x" + ownerCode.slice(-40);
    console.log("⚠️  Owner already delegated to:", delegatedTo);
    if (delegatedTo.toLowerCase() === contractAddress.toLowerCase()) {
      console.log("✅ Already delegated to target contract");
    } else {
      console.log("❌ Delegated to different contract. Restart Anvil to reset.");
      process.exit(1);
    }
  }

  console.log("\n=== Creating EIP-7702 Authorization ===");

  // CRITICAL: For same-wallet transactions, use nonce + 1
  // The sender's nonce is incremented BEFORE authorization validation
  const authNonce = ownerNonce + 1;

  console.log("Authorization nonce:", authNonce, "(current nonce + 1 for same-wallet tx)");

  // Create authorization hash: keccak256(0x05 || rlp([chain_id, address, nonce]))
  const rlpEncoded = ethers.utils.RLP.encode([
    ethers.utils.hexlify(chainId),
    contractAddress.toLowerCase(),
    ethers.utils.hexlify(authNonce)
  ]);

  const authHash = ethers.utils.keccak256(
    ethers.utils.concat(["0x05", rlpEncoded])
  );

  console.log("Authorization hash:", authHash);

  // Sign with owner's key
  const signingKey = new ethers.utils.SigningKey(ownerKey);
  const sig = signingKey.signDigest(authHash);
  const yParity = sig.v - 27;

  console.log("\n=== Authorization Signature ===");
  console.log("r:", sig.r);
  console.log("s:", sig.s);
  console.log("yParity:", yParity);

  // Create authorization object
  const authorization = {
    chainId: ethers.utils.hexValue(chainId),
    address: contractAddress,
    nonce: ethers.utils.hexValue(authNonce),
    yParity: ethers.utils.hexValue(yParity),
    r: sig.r,
    s: sig.s
  };

  console.log("\n=== Sending Transaction ===");
  console.log("⚠️  WARNING: ethers.js v5 does NOT support authorizationList properly!");
  console.log("This transaction will likely succeed but NOT update the code.");
  console.log("\nRecommended: Use cast instead (see DEBUG-EIP7702.md)");
  console.log("\nProceeding anyway for demonstration...\n");

  // Prepare a simple transaction (just delegate, don't call anything)
  const tx = {
    from: owner.address,
    to: owner.address,
    value: "0x0",
    data: "0x", // Empty data - just delegate
    gas: ethers.utils.hexValue(500000),
    type: "0x4", // EIP-7702
    authorizationList: [authorization]
  };

  try {
    // Send via JSON-RPC
    console.log("Sending EIP-7702 transaction...");
    const txHash = await provider.send("eth_sendTransaction", [tx]);
    console.log("Transaction hash:", txHash);

    // Wait for receipt
    const receipt = await provider.waitForTransaction(txHash);
    console.log("\n=== Transaction Receipt ===");
    console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check code after transaction
    const codeAfter = await provider.getCode(owner.address);

    console.log("\n=== Verification ===");
    console.log("Code after tx:", codeAfter);

    if (codeAfter !== "0x" && codeAfter.startsWith("0xef01")) {
      const delegatedTo = "0x" + codeAfter.slice(-40);
      console.log("\n🎉 SUCCESS! Code delegation worked!");
      console.log("Delegated to:", delegatedTo);
      console.log("Expected:", contractAddress);

      if (delegatedTo.toLowerCase() === contractAddress.toLowerCase()) {
        console.log("✅ Delegation target is correct!");
      } else {
        console.log("⚠️  Delegation target mismatch!");
      }
    } else {
      console.log("\n❌ FAILED: Code delegation did not work");
      console.log("\nLikely causes:");
      console.log("1. ethers.js v5 doesn't support authorizationList (most likely)");
      console.log("2. Incorrect authorization nonce");
      console.log("3. Invalid signature");
      console.log("\nSolution: Use cast instead:");
      console.log(`\n  cast send ${owner.address} \\`);
      console.log(`    --auth ${contractAddress} \\`);
      console.log(`    --private-key ${ownerKey} \\`);
      console.log(`    --rpc-url http://127.0.0.1:8545 \\`);
      console.log(`    --value 0\n`);
    }

  } catch (error) {
    console.error("\n❌ Error sending transaction:");
    console.error(error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Owner account needs ETH. Is Anvil running?");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
