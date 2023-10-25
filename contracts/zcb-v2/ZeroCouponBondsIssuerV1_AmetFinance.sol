// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ZeroCouponBondsV1_AmetFinance} from "./ZeroCouponBondsV1_AmetFinance.sol";

contract ZeroCouponBondsIssuerV1_AmetFinance {

    error InvalidOwner();
    error ContractIsPaused();
    error CreationFeeMissing();

    bool public isPaused = false;

    address public issuer;

    uint16 public creationFeePercentage = 50; // the percentage will be divided to 10 in ZCB_V1.sol
    uint256 public creationFee = 100000000000000000;

    event Create(address indexed issuer, address indexed contractAddress);

    constructor() {
        issuer = msg.sender;
    }

    modifier onlyIssuer() {
        if (msg.sender != issuer) {
            revert InvalidOwner();
        }
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
        if (msg.value < creationFee) {
            revert CreationFeeMissing();
        }
        if (isPaused == true) {
            revert ContractIsPaused();
        }

        ZeroCouponBondsV1_AmetFinance bonds = new ZeroCouponBondsV1_AmetFinance(
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
