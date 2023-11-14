// SPDX-License-Identifier: MIT
pragma solidity 0.8.22; // todo remember to change the advanced evm version to shanghai

import {ZeroCouponBondsV1_AmetFinance} from "./ZeroCouponBondsV1_AmetFinance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

    error CreationFeeMissing();
    error ContractPaused();

contract ZeroCouponBondsIssuerV1_AmetFinance is Ownable {

    // @author global paused state for creation
    bool public isPaused;

    // @author the ETH which will be paid on Bond issuance
    uint256 public creationFee;
    // @author the percentage which will be deducted from redeemable bonds.
    // @notice the percentage will be divided to 10
    uint16 public creationFeePercentage;

    event Create(address indexed issuer, address indexed contractAddress);
    event ChangeFee(uint256 from, uint256 to);

    constructor(uint16 _creationFeePercentage, uint256 _creationFee) Ownable(msg.sender) {
        creationFeePercentage = _creationFeePercentage;
        creationFee = _creationFee;
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
        if (creationFee > msg.value) revert CreationFeeMissing();
        if (isPaused) revert ContractPaused();

        ZeroCouponBondsV1_AmetFinance bonds = new ZeroCouponBondsV1_AmetFinance(
            owner(),
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

    // @author From here starts owner functions
    // @author withdraw
    function withdraw(address toAddress, uint256 amount) external onlyOwner {
        (bool sent,) = payable(toAddress).call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    function changeCreationFee(uint256 percent) external onlyOwner {
        emit ChangeFee(creationFee, percent);
        creationFee = percent;
    }

    function changeCreationFeePercentage(uint16 percent) external onlyOwner {
        emit ChangeFee(creationFeePercentage, percent);
        creationFeePercentage = percent;
    }

    function changePauseState(bool _pause) external onlyOwner {
        isPaused = _pause;
    }
}
