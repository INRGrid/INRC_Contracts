import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  INRC,
  INRC__factory,
  MyToken,
  MyToken__factory,
} from "../../typechain-types";
import { expandTo6Decimals } from "./helper/utilities";
import { increase } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import { interfaces } from "@onchain-id/solidity";

describe("INRC Contract", function () {
  let INRC: INRC;
  // let INRC: INRC;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let feeCollector: SignerWithAddress;
  let minter: SignerWithAddress;
  let MockERC20: MyToken;

  beforeEach(async function () {
    // INRC = await ethers.getContractFactory("INRC");
    [owner, addr1, addr2, feeCollector, minter] = await ethers.getSigners();
    MockERC20 = await new MyToken__factory(owner).deploy();
    INRC = await new INRC__factory(owner).deploy();
    await INRC.connect(owner).initialize(feeCollector.address);
  });

  describe("Initialization", function () {
    it("should initialize correctly", async function () {
      expect(await INRC.feeCollector()).to.be.eq(feeCollector.address);
      expect(await INRC.currency()).to.equal("INR");
      expect(await INRC.version()).to.equal("1");
      expect(await INRC.masterMinter()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("should mint tokens if called by masterMinter", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        addr1.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(500)
      );
    });
    it("shoud update master minter", async () => {
      await INRC.connect(owner).updateMasterMinter(addr1.address);
      expect(await INRC.masterMinter()).to.be.eq(addr1.address);
    });
    it("shoud revert master minter if called by non-owner", async () => {
      await expect(
        INRC.connect(addr1).updateMasterMinter(addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert minting if not allowed by minter", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await expect(
        INRC.connect(addr1).INRC_ISSUE(addr1.address, expandTo6Decimals(500))
      ).to.be.revertedWithCustomError(INRC, "MintingNotAllowed");
    });

    it("should revert minting if contract is paused", async function () {
      await INRC.connect(owner).togglePause(true);
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await expect(
        INRC.connect(addr1).INRC_ISSUE(addr1.address, expandTo6Decimals(500))
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });

    it("should allow minting within the minter's allowance", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await INRC.connect(minter).INRC_ISSUE(
        addr1.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(500)
      );
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(500)
      );
    });

    it("should transfer tokens correctly", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(1000)
      );
      await INRC.connect(owner).INRC_TRANSFER(
        addr1.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(owner.address)).to.equal(
        expandTo6Decimals(1000)
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(500)
      );
    });

    it("should apply fees correctly", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(5000)
      );
      await INRC.connect(owner).updateFee(100, 10); // 1% fee, max 10 tokens
      await INRC.connect(owner).INRC_TRANSFER(
        addr1.address,
        expandTo6Decimals(1000)
      );
      expect(await INRC.balanceOf(feeCollector.address)).to.equal(
        expandTo6Decimals(10)
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(990)
      );
    });

    it("should revert if payload size mismatched", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(500)
      );
      const validPayload = INRC.interface.encodeFunctionData("INRC_TRANSFER", [
        addr1.address,
        expandTo6Decimals(500),
      ]);

      const invalidPayload = validPayload + "00";

      await expect(
        owner.sendTransaction({
          to: INRC.address,
          data: invalidPayload,
        })
      ).to.be.revertedWithCustomError(INRC, "PayloadSizeMismatched");
    });

    it("should revert if sender is blacklisted", async function () {
      await INRC.connect(owner).blacklistUser(owner.address);
      await expect(
        INRC.INRC_TRANSFER(addr1.address, expandTo6Decimals(1000))
      ).to.be.revertedWithCustomError(INRC, "Blacklisted");
    });

    it("should revert if contract is paused", async function () {
      await INRC.connect(owner).togglePause(true);
      await expect(
        INRC.INRC_TRANSFER(addr1.address, expandTo6Decimals(1000))
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });

    it("should transfer tokens correctly for transfer from", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        addr1.address,
        expandTo6Decimals(1000)
      );

      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(500));
      await INRC.connect(owner).INRC_TRANSFER_FROM(
        addr1.address,
        addr2.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(addr2.address)).to.equal(
        expandTo6Decimals(500)
      );
    });
    it("should apply fees correctly for transfer from", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        addr1.address,
        expandTo6Decimals(1000)
      );
      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(1000));
      await INRC.connect(owner).updateFee(100, 10); // 1% fee, max 10 tokens
      await INRC.connect(owner).INRC_TRANSFER_FROM(
        addr1.address,
        addr2.address,
        expandTo6Decimals(1000)
      );
      expect(await INRC.balanceOf(feeCollector.address)).to.equal(
        expandTo6Decimals(10)
      );
      expect(await INRC.balanceOf(addr2.address)).to.equal(
        expandTo6Decimals(990)
      );
    });
    it("should apply max fees correctly for transfer from", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        addr1.address,
        expandTo6Decimals(1000)
      );
      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(1000));
      await INRC.connect(owner).updateFee(200, 10); // 1% fee, max 10 tokens
      await INRC.connect(owner).INRC_TRANSFER_FROM(
        addr1.address,
        addr2.address,
        expandTo6Decimals(1000)
      );
      expect(await INRC.balanceOf(feeCollector.address)).to.equal(
        expandTo6Decimals(10)
      );
      expect(await INRC.balanceOf(addr2.address)).to.equal(
        expandTo6Decimals(990)
      );
    });
    it("should revert if payload size mismatched for transfer From", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(500)
      );
      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(500));
      const validPayload = INRC.interface.encodeFunctionData(
        "INRC_TRANSFER_FROM",
        [addr1.address, addr2.address, expandTo6Decimals(500)]
      );

      const invalidPayload = validPayload + "00";

      await expect(
        owner.sendTransaction({
          to: INRC.address,
          data: invalidPayload,
        })
      ).to.be.revertedWithCustomError(INRC, "PayloadSizeMismatched");
    });

    it("should revert if sender is blacklisted for transfer From", async function () {
      await INRC.connect(owner).blacklistUser(owner.address);
      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(500));

      await expect(
        INRC.connect(owner).INRC_TRANSFER_FROM(
          addr1.address,
          addr2.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWithCustomError(INRC, "Blacklisted");
    });

    it("should revert if contract is paused for transfer from", async function () {
      await INRC.connect(owner).togglePause(true);
      await INRC.connect(addr1).approve(owner.address, expandTo6Decimals(500));

      await expect(
        INRC.connect(owner).INRC_TRANSFER_FROM(
          addr1.address,
          addr2.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(500)
      );
    });

    it("should burn tokens on transfer if called by owner", async function () {
      await INRC.connect(owner).BURN_ON_TRANSFER(
        owner.address,
        addr1.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(owner.address)).to.equal(
        expandTo6Decimals(0)
      );
      expect(await INRC.totalSupply()).to.equal(expandTo6Decimals(0));
    });

    it("should revert burn on transfer if amount exceeds balance", async function () {
      await expect(
        INRC.connect(owner).BURN_ON_TRANSFER(
          owner.address,
          addr1.address,
          expandTo6Decimals(1500)
        )
      ).to.be.revertedWithCustomError(INRC, "AmountExceedsBalance");
    });
    it("should revert burn on transfer non-owner calls", async function () {
      await expect(
        INRC.connect(addr1).BURN_ON_TRANSFER(
          owner.address,
          addr1.address,
          expandTo6Decimals(1500)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert burn if the contract is paused", async function () {
      await INRC.connect(owner).togglePause(true);
      await expect(
        INRC.connect(owner).BURN_ON_TRANSFER(
          owner.address,
          addr1.address,
          expandTo6Decimals(1500)
        )
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });
    it("should burn tokens on withdrawal if called by owner", async function () {
      await INRC.connect(owner).BURN_ON_WITHDRAWAL(
        owner.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.balanceOf(owner.address)).to.equal(
        expandTo6Decimals(0)
      );
      expect(await INRC.totalSupply()).to.equal(expandTo6Decimals(0));
    });

    it("should revert burn on withdrawal if amount exceeds balance", async function () {
      await expect(
        INRC.connect(owner).BURN_ON_WITHDRAWAL(
          owner.address,
          expandTo6Decimals(1500)
        )
      ).to.be.revertedWithCustomError(INRC, "AmountExceedsBalance");
    });
  });
  it("should revert burn on withdrawal non-owner calls", async function () {
    await expect(
      INRC.connect(addr1).BURN_ON_WITHDRAWAL(
        owner.address,
        expandTo6Decimals(1500)
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert burn on withdrawal if the contract is paused", async function () {
    await INRC.connect(owner).togglePause(true);
    await expect(
      INRC.connect(owner).BURN_ON_WITHDRAWAL(
        owner.address,
        expandTo6Decimals(1500)
      )
    ).to.be.revertedWithCustomError(INRC, "ContractPaused");
  });
  describe("Authorization", function () {
    it("should handle permit correctly", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await INRC.connect(owner).permit(
        owner.address,
        addr1.address,
        expandTo6Decimals(100),
        deadline,
        v,
        r,
        s
      );
      expect(await INRC.allowance(owner.address, addr1.address)).to.equal(
        expandTo6Decimals(100)
      );
    });

    it("should revert permit when called by blaclisted user", async function () {
      await INRC.connect(owner).blacklistUser(owner.address);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(owner).permit(
          owner.address,
          addr1.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).revertedWithCustomError(INRC, "Blacklisted");
    });

    it("should revert permit when contract is paused", async function () {
      await INRC.connect(owner).togglePause(true);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(owner).permit(
          owner.address,
          addr1.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).revertedWithCustomError(INRC, "ContractPaused");
    });

    it("should handle receive with permit correctly", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await INRC.connect(addr1).receiveWithAuthorization(
        owner.address,
        addr1.address,
        expandTo6Decimals(100),
        deadline,
        v,
        r,
        s
      );
      expect(await INRC.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(100)
      );
    });
    it("should revert receive with permit if contract is paused", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      await INRC.connect(owner).togglePause(true);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(addr1).receiveWithAuthorization(
          owner.address,
          addr1.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });
    it("should revert receive with permit if user is blacklisted", async function () {
      await INRC.connect(owner).blacklistUser(addr1.address);
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(addr1).receiveWithAuthorization(
          owner.address,
          addr1.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(INRC, "Blacklisted");
    });

    it("should handle transfer with permit correctly", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await INRC.connect(addr1).transferWithAuthorization(
        owner.address,
        addr1.address,
        addr2.address,
        expandTo6Decimals(100),
        deadline,
        v,
        r,
        s
      );

      expect(await INRC.balanceOf(addr2.address)).to.equal(
        expandTo6Decimals(100)
      );
    });
    it("it should revert transfer with permit when contract is paused", async function () {
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      await INRC.connect(owner).togglePause(true);

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(addr1).transferWithAuthorization(
          owner.address,
          addr1.address,
          addr2.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(INRC, "ContractPaused");
    });
    it("should revert transfer with permit when user is blacklisted", async function () {
      await INRC.connect(owner).blacklistUser(addr1.address);
      await INRC.connect(owner).INRC_ISSUE(
        owner.address,
        expandTo6Decimals(100)
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const ownerAddress = await owner.getAddress();
      const spenderAddress = await addr1.getAddress();
      const { v, r, s } = ethers.utils.splitSignature(
        await owner._signTypedData(
          {
            name: "INRC",
            version: "1",
            chainId: network.config.chainId,
            verifyingContract: INRC.address,
          },
          {
            Permit: [
              {
                name: "owner",
                type: "address",
              },
              {
                name: "spender",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint256",
              },
            ],
          },
          {
            owner: owner.address,
            spender: addr1.address,
            value: expandTo6Decimals(100),
            nonce: 0,
            deadline: deadline,
          }
        )
      );

      await expect(
        INRC.connect(addr1).transferWithAuthorization(
          owner.address,
          addr1.address,
          addr2.address,
          expandTo6Decimals(100),
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(INRC, "Blacklisted");
    });
  });

  describe("Rescue Functions", function () {
    it("should rescue ERC20 tokens", async function () {
      await MockERC20.connect(owner).mint(INRC.address, expandTo6Decimals(500));

      await INRC.connect(owner).rescueERC20(
        MockERC20.address,
        addr1.address,
        expandTo6Decimals(500)
      );
      expect(await MockERC20.balanceOf(addr1.address)).to.equal(
        expandTo6Decimals(500)
      );
    });
    it("should revert rescue ERC20 tokens if called by non-owner", async function () {
      await MockERC20.connect(owner).mint(INRC.address, expandTo6Decimals(500));

      await expect(
        INRC.connect(addr1).rescueERC20(
          MockERC20.address,
          addr1.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert if Ether transfer fails", async function () {
      await expect(
        INRC.connect(owner).rescueEther(
          addr1.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWithCustomError(INRC, "EtherTransferFailed");
    });
  });

  describe("Minter Management", function () {
    it("should configure minter correctly", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.minterAllowance(minter.address)).to.equal(
        expandTo6Decimals(500)
      );
    });
    it("should return minter status correctly", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.minterAllowance(minter.address)).to.equal(
        expandTo6Decimals(500)
      );
      expect(await INRC.isMinter(minter.address)).to.be.eq(true);
      expect(await INRC.isMinter(addr2.address)).to.be.eq(false);
    });
    it("should revert if configure minter called by non-owner", async function () {
      await expect(
        INRC.connect(addr1).configureMinter(
          minter.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should increase minting allowance", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await INRC.connect(owner).increaseMintingAllowance(
        minter.address,
        expandTo6Decimals(500)
      );
      expect(await INRC.minterAllowance(minter.address)).to.equal(
        expandTo6Decimals(1000)
      );
    });
    it("should revert increase minting allowance if called by non-owner", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await expect(
        INRC.connect(addr1).increaseMintingAllowance(
          minter.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should decrease minting allowance", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await INRC.connect(owner).decreaseMintingAllowance(
        minter.address,
        expandTo6Decimals(400)
      );
      expect(await INRC.minterAllowance(minter.address)).to.equal(
        expandTo6Decimals(100)
      );
    });
    it("should revert decrease minting allowance if called by non-owner", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await expect(
        INRC.connect(addr1).decreaseMintingAllowance(
          minter.address,
          expandTo6Decimals(500)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should remove minter", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await INRC.connect(owner).removeMinter(minter.address);
      expect(
        await INRC.connect(owner).minterAllowance(minter.address)
      ).to.equal(0);
    });
    it("should revert remove minter if called by non-owner", async function () {
      await INRC.connect(owner).configureMinter(
        minter.address,
        expandTo6Decimals(500)
      );
      await expect(
        INRC.connect(addr1).removeMinter(minter.address)
      ).to.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Blacklist Management", function () {
    it("should blacklist user", async function () {
      await INRC.connect(owner).blacklistUser(addr1.address);
      expect(await INRC.checkBlacklist(addr1.address)).to.equal(true);
    });
    it("should revert if called by non-owner", async function () {
      await expect(
        INRC.connect(addr1).blacklistUser(addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should remove user from blacklist", async function () {
      await INRC.blacklistUser(addr1.address);
      await INRC.removeBlacklist(addr1.address);
      expect(await INRC.checkBlacklist(addr1.address)).to.equal(false);
    });
    it("should revert if called by non-owner", async function () {
      await expect(
        INRC.connect(addr1).removeBlacklist(addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Management", function () {
    it("should update fees", async function () {
      await INRC.connect(owner).updateFee(200, 20); // 2% fee, max 20 tokens
      expect(await INRC.basisPointsRate()).to.equal(200);
      expect(await INRC.maximumFee()).to.equal(
        20 * 10 ** (await INRC.decimals())
      );
    });
    it("should revert update fees if called by non-owner", async function () {
      await expect(INRC.connect(addr1).updateFee(200, 20)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      ); // 2% fee, max 20 tokens
    });

    it("should exclude from fee", async () => {
      await INRC.connect(owner).excludeFromFee(addr1.address, true);
      expect(await INRC.isExcludedFromFee(addr1.address)).to.be.eq(true);
    });
    it("should revert exclude from fee if called by non-owner", async () => {
      await expect(
        INRC.connect(addr1).excludeFromFee(addr1.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Contract Pausing functions", function () {
    it("Should pause the contract", async () => {
      await INRC.connect(owner).togglePause(true);
      expect(await INRC.isPaused()).to.be.eq(true);
    });
    it("Should unpause the contract", async () => {
      await INRC.connect(owner).togglePause(true);
      await INRC.connect(owner).togglePause(false);
      expect(await INRC.isPaused()).to.be.eq(false);
    });
    it("Should revert pause the contract if called by non-owner", async () => {
      await expect(INRC.connect(addr1).togglePause(true)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should revert pause the contract if already paused", async () => {
      await INRC.connect(owner).togglePause(true);
      await expect(INRC.connect(owner).togglePause(true)).to.be.revertedWith(
        "Contract is already Paused !"
      );
    });
    it("Should revert unpause the contract if already unpaused", async () => {
      await expect(INRC.connect(owner).togglePause(false)).to.be.revertedWith(
        "Contract is already Unpaused !"
      );
    });
  });
});
