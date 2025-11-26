// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseBeginnerBadge
 * @notice Simple ERC721 badge minted by the backend to reward onboarding completion.
 */
contract BaseBeginnerBadge is ERC721, Ownable {
    uint256 private _tokenIds;
    string private _baseTokenURI;

    constructor(string memory baseTokenURI) ERC721("Base Beginner Badge", "BASEBGNR") Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Mint a badge to a recipient. Only callable by the contract owner (backend).
     */
    function mintTo(address to) external returns (uint256) {
        require(to != address(0), "Invalid address");
        _tokenIds += 1;
        uint256 newId = _tokenIds;
        _safeMint(to, newId);
        return newId;
    }

    /**
     * @dev Public mint to msg.sender so users can pay gas from their own wallet.
     * Note: unlimited mints per address by design.
     */
    function mint() external returns (uint256) {
        _tokenIds += 1;
        uint256 newId = _tokenIds;
        _safeMint(msg.sender, newId);
        return newId;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Allow the owner to update the base token URI if needed.
     */
    function setBaseTokenURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }
}
