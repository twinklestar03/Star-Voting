// import "tt-hardhat";
import { HardhatUserConfig } from "hardhat/config";
import { NetworksUserConfig } from "hardhat/types"
import { config } from "./package.json"
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat"
import "./tasks/deploy-star-voting"
import "./tasks/deploy-star-voting-no-save"

require("dotenv").config();


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
      gasPrice: 1e11,
      accounts: process.env.BACKEND_PRIVATE_KEY ? [process.env.BACKEND_PRIVATE_KEY] : [],
    },
    'linea-testnet': {
      url: 'https://rpc.goerli.linea.build/',
      chainId: 59140,
      accounts: process.env.BACKEND_PRIVATE_KEY ? [process.env.BACKEND_PRIVATE_KEY] : [],
    },
    'chiado-testnet': {
      url: 'https://rpc.chiadochain.net',
      chainId: 10200,
      gas: 90000000,
      gasPrice: 1e9,
      accounts: process.env.BACKEND_PRIVATE_KEY ? [process.env.BACKEND_PRIVATE_KEY] : [],
    }
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
      apiKey: {
        // process.env.ETHERSCAN_API_KEY
        "thunder-testnet": "unused",
        "linea-testnet": "unused",
        "chiado-testnet": "unused",
      },
      customChains: [
        {
          network: "thunder-testnet",
          chainId: 18,
          urls: {
            apiURL: "https://explorer-testnet.thundercore.com/api",
            browserURL: "https://explorer-testnet.thundercore.com",
          },
        },
        {
          network: "linea-testnet",
          chainId: 59140,
          urls: {
            apiURL: "https://explorer.goerli.linea.build/api",
            browserURL: "https://explorer.goerli.linea.build/",
          },
        },
        {
          network: "chiado-testnet",
          chainId: 10200,
          urls: {
            apiURL: "https://blockscout.com/gnosis/chiado/api",
            browserURL: "https://blockscout.com/gnosis/chiado",
          }
        }
      ],
  }
};

export default hardhatConfig;
