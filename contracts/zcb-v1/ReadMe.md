# Amet Finance - Zero Coupon Bonds Contracts

## Overview

This repository contains the smart contracts for implementing Zero Coupon Bonds (ZCB) on the Amet Finance platform. ZCBs
offer a unique way to issue and trade bonds with a deferred interest mechanism.

# Contracs

- [ZeroCouponBondsIssuerV1_AmetFinance.sol](ZeroCouponBondsIssuerV1_AmetFinance.sol):
    - Main contract for issuing ZCBs.
    - Constructor receives 2 arguments, uint16["creationFee"] and uin256["creationFeePercentage"] 
- [ZeroCouponBondsV1_AmetFinance.sol](ZeroCouponBondsV1_AmetFinance.sol):
    - Main contract of the bond.
    - Implements ERC721, SafeERC20, IERC20, and Strings from Open Zeppelin.

### Contact

For inquiries, contact us at `hello@amet.finance`

