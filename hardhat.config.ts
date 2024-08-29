import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import { setBlockGasLimit } from "@nomicfoundation/hardhat-network-helpers";
// require('hardha');

dotenv.config();
export default {
  networks: {
    sepolia: {
      url:
        "https://sepolia.infura.io/v3/384158242f384bcbb27cbb663fbca37e" || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      gas: 1000000000000,
      gasPrice: 10000000000,
      initialBaseFeePerGas: 7,
      allowUnlimitedContractSize: true,
    },
    fuji: {
      url: "https://api.tatum.io/v3/blockchain/node/avax-testnet",
      // url: "https://api.avax.network/ext/bc/C/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    matic: {
      url: "https://rpc-amoy.polygon.technology/",
      // url: "https://polygon-bor-rpc.publicnode.com",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    BNB: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      // url: "https://bsc-rpc.publicnode.com",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    fantom: {
      url: "https://rpc.testnet.fantom.network",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    harmony: {
      url: " https://api.s0.b.hmny.io",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Arbitrum: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Base: {
      url: "https://sepolia.base.org",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: "MDI1SVKVYJAIQTT8JRVD4JAK9CYSBDNK12",
  },
  customChains: [
    {
      network: "polygonAmoy",
      chainId: 80002,
      urls: {
        apiURL: "https://api-amoy.polygonscan.com/api",
        browserURL: "https://amoy.polygonscan.com",
      },
    },
  ],

  sourcify: {
    enabled: false,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        // settings: {
        //   // optimizer: {
        //   //   enabled: false,
        //   //   runs: 500,
        //   // },
        // },
      },
    ],
  },

  // gasReporter: {
  //   enabled: true,
  //   outputFile: 'gas_report_polygon.txt',
  //   // gasPrice: 10.19,
  //   L1:"polygon",
  //   // L1Etherscan:"7U8KDKGAGF71RMEXBTEUVME6P9NJGSNVE6",
  //   currency: "USD",
  //   currencyDisplayPrecision:4,
  //   coinmarketcap: "3fc1e150-2f4d-4fc0-bfaf-c63ef050cc5e",
  //   noColors: true,
  //   showMethodSig: true,
  //   showTimeSpent: true,
  //   excludeContracts: ["Mysense","inheritedContract","GateWayV2"],
  // },
};
