const Hre = require("hardhat");

async function main() {



    await Hre.run("verify:verify", {
      address: "0x79623eEA79491dD414743E29219894e51498a9d7",
      contract: "contracts/PanoverseDAO.sol:PanoverseDAO",
    });

}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});