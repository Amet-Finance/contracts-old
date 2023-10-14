// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC721/ERC721.sol)

pragma solidity ^0.8.7;

import {Zero_Coupon_Bond_V1} from "./ZCB_V1.sol";

contract Zero_Coupon_Bond_Issuer_V1 {
    bool public isPaused = false;
    address public issuer;
    uint16 public creationFeePercentage = 5; // the percentage will be decided to 10 in ZCB_V1.sol
    uint256 public creationFee = 100000000000000000;

    event Create(address indexed issuer, address indexed contractAddress);

    constructor() {
        issuer = msg.sender;
    }

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only the issuer can call this function");
        _;
    }

    function create(
        uint256 _total,
        uint256 _redeemLockPeriod,
        address _investmentToken,
        uint256 _investmentTokenAmount,
        address _interestToken,
        uint256 _interestTokenAmount,
        string memory _name
    ) external payable {
        require(msg.value >= creationFee, "Creation fee is required");

        Zero_Coupon_Bond_V1 bonds = new Zero_Coupon_Bond_V1(
            msg.sender,
            _total,
            _redeemLockPeriod,
            _investmentToken,
            _investmentTokenAmount,
            _interestToken,
            _interestTokenAmount,
            creationFeePercentage,
            _name
        );
        emit Create(msg.sender, address(bonds));
    }

    // ==== Issuer functions ====

    function changeIssuer(address newIssuer) external onlyIssuer {
        issuer = newIssuer;
    }

    function withdraw(address toAddress, uint256 amount) external onlyIssuer {
        payable(toAddress).transfer(amount);
    }

    function changeCreationFee(uint256 percent) external onlyIssuer {
        creationFee = percent;
    }

    function changeCreationFeePercentage(uint16 percent) external onlyIssuer {
        creationFeePercentage = percent;
    }

    function changePauseState(bool _pause) external onlyIssuer {
        isPaused = _pause;
    }
    // =========
}
