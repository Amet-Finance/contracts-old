// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {

    address private owner;

    constructor() ERC20("Tether USD", "USDT"){
        _mint(msg.sender, 100000000000000 * 10 ** 18);
        owner = msg.sender;
    }


    function mintTokens(uint256 amount) public {
        require(msg.sender == owner);
        _mint(msg.sender, amount * 10 ** 18);
    }
}
