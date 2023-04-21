/* eslint-disable jest/valid-expect */
import { BigNumber } from "@ethersproject/bignumber";
import { Hexable, zeroPad } from "@ethersproject/bytes";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  FullProof,
  SnarkArtifacts,
  SnarkJSProof,
  Proof,
} from "@semaphore-protocol/proof";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, run } from "hardhat";
import { Pairing, StarVoting } from "../build/typechain";
import { BytesLike, keccak256 } from "ethers/lib/utils";
import { MerkleProof } from "@zk-kit/incremental-merkle-tree";
const groth16 = require("snarkjs").groth16;

function packProof(originalProof: SnarkJSProof): Proof {
  return [
    originalProof.pi_a[0],
    originalProof.pi_a[1],
    originalProof.pi_b[0][1],
    originalProof.pi_b[0][0],
    originalProof.pi_b[1][1],
    originalProof.pi_b[1][0],
    originalProof.pi_c[0],
    originalProof.pi_c[1],
  ];
}

function hashBytes(message: BytesLike): bigint {
  return BigInt(keccak256(message)) >> BigInt(8);
}

function hash(message: BytesLike | Hexable | number | bigint): bigint {
  message = BigNumber.from(message).toTwos(256).toHexString();
  message = zeroPad(message, 32);

  return BigInt(keccak256(message)) >> BigInt(8);
}

async function generateProof(
  { trapdoor, nullifier, commitment }: Identity,
  groupOrMerkleProof: Group | MerkleProof,
  externalNullifier: BytesLike | Hexable | number | bigint,
  signal: BytesLike,
  snarkArtifacts?: SnarkArtifacts
): Promise<FullProof> {
  let merkleProof: MerkleProof;

  if ("depth" in groupOrMerkleProof) {
    const index = groupOrMerkleProof.indexOf(commitment);

    if (index === -1) {
      throw new Error("The identity is not part of the group");
    }

    merkleProof = groupOrMerkleProof.generateMerkleProof(index);
  } else {
    merkleProof = groupOrMerkleProof;
  }

  if (!snarkArtifacts) {
    snarkArtifacts = {
      wasmFilePath: `https://www.trusted-setup-pse.org/semaphore/${merkleProof.siblings.length}/semaphore.wasm`,
      zkeyFilePath: `https://www.trusted-setup-pse.org/semaphore/${merkleProof.siblings.length}/semaphore.zkey`,
    };
  }

  const { proof, publicSignals } = await groth16.fullProve(
    {
      identityTrapdoor: trapdoor,
      identityNullifier: nullifier,
      treePathIndices: merkleProof.pathIndices,
      treeSiblings: merkleProof.siblings,
      externalNullifier: hash(externalNullifier),
      signalHash: hashBytes(signal),
    },
    snarkArtifacts.wasmFilePath,
    snarkArtifacts.zkeyFilePath
  );

  return {
    merkleTreeRoot: publicSignals[0],
    nullifierHash: publicSignals[1],
    signal: BigNumber.from(signal).toString(),
    externalNullifier: BigNumber.from(externalNullifier).toString(),
    proof: packProof(proof),
  };
}

describe("StarVoting", () => {
  let starVotingContract: StarVoting;
  let pairingContract: Pairing;
  let accounts: Signer[];
  let coordinator: string;

  const treeDepth = Number(process.env.TREE_DEPTH) || 20;
  const pollIds = [1, 2, 3, 4, 5];
  const encryptionKey = "I'm a encryption key";
  const decryptionKey = "I'm a decryption key";

  const encryptedPollInfo = "Fuck";

  const wasmFilePath = `./snark-artifacts/${treeDepth}/semaphore.wasm`;
  const zkeyFilePath = `./snark-artifacts/${treeDepth}/semaphore.zkey`;

  before(async () => {
    const { starVoting, pairingAddress } = await run("deploy:star-voting", {
      logs: true,
    });

    starVotingContract = starVoting;
    pairingContract = await ethers.getContractAt("Pairing", pairingAddress);

    accounts = await ethers.getSigners();
    coordinator = await accounts[1].getAddress();
  });

  describe("# createPoll", () => {
    it("Should not create a poll with a wrong depth", async () => {
      const transaction = starVotingContract.createPoll(
        pollIds[0],
        coordinator,
        10,
        false,
        true,
        encryptedPollInfo
      );

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__MerkleTreeDepthIsNotSupported"
      );
    });

    it("Should create a non-live poll", async () => {
      const transaction = starVotingContract.createPoll(
        pollIds[0],
        coordinator,
        treeDepth,
        false,
        true,
        encryptedPollInfo
      );

      await expect(transaction)
        .to.emit(starVotingContract, "PollCreated")
        .withArgs(pollIds[0], coordinator);
    });

    it("Should create a live poll", async () => {
      const transaction = starVotingContract.createPoll(
        pollIds[1],
        coordinator,
        treeDepth,
        false,
        true,
        encryptedPollInfo
      );

      await expect(transaction)
        .to.emit(starVotingContract, "PollCreated")
        .withArgs(pollIds[1], coordinator);
    });

    it("Should create a public poll", async () => {
      const transaction = starVotingContract.createPoll(
        pollIds[4],
        coordinator,
        treeDepth,
        false,
        false,
        encryptedPollInfo
      );

      await expect(transaction)
        .to.emit(starVotingContract, "PollCreated")
        .withArgs(pollIds[4], coordinator);
    });

    it("Should not create a poll if it already exists", async () => {
      const transaction = starVotingContract.createPoll(
        pollIds[0],
        coordinator,
        treeDepth,
        false,
        true,
        encryptedPollInfo
      );

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__GroupAlreadyExists"
      );
    });

    it("Should able to get correct poll stats", async () => {
      const encryptedPollInfo = await starVotingContract.getEncryptedPollInfo(
        pollIds[1]
      );
      const isLive = await starVotingContract.isLivePoll(pollIds[1]);
      const isPrivate = await starVotingContract.isPrivatePoll(pollIds[1]);

      expect(isPrivate).to.be.true;
      expect(isLive).to.be.false;
    });
  });

  describe("# startPoll", () => {
    it("Should not start the poll if the caller is not the coordinator", async () => {
      const transaction = starVotingContract.startPoll(
        pollIds[0],
        encryptionKey
      );

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__CallerIsNotThePollCoordinator"
      );
    });

    it("Should start the poll", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .startPoll(pollIds[0], encryptionKey);

      await expect(transaction)
        .to.emit(starVotingContract, "PollStarted")
        .withArgs(pollIds[0], coordinator, encryptionKey);
    });

    it("Should not start a poll if it has already been started", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .startPoll(pollIds[0], encryptionKey);

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__PollHasAlreadyBeenStarted"
      );
    });

    it("Should able to get encryptionKey of the poll after the poll has been started", async () => {
      const key = await starVotingContract.getEncryptionKey(pollIds[0]);

      expect(key).to.equal(encryptionKey);
    });
  });

  describe("# addVoter", () => {
    before(async () => {
      await starVotingContract.createPoll(
        pollIds[2],
        coordinator,
        treeDepth,
        false,
        true,
        encryptedPollInfo
      );
    });

    it("Should not add a voter to private poll if the caller is not the coordinator", async () => {
      const { commitment } = new Identity();

      const transaction = starVotingContract.addVoter(pollIds[0], commitment);

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__CallerIsNotThePollCoordinator"
      );
    });

    it("Should able to add a voter to public poll if the caller is not the coordinator", async () => {
      const { commitment } = new Identity();
      const group = new Group(pollIds[4], treeDepth);
      const transaction = starVotingContract.addVoter(pollIds[4], commitment);

      group.addMember(commitment);

      await expect(transaction)
        .to.emit(starVotingContract, "MemberAdded")
        .withArgs(pollIds[4], 0, commitment, group.root);
    });

    it("Should not add a voter if the poll has already been started", async () => {
      const { commitment } = new Identity();

      const transaction = starVotingContract
        .connect(accounts[1])
        .addVoter(pollIds[0], commitment);

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__PollHasAlreadyBeenStarted"
      );
    });

    it("Should add a voter to an existing poll", async () => {
      const { commitment } = new Identity("test");
      const group = new Group(pollIds[2], treeDepth);

      group.addMember(commitment);

      const transaction = starVotingContract
        .connect(accounts[1])
        .addVoter(pollIds[2], commitment);

      await expect(transaction)
        .to.emit(starVotingContract, "MemberAdded")
        .withArgs(pollIds[2], 0, commitment, group.root);
    });

    it("Should return the correct number of poll voters", async () => {
      const size = await starVotingContract.getNumberOfMerkleTreeLeaves(
        pollIds[2]
      );

      expect(size).to.be.eq(1);
    });
  });

  describe("# castVote", () => {
    const identity = new Identity("test");

    // Serialize BigInt[13] to string
    const voteData = "123123";

    const group = new Group(pollIds[2], treeDepth);

    group.addMembers([identity.commitment, BigInt(1)]);

    let fullProof: FullProof;

    before(async () => {
      await starVotingContract
        .connect(accounts[1])
        .addVoter(pollIds[2], BigInt(1));
      await starVotingContract
        .connect(accounts[1])
        .startPoll(pollIds[2], encryptionKey);
      await starVotingContract.createPoll(
        pollIds[3],
        coordinator,
        treeDepth,
        false,
        true,
        encryptedPollInfo
      );

      fullProof = await generateProof(
        identity,
        group,
        pollIds[2],
        Buffer.from(voteData),
        {
          wasmFilePath,
          zkeyFilePath,
        }
      );
    });

    it("Should not cast a vote if the poll is not ongoing", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .castVote(
          voteData,
          fullProof.nullifierHash,
          pollIds[3],
          fullProof.proof
        );

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__PollIsNotOngoing"
      );
    });

    it("Should not cast a vote if the proof is not valid", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .castVote(voteData, 0, pollIds[2], fullProof.proof);

      await expect(transaction).to.be.revertedWithCustomError(
        pairingContract,
        "InvalidProof"
      );
    });

    it("Should cast a vote", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .castVote(
          voteData,
          fullProof.nullifierHash,
          pollIds[2],
          fullProof.proof
        );

      await expect(transaction)
        .to.emit(starVotingContract, "VoteAdded")
        .withArgs(pollIds[2], voteData);
    });

    it("Should not cast a vote twice", async () => {
      const transaction = starVotingContract
        .connect(accounts[2])
        .castVote(
          voteData,
          fullProof.nullifierHash,
          pollIds[2],
          fullProof.proof
        );

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__YouAreUsingTheSameNillifierTwice"
      );
    });
  });

  describe("# endPoll", () => {
    it("Should not end the poll if the caller is not the coordinator", async () => {
      const transaction = starVotingContract.endPoll(pollIds[1], decryptionKey);

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__CallerIsNotThePollCoordinator"
      );
    });

    it("Should end the poll", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .endPoll(pollIds[2], decryptionKey);

      await expect(transaction)
        .to.emit(starVotingContract, "PollEnded")
        .withArgs(pollIds[2], coordinator, decryptionKey);
    });

    it("Should not end a poll if it has already been ended", async () => {
      const transaction = starVotingContract
        .connect(accounts[1])
        .endPoll(pollIds[1], decryptionKey);

      await expect(transaction).to.be.revertedWithCustomError(
        starVotingContract,
        "Semaphore__PollIsNotOngoing"
      );
    });

    it("Should able to get decryptionKey after poll ended", async () => {
      const key = await starVotingContract.getDecryptionKey(pollIds[2]);

      expect(key).to.be.eq(decryptionKey);
    });
  });
});
