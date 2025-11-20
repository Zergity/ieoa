const { ethers } = require("hardhat");

/**
 * Deploy the required libraries for InheritableEOA
 * Libraries must be deployed in dependency order
 */
async function deployLibraries() {
  console.log("Deploying libraries...");

  // 1. Deploy EthereumTrieDB (no dependencies)
  const EthereumTrieDB = await ethers.getContractFactory(
    "src/solidity-merkle-trees/trie/ethereum/EthereumTrieDB.sol:EthereumTrieDB"
  );
  const ethereumTrieDB = await EthereumTrieDB.deploy();
  await ethereumTrieDB.deployed();
  console.log("EthereumTrieDB deployed at:", ethereumTrieDB.address);

  // 2. Deploy MerklePatricia (depends on EthereumTrieDB)
  const MerklePatricia = await ethers.getContractFactory(
    "src/solidity-merkle-trees/MerklePatricia.sol:MerklePatricia",
    {
      libraries: {
        "src/solidity-merkle-trees/trie/ethereum/EthereumTrieDB.sol:EthereumTrieDB": ethereumTrieDB.address
      }
    }
  );
  const merklePatricia = await MerklePatricia.deploy();
  await merklePatricia.deployed();
  console.log("MerklePatricia deployed at:", merklePatricia.address);

  return {
    EthereumTrieDB: ethereumTrieDB.address,
    MerklePatricia: merklePatricia.address
  };
}

module.exports = { deployLibraries };
