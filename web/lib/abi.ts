import { parseAbi } from "viem";

const circleView =
  "struct CircleView { uint256 id; address creator; uint64 deadline; uint64 finalizedAt; uint8 threshold; uint8 maxParticipants; uint256 participantCount; uint256 contributionCount; bool finalized; bool cancelled; address rewardToken; uint256 rewardAmount; bytes32 attestation; string description; }";

export const proofAbi = parseAbi([
  circleView,
  "struct Contribution { bytes32 dataHash; uint64 at; string metadataURI; }",
  "error NotAgent()",
  "error BadParams()",
  "error BadFunding()",
  "error Closed()",
  "error NotJoined()",
  "error AlreadyDone()",
  "error BadSignature()",
  "error Unauthorized()",
  "error NothingToClaim()",
  "error Soulbound()",
  "error TransferFailed()",
  "function circleCount() view returns (uint256)",
  "function getCircle(uint256 id) view returns (CircleView)",
  "function getCircles(uint256 offset, uint256 limit) view returns (CircleView[])",
  "function getContributors(uint256 id) view returns (address[])",
  "function getContribution(uint256 id, address account) view returns (Contribution)",
  "function getProofs(address account) view returns (uint256[] ids, CircleView[] circles)",
  "function isParticipant(uint256 id, address account) view returns (bool)",
  "function contributionDigest(uint256 id, address contributor, bytes32 dataHash) view returns (bytes32)",
  "function verifyProof(uint256 id, address account) view returns (bool valid, bytes32 attestation)",
  "function claimable(address token, address account) view returns (uint256)",
  "function createCircle(string description, uint8 threshold, uint8 maxParticipants, uint64 deadline, address rewardToken, uint256 rewardAmount) payable returns (uint256)",
  "function joinCircle(uint256 id)",
  "function submitContribution(uint256 id, bytes32 dataHash, string metadataURI, bytes signature)",
  "function cancelCircle(uint256 id)",
  "function claim(address token)",
]);

export const agentAbi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function handleOf(address owner) view returns (string)",
]);

export const erc20Abi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
