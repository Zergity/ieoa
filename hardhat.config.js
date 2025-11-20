require("@nomiclabs/hardhat-ethers");

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
      allowUnlimitedContractSize: true,
    },
    anvil: {
      url: "http://127.0.0.1:8545",
      chainId: 1,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
  },
  paths: {
    sources: "./src", // Use real contracts from src directory
    tests: "./test/hardhat", 
    cache: "./cache/hardhat",
    artifacts: "./artifacts"
  },
};