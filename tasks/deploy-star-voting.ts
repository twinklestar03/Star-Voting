const poseidonContract = require("circomlibjs").poseidonContract
import { task, types } from "hardhat/config"

task("deploy:star-voting", "Deploy a StarVoting Contract")
    .addOptionalParam<boolean>("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs }, { ethers }): Promise<any> => {
        const PairingFactory = await ethers.getContractFactory("Pairing")
        const pairing = await PairingFactory.deploy()

        await pairing.deployed()

        if (logs) {
            console.info(`Pairing library has been deployed to: ${pairing.address}`)
        }

        const StarVotingVerifierFactory = await ethers.getContractFactory("StarVotingVerifier", {
            libraries: {
                Pairing: pairing.address
            }
        })

        const starVotingVerifier = await StarVotingVerifierFactory.deploy()

        await starVotingVerifier.deployed()

        if (logs) {
            console.info(`StarVotingVerifier contract has been deployed to: ${starVotingVerifier.address}`)
        }

        const poseidonABI = poseidonContract.generateABI(2)
        const poseidonBytecode = poseidonContract.createCode(2)

        const [signer] = await ethers.getSigners()

        const PoseidonFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, signer)
        const poseidon = await PoseidonFactory.deploy()

        await poseidon.deployed()

        if (logs) {
            console.info(`Poseidon library has been deployed to: ${poseidon.address}`)
        }

        const IncrementalBinaryTreeFactory = await ethers.getContractFactory("IncrementalBinaryTree", {
            libraries: {
                PoseidonT3: poseidon.address
            }
        })
        const incrementalBinaryTree = await IncrementalBinaryTreeFactory.deploy()

        await incrementalBinaryTree.deployed()

        if (logs) {
            console.info(`IncrementalBinaryTree library has been deployed to: ${incrementalBinaryTree.address}`)
        }

        const StarVotingFactory = await ethers.getContractFactory("StarVoting", {
            libraries: {
                IncrementalBinaryTree: incrementalBinaryTree.address
            }
        })

        const starVoting = await StarVotingFactory.deploy(starVotingVerifier.address)

        await starVoting.deployed()

        if (logs) {
            console.info(`StarVoting contract has been deployed to: ${starVoting.address}`)
        }

        return {
            starVoting: starVoting,
            pairingAddress: pairing.address,
            starVotingVerifierAddress: starVotingVerifier.address,
            poseidonAddress: poseidon.address,
            incrementalBinaryTreeAddress: incrementalBinaryTree.address
        }
    })
