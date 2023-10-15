const Web3 = require("web3");
const {toBN} = new Web3().utils;

const {describe, test, expect, beforeAll} = require("@jest/globals")

const ganache = require('../scripts/ganache');
const {deploy} = require("../scripts/deploy");
const {CONTRACT_TYPES, getConfig} = require("../scripts/constants");

const constants = {
    IssuerContract: "",
    USDT: "",
    USDC: "",

    OwnerPK: "",
    RandomPK1: "",
    RandomPK2: "",
    RandomPK3: "",

    changedFee: "1000000000000000000",
    changedFeePercentage: "100", // decimals 2
    isPaused: "true"
}


//   "create(uint256,uint256,address,uint256,address,uint256,string)",
//   "withdraw(address,uint256)",
//   "changePauseState(bool)",


function getWeb3() {
    return new Web3(ganache);
}

function getContract() {
    const web3 = getWeb3()
    const config = getConfig(CONTRACT_TYPES.ZCB_ISSUER)
    return new web3.eth.Contract(config.abi, constants.IssuerContract);
}

async function submitTransaction({data, value, privateKey}) {
    const web3 = getWeb3();
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    const tx = {
        to: constants.IssuerContract,
        from: account.address,
        data,
        value
    }

    tx.gas = await web3.eth.estimateGas(tx);
    const transactionSigned = await account.signTransaction(tx);
    return await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction);
}

describe("Testing the issuer contract", () => {

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

        constants.IssuerContract = issuerContract.contractAddress
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

        // const functions = Object.keys(getContract().methods).filter(i => !i.startsWith("0x"))
        // console.log(functions)
    });

    test('changeCreationFee| Wrong wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changeCreationFee(constants.changedFee).encodeABI(),
                privateKey: constants.RandomPK1
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('changeCreationFee| Correct wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changeCreationFee(constants.changedFee).encodeABI(),
                privateKey: constants.OwnerPK
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    }) // fee is 1 ETH already

    test('changeCreationFeePercentage| Wrong wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI(),
                privateKey: constants.RandomPK1
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('changeCreationFeePercentage| Correct wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI(),
                privateKey: constants.OwnerPK
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    }) // fee percentage is 10%

    test('changeIssuer| Wrong wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changeIssuer(account.address).encodeABI(),
                privateKey: constants.RandomPK1
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('changeIssuer| Correct wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();
            const newAccount = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

            const txDetails = await submitTransaction({
                data: contract.methods.changeIssuer(newAccount.address).encodeABI(),
                privateKey: constants.OwnerPK
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('changeIssuer| Correct wallet(original value)', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();
            const newAccount = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

            const txDetails = await submitTransaction({
                data: contract.methods.changeIssuer(newAccount.address).encodeABI(),
                privateKey: constants.RandomPK1
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('create| Correct Issue Bond', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
            const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)))

            const txDetails = await submitTransaction({
                data: contract.methods.create(100, 3600, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
                value: constants.changedFee,
                privateKey: constants.RandomPK3
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('create| Wrong Issue Bond', async () => {
        expect(true).toBe(true)
    }) //todo

    test('withdraw| Correct wallet', async () => {
        expect(true).toBe(true)
    }) //todo

    test('withdraw| Wrong wallet', async () => {
        expect(true).toBe(true)
    }) //todo

    test('isPaused| Wrong wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changePauseState(constants.isPaused).encodeABI(),
                privateKey: constants.RandomPK1
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('isPaused| Correct wallet', async () => {
        let hasError = false;
        try {
            const contract = getContract();
            const txDetails = await submitTransaction({
                data: contract.methods.changePauseState(constants.isPaused).encodeABI(),
                privateKey: constants.OwnerPK
            })
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('isPaused| Check creation', async () => {
        expect(true).toBe(true)
    }) //todo

    test('Variable validation', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const owner = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK)

            const issuer = await contract.methods.issuer().call()
            const creationFeePercentage = await contract.methods.creationFeePercentage().call()
            const creationFee = await contract.methods.creationFee().call()
            const isPaused = await contract.methods.isPaused().call()

            if (issuer.toLowerCase() !== owner.address.toLowerCase()) {
                hasError = true
            }

            if (creationFeePercentage !== constants.changedFeePercentage) {
                hasError = true
            }

            if (creationFee !== constants.changedFee) {
                hasError = true
            }

            if (isPaused.toString() !== constants.isPaused) {
                hasError = true
            }

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    }) // error will be until updated
})


