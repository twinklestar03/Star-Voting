//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "contracts/interfaces/IStarVoting.sol";
import "contracts/interfaces/IStarVotingVerifier.sol";
import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";

/// @title Semaphore voting contract.
/// @notice It allows users to vote anonymously in a poll.
/// @dev The following code allows you to create polls, add voters and allow them to vote anonymously.
contract StarVoting is IStarVoting, SemaphoreGroups {
    IStarVotingVerifier public verifier;

    /// @dev Gets a poll id and returns the poll data.
    mapping(uint256 => Poll) internal polls;

    /// @dev Checks if the poll coordinator is the transaction sender.
    /// @param pollId: Id of the poll.
    modifier onlyCoordinator(uint256 pollId) {
        if (polls[pollId].coordinator != _msgSender()) {
            revert Semaphore__CallerIsNotThePollCoordinator();
        }
        _;
    }

    /// @dev Initializes the Semaphore verifier used to verify the user's ZK proofs.
    /// @param _verifier: Semaphore verifier address.
    constructor(IStarVotingVerifier _verifier) {
        verifier = _verifier;
    }

    /// @dev See {IStarVoting-createPoll}.
    function createPoll(uint256 pollId, address coordinator, uint256 merkleTreeDepth, bool livePoll, string calldata encryptedInfo) public override {
        if (merkleTreeDepth < 16 || merkleTreeDepth > 32) {
            revert Semaphore__MerkleTreeDepthIsNotSupported();
        }

        _createGroup(pollId, merkleTreeDepth);

        // Setup poll data
        polls[pollId].coordinator = coordinator;
        polls[pollId].encryptedPollInfo = encryptedInfo;
        polls[pollId].livePoll = livePoll;

        emit PollCreated(pollId, coordinator);
    }

    /// @dev See {IStarVoting-addVoter}.
    function addVoter(uint256 pollId, uint256 identityCommitment) public override onlyCoordinator(pollId) {
        if (polls[pollId].state != PollState.Created) {
            revert Semaphore__PollHasAlreadyBeenStarted();
        }

        _addMember(pollId, identityCommitment);
    }

    /// @dev See {IStarVoting-addVoter}.
    function startPoll(uint256 pollId, string calldata encryptionKey) public override onlyCoordinator(pollId) {
        if (polls[pollId].state != PollState.Created) {
            revert Semaphore__PollHasAlreadyBeenStarted();
        }

        polls[pollId].state = PollState.Ongoing;
        polls[pollId].encryptionKey = encryptionKey;

        emit PollStarted(pollId, _msgSender(), encryptionKey);
    }

    /// @dev See {IStarVoting-castVote}.
    function castVote(uint256[13] calldata vote, uint256 nullifierHash, uint256 pollId, uint256[8] calldata proof) public override {
        if (polls[pollId].state != PollState.Ongoing) {
            revert Semaphore__PollIsNotOngoing();
        }

        if (polls[pollId].nullifierHashes[nullifierHash]) {
            revert Semaphore__YouAreUsingTheSameNillifierTwice();
        }

        uint256 merkleTreeDepth = getMerkleTreeDepth(pollId);
        uint256 merkleTreeRoot = getMerkleTreeRoot(pollId);

        verifier.verifyProof(merkleTreeRoot, nullifierHash, vote, pollId, proof, merkleTreeDepth);
        // nullify the voter
        polls[pollId].nullifierHashes[nullifierHash] = true;

        emit VoteAdded(pollId, vote);
    }

    /// @dev See {IStarVoting-publishDecryptionKey}.
    function endPoll(uint256 pollId, string calldata decryptionKey) public override onlyCoordinator(pollId) {
        if (polls[pollId].state != PollState.Ongoing) {
            revert Semaphore__PollIsNotOngoing();
        }

        polls[pollId].state = PollState.Ended;
        polls[pollId].decryptionKey = decryptionKey;

        emit PollEnded(pollId, _msgSender(), decryptionKey);
    }

    // @dev See {IStarVoting-getEncryptionKey}.
    function getEncryptionKey(uint256 pollId) public override view returns (string memory) {
        if (polls[pollId].state != PollState.Ongoing) {
            return "";
        }

        return polls[pollId].encryptionKey;
    }

    // @dev See {IStarVoting-getDecryptionKey}.
    function getDecryptionKey(uint256 pollId) public override view returns (string memory) {
        if (polls[pollId].state != PollState.Ended) {
            return "";
        }

        return polls[pollId].decryptionKey;
    }
}