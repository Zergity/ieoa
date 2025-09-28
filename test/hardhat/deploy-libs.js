/**
 * Helper script to deploy all required libraries and return addresses
 */
async function deployLibraries() {
  const { ethers } = require("hardhat");
  
  // Deploy all libraries in dependency order
  console.log("📚 Deploying required libraries...");
  
  // Deploy EthereumTrieDB first (it has no dependencies)
  const EthereumTrieDBLib = await ethers.getContractFactory("EthereumTrieDB");
  const ethereumTrieDBLib = await EthereumTrieDBLib.deploy();
  const ethereumTrieDBAddress = await ethereumTrieDBLib.getAddress();
  console.log(`✅ EthereumTrieDB deployed at: ${ethereumTrieDBAddress}`);
  
  // Deploy MerklePatricia with EthereumTrieDB linked
  const MerklePatriciaLib = await ethers.getContractFactory("MerklePatricia", {
    libraries: {
      EthereumTrieDB: ethereumTrieDBAddress,
    },
  });
  const merklePatriciaLib = await MerklePatriciaLib.deploy();
  const merklePatriciaAddress = await merklePatriciaLib.getAddress();
  console.log(`✅ MerklePatricia deployed at: ${merklePatriciaAddress}`);
  
  return {
    EthereumTrieDB: ethereumTrieDBAddress,
    MerklePatricia: merklePatriciaAddress,
  };
}

module.exports = { deployLibraries };