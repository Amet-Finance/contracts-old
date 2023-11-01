// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721, Strings} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

    error OnlyOwner();
    error OnlyVAULTOwner();
    error InvalidOperation();

contract ZeroCouponBondsV1_AmetFinance is ERC721 {

    using SafeERC20 for IERC20;

    address public AMET_VAULT;
    string private _uri = "https://storage.amet.finance/contracts/";

    address private issuer; // Bonds issuer coupon

    uint256 private total; // The amount of the bonds that can be issued(maximum)
    uint256 private purchased; // The amount of bonds that were already purchased
    uint256 private redeemed; // The amount of bonds already redeemed

    uint16 private feePercentage;

    uint256 private redeemLockPeriod; // Seconds after which user can redeem
    uint256 private issuanceDate; // The date when the contract was created

    address private investmentToken; // Bond purchasing token
    uint256 private investmentTokenAmount; // Bond purchasing amount

    address private interestToken; // Bond return token
    uint256 private interestTokenAmount; // Bond return amount

    mapping(uint256 tokenId => uint256) private _purchaseDates; // Bond purchase date

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert OnlyOwner();
        _;
    }

    modifier onlyVaultOwner() {
        if (msg.sender != AMET_VAULT) revert OnlyVAULTOwner();
        _;
    }

    event ChangeOwner(address oldAddress, address newAddress);
    event ChangeVaultAddress(address oldAddress, address newAddress);

    event ChangeFeePercentage(uint16 oldFeePercentage, uint16 newFeePercentage);

    event BondsIssued(uint256 count);
    event BondsBurnt(uint256 count);

    constructor(
        address _vault,
        address _issuer,
        uint256 _total,
        uint256 _redeemLockPeriod,
        address _investmentToken,
        uint256 _investmentTokenAmount,
        address _interestToken,
        uint256 _interestTokenAmount,
        uint16 _feePercentage,
        string memory _denomination
    ) ERC721(_denomination, "ZCB") {
        AMET_VAULT = _vault;
        issuer = _issuer;
        total = _total;
        redeemLockPeriod = _redeemLockPeriod;

        investmentToken = _investmentToken;
        investmentTokenAmount = _investmentTokenAmount;

        interestToken = _interestToken;
        interestTokenAmount = _interestTokenAmount;
        feePercentage = _feePercentage;
        issuanceDate = block.timestamp;
    }

    function tokenURI() public view returns (string memory) {
        return string.concat(_uri, Strings.toHexString(address(this)), ".json");
    }

    //    ==== VAULT owner functions ====

    function changeVaultAddress(address newAddress) external onlyVaultOwner {
        emit ChangeVaultAddress(AMET_VAULT, newAddress);
        AMET_VAULT = newAddress;
    }

    function changeFeePercentage(uint16 percentage) external onlyVaultOwner {
        emit ChangeFeePercentage(feePercentage, percentage);
        feePercentage = percentage;
    }

    function changeTokenURI(string memory uri) external onlyVaultOwner {
        _uri = uri;
    }

    // ==================

    // ==== Issuer functions ====

    function changeOwner(address _newAddress) external onlyIssuer {
        issuer = _newAddress;
        emit ChangeOwner(msg.sender, _newAddress);
    }

    function issueBonds(uint256 count) external onlyIssuer {
        total += count;
        emit BondsIssued(count);
    }

    function burnUnsoldBonds(uint256 count) external onlyIssuer {
        if (total - count < purchased) revert InvalidOperation();

        total -= count;
        emit BondsBurnt(count);
    }

    function withdrawRemaining() external onlyIssuer {
        uint256 balance = IERC20(interestToken).balanceOf(address(this));
        uint256 totalNeeded = (total - redeemed) * interestTokenAmount;
        if (balance > totalNeeded) {
            IERC20(interestToken).safeTransfer(issuer, balance - totalNeeded);
        }
    }

    // ========

    // ==== Investor functions ====

    function purchase(uint256 count) external {
        if (purchased + count > total) revert InvalidOperation();

        for (uint256 index = 0; index < count; index++) {
            uint256 tokenId = purchased + index;
            _safeMint(msg.sender, tokenId);
            _purchaseDates[tokenId] = block.timestamp;
        }

        purchased += count;
        IERC20(investmentToken).safeTransferFrom(msg.sender, issuer, count * investmentTokenAmount);
    }

    function redeem(uint256[] calldata tokenIds) external {
        uint256 length = tokenIds.length;
        uint256 totalRedemption = interestTokenAmount * length;
        uint256 redeemLeft = block.timestamp - redeemLockPeriod;

        IERC20 interest = IERC20(interestToken);
        uint256 contractInterestBalance = interest.balanceOf(address(this));

        if (totalRedemption > contractInterestBalance) revert InvalidOperation();

        for (uint256 index = 0; index < length; index++) {
            uint256 tokenId = tokenIds[index];


            if (ownerOf(tokenId) != msg.sender) revert OnlyOwner();
            if (_purchaseDates[tokenId] > redeemLeft) revert InvalidOperation();

            _burn(tokenId);
            delete _purchaseDates[tokenId];
        }

        uint256 totalFees = totalRedemption * feePercentage / 1000;
        unchecked {
            redeemed += length;
        }

        interest.safeTransfer(AMET_VAULT, totalFees);
        interest.safeTransfer(msg.sender, totalRedemption - totalFees);
    }

    // ========

    //  ====== Utility functions ======

    function getInfo()
    external
    view
    returns (
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        address,
        uint256,
        address,
        uint256,
        uint16,
        uint256
    )
    {
        return (
            issuer,
            total,
            purchased,
            redeemed,
            redeemLockPeriod,
            investmentToken,
            investmentTokenAmount,
            interestToken,
            interestTokenAmount,
            feePercentage,
            issuanceDate
        );
    }

    function getTokensPurchaseDates(uint256[] calldata tokenIds) external view returns (uint256[] memory) {
        uint256[] memory purchaseDates = new uint256[](tokenIds.length);

        for (uint256 id = 0; id < tokenIds.length; id += 1) {
            purchaseDates[id] = _purchaseDates[tokenIds[id]];
        }
        return purchaseDates;
    }
}

//@audit import files with {} - done
//@audit Use custom errors instead of require statements - done
//@audit missing event emission on setter functions - done
//@audit use stable pragma statement
//@audit Filename and contract name mismatch - done
//@audit use ++index instead of index++, as well as don't initialise index to 0
//@audit include NatSpec especially for the external functions
