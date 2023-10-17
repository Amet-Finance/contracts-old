// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Zero_Coupon_Bond_V1 is ERC721 {
    using SafeERC20 for IERC20;

    address public AMET_VAULT;
    string private _uri = "https://storage.amet.finance/contracts/zero-coupon-bond-v1.json";

    address private issuer; // Bonds issuer coupon

    uint256 private total; // The amount of the bonds that can be issued(maximum)
    uint256 private purchased; // The amount of bonds that were already purchased
    uint256 private redeemed; // The amount of bonds already redeemed

    uint16 private feePercentage;

    uint256 private redeemLockPeriod; // Seconds required after which user can redeem
    uint256 private issuanceDate; // The date when the contract was created

    address private investmentToken; // Bond purchasing token
    uint256 private investmentTokenAmount; // Bond purchasing amount

    address private interestToken; // Bond return token
    uint256 private interestTokenAmount; // Bond return amount

    mapping(address owner => uint256) private _balances; // Address bonds total

    mapping(uint256 tokenId => address) private _owners; // Bond owner

    mapping(uint256 tokenId => uint256) private _tokenInfo; // Bond purchase date

    mapping(uint256 tokenId => address) private _tokenApprovals; // approval for tokenId

    mapping(address owner => mapping(address operator => bool)) private _operatorApprovals; // approval for all the bonds

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only the issuer can call this function");
        _;
    }

    modifier onlyVaultOwner() {
        require(msg.sender == AMET_VAULT, "Only the VAULT owner");
        _;
    }

    modifier notZeroAddress(address _address) {
        require(_address != address(0), "Address can not be Zero");
        _;
    }

    event ChangeOwner(address oldAddress, address newAddress);
    event ChangeVaultAddress(address oldAddress, address newAddress);

    event ChangeFeePercentage(uint16 oldFeePercentage, uint16 newFeePercentage);

    event BondsIssued(uint256 count);
    event BondsBurnt(uint256 count);

    constructor(
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
        AMET_VAULT = msg.sender;
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
        return _uri; // todo update this part as it returns the base uri only
    }

    //    ==== VAULT owner functions ====

    function changeVaultAddress(address newAddress) external onlyVaultOwner notZeroAddress(newAddress) {
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

    function changeOwner(address _newAddress) external onlyIssuer notZeroAddress(_newAddress) {
        issuer = _newAddress;
        emit ChangeOwner(msg.sender, _newAddress);
    }

    function issueBonds(uint256 count) external onlyIssuer {
        total += count;
        emit BondsIssued(count);
    }

    function burnUnsoldBonds(uint256 count) external onlyIssuer {
        require(total - count >= purchased, "Can not burn already sold bonds");
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
        require(purchased + count <= total, "Can not mint more then is left");

        for (uint256 index = 0; index < count; index++) {
            uint256 id = purchased + index;
            _safeMint(msg.sender, id);
            _tokenInfo[id] = block.timestamp;
        }

        purchased += count;
        IERC20(investmentToken).safeTransferFrom(msg.sender, issuer, count * investmentTokenAmount);
    }

    function redeem(uint256[] calldata ids) external {
        uint256 totalRedemption = interestTokenAmount * ids.length;
        IERC20 interest = IERC20(interestToken);
        uint256 contractInterestBalance = interest.balanceOf(address(this));
        require(contractInterestBalance >= totalRedemption, "Not enough interest token");

        for (uint256 index = 0; index < ids.length; index++) {
            uint256 id = ids[index];

            require(ownerOf(id) == msg.sender, "Only owner of the bond");
            uint256 purchaseDate = _tokenInfo[id];

            require(purchaseDate + redeemLockPeriod < block.timestamp, "You can not redeem now");
            _burn(id);

            delete _owners[id];
        }

        uint256 totalFees = totalRedemption * feePercentage / 1000;

        redeemed += ids.length;
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

    function getTokenInfo(uint256 tokenId) external view returns (address, uint256) {
        return (_owners[tokenId], _tokenInfo[tokenId]);
    }

    function getTokensPurchaseDates(uint256[] calldata tokenIds) external view returns (uint256[] memory) {
        uint256[] memory purchaseDates = new uint256[](tokenIds.length);

        for (uint256 id = 0; id < tokenIds.length; id += 1) {
            purchaseDates[id] = _tokenInfo[tokenIds[id]];
        }
        return purchaseDates;
    }
}
