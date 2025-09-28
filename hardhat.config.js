require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./src", // Use real contracts from src directory
    tests: "./test/hardhat", 
    cache: "./cache/hardhat",
    artifacts: "./artifacts"
  },
};