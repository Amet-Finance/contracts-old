const Web3 = require("web3");
const {toBN} = new Web3().utils;

const {describe, test, expect, beforeAll} = require("@jest/globals")

const ganache = require('../scripts/ganache');
const {deploy} = require("../scripts/deploy");
const {CONTRACT_TYPES, getConfig} = require("../scripts/constants");

const constants = {
    issuer: "",
    USDT: "",
    USDC: "",

    OwnerPK: "",
    RandomPK1: "",
    RandomPK2: "",
    RandomPK3: "",


    bondInfoLocal: {
        id: "",
        total: 1000,
        redeemLockPeriod: 5,
        investment: "USDT",
        investmentTokenAmount: "",
        interest: "USDC",
        interestTokenAmount: ""
    },

    changedFee: "1000000000000000000",
    changedFeePercentage: "100", // decimals 2

    isPaused: "true"
}

function getWeb3() {
    return new Web3(ganache);
}

function getIssuerContract() {
    const web3 = getWeb3()
    const config = getConfig(CONTRACT_TYPES.ZCB_ISSUER)
    return new web3.eth.Contract(config.abi, constants.issuer);
}

function getZcbContract() {
    const web3 = getWeb3()
    const config = getConfig(CONTRACT_TYPES.ZCB)
    return new web3.eth.Contract(config.abi, constants.bondInfoLocal.id);
}

function getTokenContract(type = "USDC") {
    const web3 = getWeb3()
    const config = getConfig(CONTRACT_TYPES[type])
    return new web3.eth.Contract(config.abi, constants[type]);
}

async function submitTransaction({data, value, privateKey, toAddress}) {
    const web3 = getWeb3();
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.handleRevert = true

    const tx = {
        to: toAddress || constants.issuer,
        from: account.address,
        data,
        value: value || 0
    }

    tx.gas = await web3.eth.estimateGas(tx);
    const transactionSigned = await account.signTransaction(tx);
    const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction);
    return decodeTransactionLogs(txDetails)
}

async function decodeTransactionLogs(transaction) {

    switch (transaction.to.toLowerCase()) {
        case constants.issuer.toLowerCase(): {
            const web3 = getWeb3();
            const {abi} = getConfig(CONTRACT_TYPES.ZCB_ISSUER)
            const eventAbi = abi.find((abi) => abi.name === "Create");
            const eventSignature = web3.eth.abi.encodeEventSignature(eventAbi);

            const result = {};

            transaction.logs.forEach((log, index) => {
                if (log.topics[0] === eventSignature) {
                    const decodedData = web3.eth.abi.decodeLog(
                        eventAbi.inputs,
                        log.data,
                        log.topics.slice(1)
                    );
                    Object.keys(decodedData).forEach(key => {
                        result[key] = decodedData[key];
                    })
                }
            });

            return {
                ...transaction,
                decoded: result
            };
        }
        default: {
            return transaction
        }
    }

}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


describe("Testing the ZCB issuer", () => {

    beforeAll(async () => {
        const accounts = ganache.getInitialAccounts()
        const firstAddress = Object.keys(accounts)[0]
        const account = getWeb3().eth.accounts.privateKeyToAccount(accounts[firstAddress].secretKey)

        const issuerConfig = getConfig(CONTRACT_TYPES.ZCB_ISSUER)
        const issuerContract = await deploy(account, issuerConfig.abi, issuerConfig.bytecode)

        const usdtConfig = getConfig(CONTRACT_TYPES.USDT)
        const usdtContract = await deploy(account, usdtConfig.abi, usdtConfig.bytecode)

        const usdcConfig = getConfig(CONTRACT_TYPES.USDC)
        const usdcContract = await deploy(account, usdcConfig.abi, usdcConfig.bytecode)

        constants.issuer = issuerContract.contractAddress
        constants.OwnerPK = account.privateKey

        constants.USDT = usdtContract.contractAddress
        constants.USDC = usdcContract.contractAddress

        let index = 1;

        Object.keys(accounts)
            .forEach((item) => {
                if (item.toLowerCase() !== account.address.toLowerCase()) {
                    constants[`RandomPK${index}`] = accounts[item].secretKey
                    index++
                }
            })

        // const functions = Object.keys(getIssuerContract().methods).filter(i => !i.startsWith("0x"))
        // console.log(functions)
    });

    test.failing('changeCreationFee| Wrong wallet', async () => {
        const contract = getIssuerContract();
        await submitTransaction({
            data: contract.methods.changeCreationFee(constants.changedFee).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('changeCreationFee| Correct wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changeCreationFee(constants.changedFee).encodeABI(),
            privateKey: constants.OwnerPK
        })
    })

    test.failing('changeCreationFeePercentage| Wrong wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('changeCreationFeePercentage| Correct wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI(),
            privateKey: constants.OwnerPK
        })
    }) // fee percentage is 10%

    test.failing('changeIssuer| Wrong wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changeIssuer(account.address).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('changeIssuer| Correct wallet', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();
        const newAccount = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

        const txDetails = await submitTransaction({
            data: contract.methods.changeIssuer(newAccount.address).encodeABI(),
            privateKey: constants.OwnerPK
        })
        console.log(txDetails)
    })

    test('changeIssuer| Correct wallet(original value)', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();
        const newAccount = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

        const txDetails = await submitTransaction({
            data: contract.methods.changeIssuer(newAccount.address).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('create| Correct Issue Bond', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const {total, redeemLockPeriod} = constants.bondInfoLocal
        const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
        const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)))

        const txDetails = await submitTransaction({
            data: contract.methods.create(total, redeemLockPeriod, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
            value: constants.changedFee,
            privateKey: constants.RandomPK3
        })
        const {decoded} = txDetails;

        constants.bondInfoLocal.id = decoded.contractAddress;
        constants.bondInfoLocal.issuer = decoded.issuer;

        constants.interestToken = constants.USDT;
        constants.bondInfoLocal.interestTokenAmount = interestAmount.toString();

        constants.investmentToken = constants.USDC;
        constants.bondInfoLocal.investmentTokenAmount = investmentAmount.toString();
    })

    test.failing('create| Wrong | Without value', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
        const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)))

        const txDetails = await submitTransaction({
            data: contract.methods.create(100, 3600, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
            privateKey: constants.RandomPK3
        })
    })

    test.failing('create| Wrong | Wrong amounts', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
        const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)))

        const txDetails = await submitTransaction({
            data: contract.methods.create(-10, -1, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
            value: constants.changedFee,
            privateKey: constants.RandomPK3
        })
        console.log(txDetails)
    })

    test.failing('withdraw| Wrong wallet', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const toAddress = web3.eth.accounts.privateKeyToAccount(constants.RandomPK4);
        const value = await web3.eth.getBalance(constants.issuer);

        const txDetails = await submitTransaction({
            data: contract.methods.withdraw(toAddress.address, value).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('withdraw| Correct', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const toAddress = web3.eth.accounts.privateKeyToAccount(constants.RandomPK4);
        const value = await web3.eth.getBalance(constants.issuer);

        const txDetails = await submitTransaction({
            data: contract.methods.withdraw(toAddress.address, value).encodeABI(),
            privateKey: constants.OwnerPK
        })
    })

    test.failing('isPaused| Wrong wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changePauseState(constants.isPaused).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('isPaused| Correct wallet', async () => {
        const contract = getIssuerContract();
        const txDetails = await submitTransaction({
            data: contract.methods.changePauseState(constants.isPaused).encodeABI(),
            privateKey: constants.OwnerPK
        })
    })

    test.failing('isPaused| Check creation', async () => {
        const contract = getIssuerContract();

        const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
        const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)))

        const txDetails = await submitTransaction({
            data: contract.methods.create(100, 3600, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
            value: constants.changedFee,
            privateKey: constants.RandomPK3
        })
        console.log(txDetails)
    })

    test('Variable validation for Issuer', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const owner = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK)

        const issuer = await contract.methods.issuer().call()
        const creationFeePercentage = await contract.methods.creationFeePercentage().call()
        const creationFee = await contract.methods.creationFee().call()
        const isPaused = await contract.methods.isPaused().call()

        if (issuer.toLowerCase() !== owner.address.toLowerCase()) {
            throw Error("Incorrect issuer")
        }

        if (creationFeePercentage !== constants.changedFeePercentage) {
            throw Error("Incorrect Fee percent")
        }

        if (creationFee !== constants.changedFee) {
            throw Error("Incorrect Fee")
        }

        if (isPaused.toString() !== constants.isPaused) {
            throw Error("Incorrect isPaused")
        }
    })
})

describe("Testing the ZCB", () => {
    // Starting from here goes checks for the ZCB
    // Get

    // "AMET_VAULT()"
    // "balanceOf(address)",
    // "getInfo()",
    // "getTokenInfo(uint256)",
    // "getTokensPurchaseDates(uint256[])",
    // "isApprovedForAll(address,address)",
    // "name()"
    // "ownerOf(uint256)"
    // "supportsInterface(bytes4)"
    // "symbol()"
    // "tokenURI(uint256)"

    // "redeem(uint256[])"
    // "approve(address,uint256)",
    // "burnUnsoldBonds(uint256)",
    // "changeFeePercentage(uint16)",
    // "changeOwner(address)",
    // "changeTokenURI(string)",
    // "changeVaultAddress(address)",
    // "getApproved(uint256)",
    // "issueBonds(uint256)",
    // "safeTransferFrom(address,address,uint256)"
    // "safeTransferFrom(address,address,uint256,bytes)"
    // "setApprovalForAll(address,bool)",
    // "transferFrom(address,address,uint256)"
    // "withdrawRemaining()


    test.failing('Purchase| Wrong approval', async () => {
        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.purchase(10).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        })
    })

    test.failing('Purchase| Correct allowance && Wrong balance', async () => {
        const type = constants.bondInfoLocal.investment
        const tokenContract = getTokenContract();

        const amount = 10
        const value = toBN(amount).mul(toBN(constants.bondInfoLocal.investmentTokenAmount))

        await submitTransaction({
            data: tokenContract.methods.approve(constants.bondInfoLocal.id, value).encodeABI(),
            toAddress: constants[type],
            privateKey: constants.RandomPK3
        })

        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.purchase(amount).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        })
    })

    test('Purchase| Correct approval', async () => {
        const type = constants.bondInfoLocal.investment
        const tokenContract = getTokenContract();

        const amount = 10
        const value = toBN(amount).mul(toBN(constants.bondInfoLocal.investmentTokenAmount))

        await submitTransaction({
            data: tokenContract.methods.approve(constants.bondInfoLocal.id, value).encodeABI(),
            toAddress: constants[type],
            privateKey: constants.OwnerPK
        })

        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.purchase(amount).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        })
    })

    test('Deposit to ZCB', async () => {
        const type = constants.bondInfoLocal.interest
        const tokenContract = getTokenContract(type);

        const value = toBN(1000).mul(toBN(constants.bondInfoLocal.interestTokenAmount))

        await submitTransaction({
            data: tokenContract.methods.transfer(constants.bondInfoLocal.id, value).encodeABI(),
            toAddress: constants[type],
            privateKey: constants.OwnerPK
        })
    })

    test.failing('Redeem| Wrong time', async () => {
        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.redeem([0]).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        })
    })

    test.failing('Redeem| Wrong id', async () => {
        const contract = getZcbContract();
        const web3 = getWeb3()
        const block = await web3.eth.getBlock("latest")
        await ganache.send("evm_mine", [{timestamp: block.timestamp + constants.bondInfoLocal.redeemLockPeriod}]); // mines 5 blocks

        await submitTransaction({
            data: contract.methods.redeem([150]).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        })
    })

    test('Redeem| Correct', async () => {
        const web3 = getWeb3()
        const block = await web3.eth.getBlock("latest")
        await ganache.send("evm_mine", [{timestamp: block.timestamp + constants.bondInfoLocal.redeemLockPeriod + 1}]); // skips the timestamp to lockPeriod + 1 seconds
        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.redeem([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        }).catch(error => {
            console.log(error)
        })
    })


})