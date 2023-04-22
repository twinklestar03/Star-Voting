const hre = require("hardhat");
const poseidonContract = require("circomlibjs").poseidonContract;

const logs = true;
async function main() {
  const PairingFactory = await hre.ethers.getContractFactory("Pairing");
  const pairing = await PairingFactory.deploy();

  await pairing.deployed();

  if (logs) {
    console.info(`Pairing library has been deployed to: ${pairing.address}`);
  }

  const StarVotingVerifierFactory = await hre.ethers.getContractFactory(
    "StarVotingVerifier",
    {
      libraries: {
        Pairing: pairing.address,
      },
    }
  );

  const starVotingVerifier = await StarVotingVerifierFactory.deploy();

  await starVotingVerifier.deployed();

  if (logs) {
    console.info(
      `StarVotingVerifier contract has been deployed to: ${starVotingVerifier.address}`
    );
  }

  const poseidonABI = poseidonContract.generateABI(2);
  const poseidonBytecode = poseidonContract.createCode(2);

  const [signer] = await hre.ethers.getSigners();

  const PoseidonFactory = new hre.ethers.ContractFactory(
    poseidonABI,
    poseidonBytecode,
    signer
  );
  const poseidon = await PoseidonFactory.deploy();

  await poseidon.deployed();

  if (logs) {
    console.info(`Poseidon library has been deployed to: ${poseidon.address}`);
  }

  const IncrementalBinaryTreeFactory = await hre.ethers.getContractFactory(
    "IncrementalBinaryTree",
    {
      libraries: {
        PoseidonT3: poseidon.address,
      },
    }
  );
  const incrementalBinaryTree = await IncrementalBinaryTreeFactory.deploy();

  await incrementalBinaryTree.deployed();

  if (logs) {
    console.info(
      `IncrementalBinaryTree library has been deployed to: ${incrementalBinaryTree.address}`
    );
  }

  const StarVotingFactory = await hre.ethers.getContractFactory("StarVoting", {
    libraries: {
      IncrementalBinaryTree: incrementalBinaryTree.address,
    },
  });

  const starVoting = await StarVotingFactory.deploy(starVotingVerifier.address);

  await starVoting.deployed();

  if (logs) {
    console.info(
      `StarVoting contract has been deployed to: ${starVoting.address}`
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
