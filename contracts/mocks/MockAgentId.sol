// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Test-only stand-in for the Agent ID collection. Do not deploy on mainnet.
contract MockAgentId is ERC721 {
    uint256 private _next;

    constructor() ERC721("Agent ID", "AI") {}

    function mint(address to) external {
        _mint(to, ++_next);
    }
}
