// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ProofCircles
 * @notice Small temporary groups of Agent ID holders. Each member submits a signed
 *         contribution. When the threshold is reached the circle is sealed: one
 *         attestation hash is stored and a soulbound proof NFT is minted to every
 *         contributor. Other contracts verify with verifyProof().
 *
 *         Every state-changing action requires the caller to hold an Agent ID.
 */
contract ProofCircles is ERC721, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotAgent();
    error BadParams();
    error BadFunding();
    error Closed();
    error NotJoined();
    error AlreadyDone();
    error BadSignature();
    error Unauthorized();
    error NothingToClaim();
    error Soulbound();
    error TransferFailed();

    struct Circle {
        address creator;
        uint64 deadline;
        uint64 finalizedAt;
        uint8 threshold;
        uint8 maxParticipants;
        bool finalized;
        bool cancelled;
        address rewardToken; // address(0) means native BNB
        uint256 rewardAmount;
        bytes32 attestation;
        string description;
    }

    struct Contribution {
        bytes32 dataHash;
        uint64 at;
        string metadataURI;
    }

    struct CircleView {
        uint256 id;
        address creator;
        uint64 deadline;
        uint64 finalizedAt;
        uint8 threshold;
        uint8 maxParticipants;
        uint256 participantCount;
        uint256 contributionCount;
        bool finalized;
        bool cancelled;
        address rewardToken;
        uint256 rewardAmount;
        bytes32 attestation;
        string description;
    }

    uint256 public constant MAX_PARTICIPANTS = 50;
    uint256 public constant MAX_DESCRIPTION = 280;

    /// @notice The soulbound Agent ID collection used as the identity gate.
    IERC721 public immutable agentId;

    uint256 public circleCount;
    uint256 public proofCount;

    mapping(uint256 => Circle) private _circles;
    mapping(uint256 => address[]) private _participants;
    mapping(uint256 => address[]) private _contributors;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => Contribution)) private _contributions;
    mapping(uint256 => mapping(address => bool)) public hasProof;
    mapping(uint256 => uint256) public proofCircle; // proof token id => circle id
    mapping(address => uint256[]) private _proofsOf;
    mapping(address => mapping(address => uint256)) public claimable; // token => account => amount

    event CircleCreated(uint256 indexed id, address indexed creator, uint8 threshold, uint8 maxParticipants, uint64 deadline, address rewardToken, uint256 rewardAmount, string description);
    event Joined(uint256 indexed id, address indexed account);
    event ContributionSubmitted(uint256 indexed id, address indexed account, bytes32 dataHash, string metadataURI, bytes signature);
    event ProofIssued(uint256 indexed id, bytes32 indexed attestation, uint256 contributors);
    event CircleCancelled(uint256 indexed id);
    event Claimed(address indexed account, address indexed token, uint256 amount);

    modifier onlyAgent() {
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgent();
        _;
    }

    constructor(address agentId_) ERC721("Proof Circles Attestation", "PROOF") {
        if (agentId_ == address(0)) revert BadParams();
        agentId = IERC721(agentId_);
    }

    // ---------------------------------------------------------------- write

    function createCircle(
        string calldata description,
        uint8 threshold,
        uint8 maxParticipants,
        uint64 deadline,
        address rewardToken,
        uint256 rewardAmount
    ) external payable onlyAgent nonReentrant returns (uint256 id) {
        uint256 len = bytes(description).length;
        if (len == 0 || len > MAX_DESCRIPTION) revert BadParams();
        if (threshold < 2 || maxParticipants < threshold || maxParticipants > MAX_PARTICIPANTS) revert BadParams();
        if (deadline <= block.timestamp) revert BadParams();

        if (rewardToken == address(0)) {
            if (msg.value != rewardAmount) revert BadFunding();
        } else {
            if (msg.value != 0) revert BadFunding();
            if (rewardAmount > 0) IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), rewardAmount);
        }

        id = ++circleCount;
        Circle storage c = _circles[id];
        c.creator = msg.sender;
        c.deadline = deadline;
        c.threshold = threshold;
        c.maxParticipants = maxParticipants;
        c.rewardToken = rewardToken;
        c.rewardAmount = rewardAmount;
        c.description = description;

        _join(id, msg.sender);
        emit CircleCreated(id, msg.sender, threshold, maxParticipants, deadline, rewardToken, rewardAmount, description);
    }

    function joinCircle(uint256 id) external onlyAgent {
        Circle storage c = _open(id);
        if (isParticipant[id][msg.sender]) revert AlreadyDone();
        if (_participants[id].length >= c.maxParticipants) revert Closed();
        _join(id, msg.sender);
    }

    /**
     * @param dataHash     keccak256 of the observation. The content itself stays off chain.
     * @param metadataURI  optional pointer (IPFS, https) to the full observation.
     * @param signature    EIP-191 signature by the caller over contributionDigest().
     */
    function submitContribution(uint256 id, bytes32 dataHash, string calldata metadataURI, bytes calldata signature)
        external
        onlyAgent
        nonReentrant
    {
        Circle storage c = _open(id);
        if (!isParticipant[id][msg.sender]) revert NotJoined();
        Contribution storage k = _contributions[id][msg.sender];
        if (k.at != 0) revert AlreadyDone();
        if (dataHash == bytes32(0)) revert BadParams();

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(contributionDigest(id, msg.sender, dataHash));
        if (ECDSA.recover(digest, signature) != msg.sender) revert BadSignature();

        k.dataHash = dataHash;
        k.at = uint64(block.timestamp);
        k.metadataURI = metadataURI;
        _contributors[id].push(msg.sender);
        emit ContributionSubmitted(id, msg.sender, dataHash, metadataURI, signature);

        if (_contributors[id].length == c.threshold) _finalize(id, c);
    }

    /// @notice Creator can cancel any time before sealing. Anyone can cancel after the deadline.
    function cancelCircle(uint256 id) external {
        if (id == 0 || id > circleCount) revert BadParams();
        Circle storage c = _circles[id];
        if (c.finalized || c.cancelled) revert Closed();
        if (msg.sender != c.creator && block.timestamp <= c.deadline) revert Unauthorized();
        c.cancelled = true;
        if (c.rewardAmount > 0) claimable[c.rewardToken][c.creator] += c.rewardAmount;
        emit CircleCancelled(id);
    }

    /// @notice Withdraw reward shares or refunds. Use address(0) for BNB.
    function claim(address token) external nonReentrant {
        uint256 amount = claimable[token][msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[token][msg.sender] = 0;
        if (token == address(0)) {
            (bool ok,) = msg.sender.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
        emit Claimed(msg.sender, token, amount);
    }

    // ----------------------------------------------------------------- view

    /// @notice The 32 byte message a contributor signs (with EIP-191 prefix applied by the wallet).
    function contributionDigest(uint256 id, address contributor, bytes32 dataHash) public view returns (bytes32) {
        return keccak256(abi.encodePacked(block.chainid, address(this), id, contributor, dataHash));
    }

    /// @notice Integration point for other dApps.
    function verifyProof(uint256 id, address account) external view returns (bool valid, bytes32 attestation) {
        Circle storage c = _circles[id];
        return (c.finalized && hasProof[id][account], c.attestation);
    }

    function getCircle(uint256 id) public view returns (CircleView memory v) {
        if (id == 0 || id > circleCount) revert BadParams();
        Circle storage c = _circles[id];
        v.id = id;
        v.creator = c.creator;
        v.deadline = c.deadline;
        v.finalizedAt = c.finalizedAt;
        v.threshold = c.threshold;
        v.maxParticipants = c.maxParticipants;
        v.participantCount = _participants[id].length;
        v.contributionCount = _contributors[id].length;
        v.finalized = c.finalized;
        v.cancelled = c.cancelled;
        v.rewardToken = c.rewardToken;
        v.rewardAmount = c.rewardAmount;
        v.attestation = c.attestation;
        v.description = c.description;
    }

    /// @notice Newest first. offset 0 starts at the latest circle.
    function getCircles(uint256 offset, uint256 limit) external view returns (CircleView[] memory out) {
        uint256 total = circleCount;
        if (offset >= total) return out;
        uint256 n = total - offset;
        if (n > limit) n = limit;
        out = new CircleView[](n);
        for (uint256 i = 0; i < n; i++) out[i] = getCircle(total - offset - i);
    }

    function getParticipants(uint256 id) external view returns (address[] memory) {
        return _participants[id];
    }

    function getContributors(uint256 id) external view returns (address[] memory) {
        return _contributors[id];
    }

    function getContribution(uint256 id, address account) external view returns (Contribution memory) {
        return _contributions[id][account];
    }

    function getProofs(address account) external view returns (uint256[] memory ids, CircleView[] memory circles) {
        ids = _proofsOf[account];
        circles = new CircleView[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) circles[i] = getCircle(proofCircle[ids[i]]);
    }

    // ------------------------------------------------------------- internal

    function _open(uint256 id) internal view returns (Circle storage c) {
        if (id == 0 || id > circleCount) revert BadParams();
        c = _circles[id];
        if (c.finalized || c.cancelled || block.timestamp > c.deadline) revert Closed();
    }

    function _join(uint256 id, address account) internal {
        isParticipant[id][account] = true;
        _participants[id].push(account);
        emit Joined(id, account);
    }

    function _finalize(uint256 id, Circle storage c) internal {
        c.finalized = true;
        c.finalizedAt = uint64(block.timestamp);

        address[] storage list = _contributors[id];
        uint256 n = list.length;
        bytes32 att = keccak256(abi.encode(address(this), block.chainid, id));
        uint256 share = c.rewardAmount / n;

        for (uint256 i = 0; i < n; i++) {
            address a = list[i];
            att = keccak256(abi.encode(att, a, _contributions[id][a].dataHash));
            uint256 pid = ++proofCount;
            proofCircle[pid] = id;
            _proofsOf[a].push(pid);
            hasProof[id][a] = true;
            _mint(a, pid);
            if (share > 0) claimable[c.rewardToken][a] += share;
        }
        uint256 dust = c.rewardAmount - share * n;
        if (dust > 0) claimable[c.rewardToken][c.creator] += dust;

        c.attestation = att;
        emit ProofIssued(id, att, n);
    }

    /// @dev Soulbound: minting is allowed, any later transfer reverts.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
