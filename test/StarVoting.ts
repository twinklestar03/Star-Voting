/* eslint-disable jest/valid-expect */
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { FullProof, generateProof } from "@semaphore-protocol/proof"
import { expect } from "chai"
import { Signer } from "ethers"
import { ethers, run } from "hardhat"
import { Pairing, StarVoting } from "../build/typechain"
import { Bytes, BytesLike, keccak256 } from "ethers/lib/utils"

describe("SemaphoreVoting", () => {
    let starVotingContract: StarVoting
    let pairingContract: Pairing
    let accounts: Signer[]
    let coordinator: string

    const treeDepth = Number(process.env.TREE_DEPTH) || 20
    const pollIds = [1, 2, 3, 4]
    const encryptionKey = BigInt(0).toString()
    const decryptionKey = BigInt(0).toString()

    const encryptedPollInfo = "Fuck"

    const wasmFilePath = `./snark-artifacts/${treeDepth}/semaphore.wasm`
    const zkeyFilePath = `./snark-artifacts/${treeDepth}/semaphore.zkey`

    before(async () => {
        const { starVoting, pairingAddress } = await run("deploy:star-voting", {
            logs: true
        })

        starVotingContract = starVoting
        pairingContract = await ethers.getContractAt("Pairing", pairingAddress)

        accounts = await ethers.getSigners()
        coordinator = await accounts[1].getAddress()
    })

    describe("# createPoll", () => {
        it("Should not create a poll with a wrong depth", async () => {
            const transaction = starVotingContract.createPoll(pollIds[0], coordinator, 10, false, encryptedPollInfo)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__MerkleTreeDepthIsNotSupported"
            )
        })

        it("Should create a non-live poll", async () => {
            const transaction = starVotingContract.createPoll(pollIds[0], coordinator, treeDepth, false, encryptedPollInfo)

            await expect(transaction).to.emit(starVotingContract, "PollCreated").withArgs(pollIds[0], coordinator)
        })

        it("Should create a live poll", async () => {
            const transaction = starVotingContract.createPoll(pollIds[1], coordinator, treeDepth, true, encryptedPollInfo)

            await expect(transaction).to.emit(starVotingContract, "PollCreated").withArgs(pollIds[1], coordinator)
        })

        it("Should not create a poll if it already exists", async () => {
            const transaction = starVotingContract.createPoll(pollIds[0], coordinator, treeDepth, false, encryptedPollInfo)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__GroupAlreadyExists"
            )
        })
    })

    describe("# startPoll", () => {
        it("Should not start the poll if the caller is not the coordinator", async () => {
            const transaction = starVotingContract.startPoll(pollIds[0], encryptionKey)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__CallerIsNotThePollCoordinator"
            )
        })

        it("Should start the poll", async () => {
            const transaction = starVotingContract.connect(accounts[1]).startPoll(pollIds[0], encryptionKey)

            await expect(transaction)
                .to.emit(starVotingContract, "PollStarted")
                .withArgs(pollIds[0], coordinator, encryptionKey)
        })

        it("Should not start a poll if it has already been started", async () => {
            const transaction = starVotingContract.connect(accounts[1]).startPoll(pollIds[0], encryptionKey)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__PollHasAlreadyBeenStarted"
            )
        })
    })

    describe("# addVoter", () => {
        before(async () => {
            await starVotingContract.createPoll(pollIds[2], coordinator, treeDepth, false, encryptedPollInfo)
        })

        it("Should not add a voter if the caller is not the coordinator", async () => {
            const { commitment } = new Identity()

            const transaction = starVotingContract.addVoter(pollIds[0], commitment)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__CallerIsNotThePollCoordinator"
            )
        })

        it("Should not add a voter if the poll has already been started", async () => {
            const { commitment } = new Identity()

            const transaction = starVotingContract.connect(accounts[1]).addVoter(pollIds[0], commitment)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__PollHasAlreadyBeenStarted"
            )
        })

        it("Should add a voter to an existing poll", async () => {
            const { commitment } = new Identity("test")
            const group = new Group(pollIds[2], treeDepth)

            group.addMember(commitment)

            const transaction = starVotingContract.connect(accounts[1]).addVoter(pollIds[2], commitment)

            await expect(transaction)
                .to.emit(starVotingContract, "MemberAdded")
                .withArgs(pollIds[2], 0, commitment, group.root)
        })

        it("Should return the correct number of poll voters", async () => {
            const size = await starVotingContract.getNumberOfMerkleTreeLeaves(pollIds[2])

            expect(size).to.be.eq(1)
        })
    })

    describe("# castVote", () => {
        const identity = new Identity("test")
        
        let vote: BigInt[] = [];
        for(let i = 0; i < 13; i++) {
            vote.push(BigInt(i+1));
        }
        
        // BigInt[] to string
        // const voteData = vote.map((v) => v.toString()).join("")
        const voteData = 1

        const group = new Group(pollIds[2], treeDepth)

        group.addMembers([identity.commitment, BigInt(1)])

        let fullProof: FullProof

        before(async () => {
            await starVotingContract.connect(accounts[1]).addVoter(pollIds[2], BigInt(1))
            await starVotingContract.connect(accounts[1]).startPoll(pollIds[2], encryptionKey)
            await starVotingContract.createPoll(pollIds[3], coordinator, treeDepth, false, encryptedPollInfo)

            fullProof = await generateProof(identity, group, pollIds[2], voteData, {
                wasmFilePath,
                zkeyFilePath
            })
        })

        it("Should not cast a vote if the poll is not ongoing", async () => {
            const transaction = starVotingContract
                .connect(accounts[1])
                .castVote(voteData, fullProof.nullifierHash, pollIds[3], fullProof.proof)

            await expect(transaction).to.be.revertedWithCustomError(
                starVotingContract,
                "Semaphore__PollIsNotOngoing"
            )
        })

        it("Should not cast a vote if the proof is not valid", async () => {
            const transaction = starVotingContract
                .connect(accounts[1])
                .castVote(voteData, 0, pollIds[2], fullProof.proof)

            await expect(transaction).to.be.revertedWithCustomError(pairingContract, "InvalidProof")
        })

        it("Should cast a vote", async () => {
            const transaction = starVotingContract
                .connect(accounts[1])
                .castVote(voteData, fullProof.nullifierHash, pollIds[2], fullProof.proof)

            await expect(transaction).to.emit(starVotingContract, "VoteAdded").withArgs(pollIds[2], voteData)
        })

        // it("Should not cast a vote twice", async () => {
        //     const transaction = starVotingContract
        //         .connect(accounts[1])
        //         .castVote(vote, fullProof.nullifierHash, pollIds[1], fullProof.proof)

        //     await expect(transaction).to.be.revertedWithCustomError(
        //         starVotingContract,
        //         "Semaphore__YouAreUsingTheSameNillifierTwice"
        //     )
        // })
    })

    // describe("# endPoll", () => {
    //     it("Should not end the poll if the caller is not the coordinator", async () => {
    //         const transaction = starVotingContract.endPoll(pollIds[1], decryptionKey)

    //         await expect(transaction).to.be.revertedWithCustomError(
    //             starVotingContract,
    //             "Semaphore__CallerIsNotThePollCoordinator"
    //         )
    //     })

    //     it("Should end the poll", async () => {
    //         const transaction = starVotingContract.connect(accounts[1]).endPoll(pollIds[1], encryptionKey)

    //         await expect(transaction)
    //             .to.emit(starVotingContract, "PollEnded")
    //             .withArgs(pollIds[1], coordinator, decryptionKey)
    //     })

    //     it("Should not end a poll if it has already been ended", async () => {
    //         const transaction = starVotingContract.connect(accounts[1]).endPoll(pollIds[1], encryptionKey)

    //         await expect(transaction).to.be.revertedWithCustomError(
    //             starVotingContract,
    //             "Semaphore__PollIsNotOngoing"
    //         )
    //     })
    // })
})
