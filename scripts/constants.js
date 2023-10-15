const path = require("path");
const {readFileSync} = require("fs");
const fs = require("fs");

const CONTRACT_TYPES = {
    "ZCB_ISSUER": "zcb-issuer",
    "USDT": "usdt",
    "USDC": "usdc"
}

const DIRECTIONS = {
    [CONTRACT_TYPES.ZCB_ISSUER]: {
        bin: path.join(__dirname, '../contracts/zcb-v2/artefacts/zcb-issuer/bin/contracts_zcb-v2_ZeroCouponBondsIssuerV1_AmetFinance_sol_Zero_Coupon_Bond_Issuer_V1.bin'),
        abi: path.join(__dirname, '../contracts/zcb-v2/artefacts/zcb-issuer/abi/contracts_zcb-v2_ZeroCouponBondsIssuerV1_AmetFinance_sol_Zero_Coupon_Bond_Issuer_V1.abi')
    },
    [CONTRACT_TYPES.USDT]: {
        bin: path.join(__dirname, '../contracts/tokens/artefacts/USDT/bin/contracts_tokens_USDT_sol_USDT.bin'),
        abi: path.join(__dirname, '../contracts/tokens/artefacts/USDT/abi/contracts_tokens_USDT_sol_USDT.abi')
    },
    [CONTRACT_TYPES.USDC]: {
        bin: path.join(__dirname, '../contracts/tokens/artefacts/USDC/bin/contracts_tokens_USDC_sol_USDC.bin'),
        abi: path.join(__dirname, '../contracts/tokens/artefacts/USDC/abi/contracts_tokens_USDC_sol_USDC.abi')
    }
}

function getConfig(type) {
    return {
        bytecode: "0x" + readFileSync(DIRECTIONS[type].bin).toString(),
        abi: JSON.parse(fs.readFileSync(DIRECTIONS[type].abi).toString())
    }
}

module.exports = {
    DIRECTIONS,
    CONTRACT_TYPES,
    getConfig
}