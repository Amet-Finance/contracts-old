// SPDX-License-Identifier: MIT

// Vulnerabilities
// 1. Add pause with VAULT address - CENTRALIZATION
// 2. Add selfdestruct with VAULT address - CENTRALIZATION

pragma solidity ^0.8.7;

import {IERC20} from "./IERC20.sol";
import {IERC721} from "./IERC721.sol";
import {IERC165} from "./IERC165.sol";
import {IERC721Receiver} from "./IERC721Receiver.sol";
import {IERC721Metadata} from "./IERC721Metadata.sol";
import {IERC721Errors} from "./IERC721Errors.sol";
import {ERC165} from "./ERC165.sol";

contract Zero_Coupon_Bond_V1 is ERC165, IERC721, IERC721Metadata, IERC721Errors {

    address public AMET_VAULT;

    string private _name;
    string private _symbol = "ZCB";
    string private _uri = "https://storage.amet.finance/contracts/zero-coupon-bond-v1.json";

    address private issuer; // Bonds issuer coupon

    uint256 private total; // The amount of the bonds that can be issued(maximum)
    uint256 private purchased; // The amount of bonds that were already purchased
    uint256 private redeemed; // The amount of bonds already redeemed

    uint16 private feePercentage;

    uint256 private redeemLockPeriod; // Seconds required after which user can redeem
    uint256 private issuanceDate; // The date when the bonds were issued

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
    ) {
        AMET_VAULT = msg.sender;
        issuer = _issuer;
        total = _total;
        redeemLockPeriod = _redeemLockPeriod;

        _name = _denomination;

        investmentToken = _investmentToken;
        investmentTokenAmount = _investmentTokenAmount;

        interestToken = _interestToken;
        interestTokenAmount = _interestTokenAmount;
        feePercentage = _feePercentage;
        issuanceDate = block.timestamp;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function balanceOf(address owner) public view virtual returns (uint256) {
        if (owner == address(0)) {
            revert ERC721InvalidOwner(address(0));
        }
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        return owner;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
        _requireMinted(tokenId);
        return _uri; // todo update this part as it returns the base uri only
    }


    function approve(address to, uint256 tokenId) public virtual {
        _approve(to, tokenId, msg.sender);
    }

    function getApproved(uint256 tokenId) public view virtual returns (address) {
        _requireMinted(tokenId);

        return _getApproved(tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
        // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
        address previousOwner = _update(to, tokenId, msg.sender);
        if (previousOwner != from) {
            revert ERC721IncorrectOwner(from, tokenId, previousOwner);
        }
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual {
        transferFrom(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }


    function _ownerOf(uint256 tokenId) internal view virtual returns (address) {
        return _owners[tokenId];
    }

    function _getApproved(uint256 tokenId) internal view virtual returns (address) {
        return _tokenApprovals[tokenId];
    }

    function _isAuthorized(address owner, address spender, uint256 tokenId) internal view virtual returns (bool) {
        return
            spender != address(0) &&
            (owner == spender ||
            isApprovedForAll(owner, spender) ||
                _getApproved(tokenId) == spender);
    }

    function _checkAuthorized(address owner, address spender, uint256 tokenId) internal view virtual {
        if (!_isAuthorized(owner, spender, tokenId)) {
            if (owner == address(0)) {
                revert ERC721NonexistentToken(tokenId);
            } else {
                revert ERC721InsufficientApproval(spender, tokenId);
            }
        }
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual returns (address) {
        address from = _ownerOf(tokenId);

        // Perform (optional) operator check
        if (auth != address(0)) {
            _checkAuthorized(from, auth, tokenId);
        }

        // Execute the update
        if (from != address(0)) {
            delete _tokenApprovals[tokenId];
            unchecked {
                _balances[from] -= 1;
            }
        }

        if (to != address(0)) {
            unchecked {
                _balances[to] += 1;
            }
        }

        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        return from;
    }

    function _mint(address to, uint256 tokenId) internal {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address previousOwner = _update(to, tokenId, address(0));
        if (previousOwner != address(0)) {
            revert ERC721InvalidSender(address(0));
        }
    }

    function _safeMint(address to, uint256 tokenId) internal {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(address to, uint256 tokenId, bytes memory data) internal virtual {
        _mint(to, tokenId);
        _checkOnERC721Received(address(0), to, tokenId, data);
    }

    function _burn(uint256 tokenId) internal {
        address previousOwner = _update(address(0), tokenId, address(0));
        if (previousOwner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address previousOwner = _update(to, tokenId, address(0));
        if (previousOwner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        } else if (previousOwner != from) {
            revert ERC721IncorrectOwner(from, tokenId, previousOwner);
        }
    }

    function _safeTransfer(address from, address to, uint256 tokenId) internal {
        _safeTransfer(from, to, tokenId, "");
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal virtual {
        _transfer(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    function _approve(address to, uint256 tokenId, address auth) internal virtual returns (address) {
        address owner = ownerOf(tokenId);

        // We do not use _isAuthorized because single-token approvals should not be able to call approve
        if (
            auth != address(0) &&
            owner != auth &&
            !isApprovedForAll(owner, auth)
        ) {
            revert ERC721InvalidApprover(auth);
        }

        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);

        return owner;
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal virtual {
        if (operator == address(0)) {
            revert ERC721InvalidOperator(operator);
        }
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _requireMinted(uint256 tokenId) internal view virtual {
        if (_ownerOf(tokenId) == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length > 0) {
            try
            IERC721Receiver(to).onERC721Received(
                msg.sender,
                from,
                tokenId,
                data
            )
            returns (bytes4 retval) {
                if (retval != IERC721Receiver.onERC721Received.selector) {
                    revert ERC721InvalidReceiver(to);
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert ERC721InvalidReceiver(to);
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }

    //    ==== VAULT owner functions ====

    function changeVaultAddress(address newAddress) external onlyVaultOwner {
        AMET_VAULT = newAddress;
    }

    function changeFeePercentage(uint16 percentage) external onlyVaultOwner {
        feePercentage = percentage;
    }

    function changeTokenURI(string memory uri) external onlyVaultOwner {
        _uri = uri;
    }

    function destroyContract() external onlyVaultOwner {
//        IERC20(interestToken).transfer(AMET_VAULT, )
//        selfdestruct(payable(AMET_VAULT));
    }

    // ==================

    // ==== Issuer functions ====

    function changeOwner(address _newAddress) external onlyIssuer {
        issuer = _newAddress;
    }

    function issueBonds(uint256 count) external onlyIssuer {
        total += count;
    }

    function burnUnsoldBonds(uint256 count) external onlyIssuer {
        require(total - count >= purchased, "Can not burn already sold bonds");
        total -= count;
    }

    function withdrawRemaining() external onlyIssuer {
        uint256 balance = IERC20(interestToken).balanceOf(address(this));
        uint256 totalNeeded = (total - redeemed) * interestTokenAmount;
        if (balance > totalNeeded) {
            bool isSuccess = IERC20(interestToken).transfer(issuer, balance - totalNeeded);
            require(isSuccess == true, "Transfer failed");
        }
    }

    // ========

    // ==== Investor functions ====

    function purchase(uint256 count) external {
        require(purchased + count <= total, "Can not mint more then is left");

        bool isPurchased = IERC20(investmentToken).transferFrom(msg.sender, issuer, count * investmentTokenAmount);
        require(isPurchased == true, "Purchase reverted");

        for (uint256 index = 0; index < count; index++) {
            uint256 id = purchased + index;
            _safeMint(msg.sender, id);
            _tokenInfo[id] = block.timestamp;
        }

        purchased += count;
    }

    function redeem(uint256[] calldata ids) external {
        uint256 totalRedemption = interestTokenAmount * ids.length;
        uint256 contractInterestBalance = IERC20(interestToken).balanceOf(address(this));
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
        IERC20(interestToken).transfer(AMET_VAULT, totalFees);
        IERC20(interestToken).transfer(msg.sender, totalRedemption - totalFees);
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
