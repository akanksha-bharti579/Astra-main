// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GreenBadge
 * @dev ERC-721 NFT badges for sustainability achievements.
 *      Each badge has metadata URI pointing to achievement details.
 */
contract GreenBadge is ERC721URIStorage, Ownable {

    uint256 private _nextTokenId;

    event BadgeMinted(address indexed to, uint256 tokenId, string uri, uint256 timestamp);

    constructor() ERC721("AstraGreenBadge", "ABADGE") Ownable(msg.sender) {}

    /**
     * @dev Mint a badge NFT to a developer's address.
     * @param to Recipient address.
     * @param uri Metadata URI (points to badge definition JSON).
     */
    function mintBadge(address to, string calldata uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit BadgeMinted(to, tokenId, uri, block.timestamp);
        return tokenId;
    }

    /**
     * @dev Get total number of badges minted.
     */
    function totalBadges() external view returns (uint256) {
        return _nextTokenId;
    }
}
