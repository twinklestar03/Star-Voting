import { HardhatUserConfig } from "hardhat/config";
import { NetworksUserConfig } from "hardhat/types"
import { config } from "./package.json"
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat"
import "./tasks/deploy-star-voting"

require("dotenv").config();


function getNetworks(): NetworksUserConfig {
  if (!process.env.INFURA_API_KEY || !process.env.BACKEND_PRIVATE_KEY) {
      return {}
  }

  const infuraApiKey = process.env.INFURA_API_KEY
  const accounts = [`0x${process.env.BACKEND_PRIVATE_KEY}`]

  return {
      goerli: {
          url: `https://goerli.infura.io/v3/${infuraApiKey}`,
          chainId: 5,
          accounts
      },
      sepolia: {
          url: `https://sepolia.infura.io/v3/${infuraApiKey}`,
          chainId: 11155111,
          accounts
      },
      mumbai: {
          url: `https://polygon-mumbai.infura.io/v3/${infuraApiKey}`,
          chainId: 80001,
          accounts
      },
      "optimism-goerli": {
          url: `https://optimism-goerli.infura.io/v3/${infuraApiKey}`,
          chainId: 420,
          accounts
      },
      "arbitrum-goerli": {
          url: "https://goerli-rollup.arbitrum.io/rpc",
          chainId: 421613,
          accounts
      },
      arbitrum: {
          url: "https://arb1.arbitrum.io/rpc",
          chainId: 42161,
          accounts
      }
  }
}

const hardhatConfig: HardhatUserConfig = {
  solidity: {
      version: "0.8.4",
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000,
        },
      }
  },
    paths: {
      sources: config.paths.contracts,
      tests: config.paths.tests,
      cache: config.paths.cache,
      artifacts: config.paths.build.contracts
  },
  networks: {
      hardhat: {
        chainId: 1337,
        allowUnlimitedContractSize: true
      },
      'thunder-testnet': {
        url: 'https://testnet-rpc.thundercore.com',
        chainId: 18,
        gas: 90000000,
        gasPrice: 1e9,
        accounts: process.env.BACKEND_PRIVATE_KEY ? [process.env.BACKEND_PRIVATE_KEY] : [],
      },
      'thunder-mainnet': {
        url: 'https://mainnet-rpc.thundercore.com',
        chainId: 108,
        gas: 90000000,
        gasPrice: 1e9,
        accounts: process.env.BACKEND_PRIVATE_KEY ? [process.env.BACKEND_PRIVATE_KEY] : [],
      },
      ...getNetworks()
  },
  gasReporter: {
      currency: "USD",
      enabled: process.env.REPORT_GAS === "true",
      coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  typechain: {
      outDir: config.paths.build.typechain,
      target: "ethers-v5"
  },
  etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY
  }
};

export default hardhatConfig;
