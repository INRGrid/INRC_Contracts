import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import {
  expandTo18Decimals,
  expandTo6Decimals,
} from "../test/utilities/helper/utilities";
import { PanoverseDAO } from "../typechain-types";

function sleep(ms: any) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dao = await ethers.getContractFactory("PanoverseDAO");
  const DAO = await dao.deploy();
  await sleep(2000);
  console.log("DAO Factory- " + DAO.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
