// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GreenToken
 * @dev ERC-20 token rewarding developers for sustainable computing practices.
 *      Only the backend (owner) can mint tokens.
 */
contract GreenToken is ERC20, Ownable {

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);

    constructor() ERC20("GreenToken", "GRN") Ownable(msg.sender) {}

    /**
     * @dev Mint green tokens to a developer's address.
     * @param to Recipient address.
     * @param amount Number of tokens to mint (in wei).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }
}
