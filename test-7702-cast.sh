#!/bin/bash

# Test EIP-7702 delegation using cast
# Make sure Anvil is running with: ./scripts/start-anvil.sh

echo "=== EIP-7702 Test with Cast ==="
echo ""

# Anvil default accounts
OWNER="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Account[1]
OWNER_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
INHERITOR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  # Account[2]
RPC="http://127.0.0.1:8545"

echo "Step 1: Check owner code before delegation..."
BEFORE_CODE=$(cast code $OWNER --rpc-url $RPC)
echo "Owner code before: $BEFORE_CODE"
echo ""

echo "Step 2: Deploy InheritableEOA contract..."
# You need to deploy the contract first and get its address
# For now, this is a placeholder - you should run the hardhat test first to deploy
echo "⚠️  Run: npx hardhat test test/hardhat/EIP7702-Delegation.test.js --network anvil --grep 'should deploy'"
echo "   Then copy the contract address and update this script"
echo ""

read -p "Enter deployed InheritableEOA contract address: " CONTRACT

if [ -z "$CONTRACT" ]; then
    echo "❌ No contract address provided. Exiting."
    exit 1
fi

echo ""
echo "Step 3: Send EIP-7702 transaction..."
echo "Contract: $CONTRACT"
echo "Owner: $OWNER"
echo "Inheritor: $INHERITOR"
echo ""

# Send transaction with --auth flag for EIP-7702
# This will delegate the owner's code to the contract and call setConfig
cast send $OWNER \
    "setConfig(address,uint256)" \
    $INHERITOR \
    86400 \
    --auth $CONTRACT \
    --private-key $OWNER_KEY \
    --rpc-url $RPC \
    --gas-limit 500000

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Transaction sent successfully!"
    echo ""
    echo "Step 4: Verify code delegation..."
    AFTER_CODE=$(cast code $OWNER --rpc-url $RPC)
    echo "Owner code after: $AFTER_CODE"

    if [ "$AFTER_CODE" != "0x" ] && [[ "$AFTER_CODE" == 0xef01* ]]; then
        echo ""
        echo "🎉 SUCCESS! EIP-7702 delegation worked!"
        echo "   Owner address now has delegation designator: 0xef01..."

        # Extract delegated address
        DELEGATED_TO="0x${AFTER_CODE: -40}"
        echo "   Delegated to: $DELEGATED_TO"
        echo "   Expected:     $CONTRACT"

        if [ "${DELEGATED_TO,,}" = "${CONTRACT,,}" ]; then
            echo "   ✅ Delegation target matches!"
        else
            echo "   ⚠️  Delegation target mismatch!"
        fi

        # Try to read the config
        echo ""
        echo "Step 5: Verify configuration..."
        STORED_INHERITOR=$(cast call $OWNER "getInheritor()(address)" --rpc-url $RPC)
        STORED_DELAY=$(cast call $OWNER "getDelay()(uint256)" --rpc-url $RPC)

        echo "   Stored inheritor: $STORED_INHERITOR"
        echo "   Stored delay: $STORED_DELAY seconds"

        if [ "${STORED_INHERITOR,,}" = "${INHERITOR,,}" ]; then
            echo "   ✅ Configuration correct!"
        fi
    else
        echo ""
        echo "❌ Code delegation failed - owner code not updated"
    fi
else
    echo ""
    echo "❌ Transaction failed"
fi
