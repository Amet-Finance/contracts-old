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
        total: 50,
        redeemLockPeriod: 10,
        investment: "USDT",
        investmentTokenAmount: toBN(100).mul(toBN(10).pow(toBN(18))),
        interest: "USDC",
        interestTokenAmount: toBN(100).mul(toBN(10).pow(toBN(18)))
    },

    purchaseAmount: 10,

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

/**
 @description The tests below check for the methods blow, which are under issuer contract
  'changeCreationFee(uint256)',
  'changeCreationFeePercentage(uint16)',
  'changePauseState(bool)',
  'create(uint256,uint256,address,uint256,address,uint256,string)',
  'creationFee()',
  'creationFeePercentage()',
  'isPaused()',
  'owner()',
  'renounceOwnership()',
  'transferOwnership(address)',
  'withdraw(address,uint256)'
 **/
describe("Testing the ZCB issuer", () => {

    beforeAll(async () => {
        const accounts = ganache.getInitialAccounts()
        const firstAddress = Object.keys(accounts)[0]
        const account = getWeb3().eth.accounts.privateKeyToAccount(accounts[firstAddress].secretKey);
        let index = 1;
        Object.keys(accounts)
            .forEach((item) => {
                if (item.toLowerCase() !== account.address.toLowerCase()) {
                    constants[`RandomPK${index}`] = accounts[item].secretKey
                    index++
                }
            })

        const issuerConfig = getConfig(CONTRACT_TYPES.ZCB_ISSUER)
        const issuerContract = await deploy(account, issuerConfig.abi, issuerConfig.bytecode, ["50", "100000000000000000"])

        const usdtConfig = getConfig(CONTRACT_TYPES.USDT)
        const usdtContract = await deploy(account, usdtConfig.abi, usdtConfig.bytecode)

        const usdcConfig = getConfig(CONTRACT_TYPES.USDC)
        const usdcContract = await deploy(account, usdcConfig.abi, usdcConfig.bytecode)

        constants.issuer = issuerContract.contractAddress
        constants.OwnerPK = account.privateKey

        constants.USDT = usdtContract.contractAddress
        constants.USDC = usdcContract.contractAddress

        console.log(Object.keys(getIssuerContract().methods).filter(item => !item.startsWith("0x") && item.includes("(")))
        console.log(Object.keys(getZcbContract().methods).filter(item => !item.startsWith("0x") && item.includes("(")))
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
    })

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
            data: contract.methods.transferOwnership(newAccount.address).encodeABI(),
            privateKey: constants.OwnerPK
        })
        console.log(txDetails)
    })

    test('changeIssuer| Correct wallet(original value)', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();
        const newAccount = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

        const txDetails = await submitTransaction({
            data: contract.methods.transferOwnership(newAccount.address).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test('create| Correct Issue Bond', async () => {
        const contract = getIssuerContract();

        const {total, redeemLockPeriod, interestTokenAmount, investmentTokenAmount} = constants.bondInfoLocal


        const txDetails = await submitTransaction({
            data: contract.methods.create(total, redeemLockPeriod, constants.USDT, investmentTokenAmount, constants.USDC, interestTokenAmount, "USDT-USDC| Amet Finance").encodeABI(),
            value: constants.changedFee,
            privateKey: constants.RandomPK3
        })
        const {decoded} = txDetails;

        constants.bondInfoLocal.id = decoded.contractAddress;
        constants.bondInfoLocal.issuer = decoded.issuer;

        constants.interestToken = constants.USDT;
        constants.investmentToken = constants.USDC;
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
        const contractPausedState = await contract.methods.isPaused().call();
        console.log(contractPausedState)

        const txDetails = await submitTransaction({
            data: contract.methods.changePauseState(constants.isPaused).encodeABI(),
            privateKey: constants.OwnerPK
        })
    })

    test.failing('isPaused| Check creation', async () => {
        const contract = getIssuerContract();

        const investmentAmount = toBN(100).mul(toBN(10).pow(toBN(18)))
        const interestAmount = toBN(110).mul(toBN(10).pow(toBN(18)));
        const contractPausedState = await contract.methods.isPaused().call();
        console.log(contractPausedState)

        const txDetails = await submitTransaction({
            data: contract.methods.create(100, 3600, constants.USDT, investmentAmount, constants.USDC, interestAmount, "USDT-USDC| Amet Finance").encodeABI(),
            value: constants.changedFee,
            privateKey: constants.RandomPK3
        }).catch(error => {
            console.log(error);
            throw Error(error);
        })
        console.log(txDetails)
    })

    test('Variable validation for Issuer', async () => {
        const web3 = getWeb3();
        const contract = getIssuerContract();

        const owner = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK)

        const issuer = await contract.methods.owner().call()
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


async function submitTransactionForZCB({data, privateKey, toAddress}) {
    await submitTransaction({
        data,
        toAddress: toAddress || constants.bondInfoLocal.id,
        privateKey: privateKey || constants.OwnerPK
    })
}

describe("Testing the ZCB", () => {

    // Starting from here goes checks for the ZCB
    //     'AMET_VAULT()',--- done
    //     'name()',--- done
    //     'symbol()',--- done
    //     'tokenURI(uint256)', --- done


    // Vault functions
    //     'changeBaseURI(string)', --- done
    //     'changeVaultAddress(address)', --- done
    //     'decreaseFeePercentage(uint16)', --- done


    // owner functions
    //     'withdrawRemaining()'
    //     'burnUnsoldBonds(uint256)',
    //     'changeOwner(address)',
    //     'issueBonds(uint256)',
    //     'decreaseRedeemLockPeriod(uint256)', --- done


    // User functions
    //     'approve(address,uint256)', -- OZ function
    //     'purchase(uint256)', --- done
    //     'redeem(uint256[])', --- done
    //     'safeTransferFrom(address,address,uint256)', -- OZ function
    //     'safeTransferFrom(address,address,uint256,bytes)', -- OZ function
    //     'setApprovalForAll(address,bool)', -- OZ function
    //     'supportsInterface(bytes4)', -- OZ function
    //     'transferFrom(address,address,uint256)', -- OZ function

    // Read-Only functions
    //     'balanceOf(address)' -- done,
    //     'getApproved(uint256)',
    //     'getInfo()',
    //     'getTokensPurchaseDates(uint256[])',
    //     'isApprovedForAll(address,address)',
    //     'ownerOf(uint256)', --- done


    test.failing('Purchase| Wrong approval', async () => {
        const contract = getZcbContract();

        await submitTransactionForZCB({
            data: contract.methods.purchase(10).encodeABI()
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

    test.failing('Purchase| Correct approval && Wrong amount', async () => {
        const type = constants.bondInfoLocal.investment
        const tokenContract = getTokenContract();

        const amount = constants.bondInfoLocal.total + 1;
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

    test('Purchase| Correct approval && Max amount', async () => {
        const type = constants.bondInfoLocal.investment
        const tokenContract = getTokenContract();

        const amount = constants.bondInfoLocal.total
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
        }).catch(error => {
            console.log(error)
            throw Error(error)
        })
    })


    test('Balance && Owner| Correct', async () => {

        const contract = getZcbContract();
        const account = getWeb3().eth.accounts.privateKeyToAccount(constants.OwnerPK);
        const account1 = getWeb3().eth.accounts.privateKeyToAccount(constants.RandomPK3);

        const balance = await contract.methods.balanceOf(account.address).call()
        const balance1 = await contract.methods.balanceOf(account1.address).call()

        const owner = await contract.methods.ownerOf(0).call()

        expect(Number(balance)).toBe(constants.bondInfoLocal.total)
        expect(Number(balance1)).toBe(0)

        expect(owner.toLowerCase()).toBe(account.address.toLowerCase());
    })


    test("Checking VAULT && name && symbol && tokenURI", async () => {
        const contract = getZcbContract();
        const ownerAccount = getWeb3().eth.accounts.privateKeyToAccount(constants.OwnerPK);

        const AMET_VAULT = await contract.methods.AMET_VAULT().call();
        const name = await contract.methods.name().call()
        const symbol = await contract.methods.symbol().call()
        const tokenURI = await contract.methods.tokenURI(0).call()

        expect(AMET_VAULT.toLowerCase()).toBe(ownerAccount.address.toLowerCase());
        expect(name).toBe(`${constants.bondInfoLocal.investment}-${constants.bondInfoLocal.interest}| Amet Finance`)
        expect(symbol).toBe("ZCB")
        expect(tokenURI).toBe(`https://storage.amet.finance/contracts/${constants.bondInfoLocal.id.toLowerCase()}.json`)
    })


    test.failing("Change token URI| Wrong address", async () => {
        const contract = getZcbContract();
        await submitTransactionForZCB({
            data: contract.methods.changeTokenURI(""),
            privateKey: constants.RandomPK1
        })
    })

    test("Change token URI| Correct address", async () => {
        const contract = getZcbContract();
        const storageUrl = `https://storage.amet.finance/contracts/`
        await submitTransactionForZCB({
            data: contract.methods.changeBaseURI("").encodeABI(),
        })

        const tokenURI = await contract.methods.tokenURI(0).call()
        expect(tokenURI).toBe(`${constants.bondInfoLocal.id.toLowerCase()}.json`)
        await submitTransactionForZCB({
            data: contract.methods.changeBaseURI(storageUrl).encodeABI(),
        })
        const tokenURIUpdated = await contract.methods.tokenURI(0).call()
        expect(tokenURIUpdated).toBe(`${storageUrl}${constants.bondInfoLocal.id.toLowerCase()}.json`)
    })


    test.failing("Change VAULT| Wrong address", async () => {
        const contract = getZcbContract();
        await submitTransactionForZCB({
            data: contract.methods.changeVaultAddress(getWeb3().eth.accounts.create().address).encodeABI(),
            privateKey: constants.RandomPK1
        })
    })

    test("Change VAULT| Correct address", async () => {
        const contract = getZcbContract();

        const ownerAccount = getWeb3().eth.accounts.privateKeyToAccount(constants.OwnerPK);
        const accountRandom5 = getWeb3().eth.accounts.privateKeyToAccount(constants.RandomPK5);

        await submitTransactionForZCB({
            data: contract.methods.changeVaultAddress(accountRandom5.address).encodeABI(),
            privateKey: constants.OwnerPK
        })

        const newOwner = await contract.methods.AMET_VAULT().call()
        expect(newOwner.toLowerCase()).toBe(accountRandom5.address.toLowerCase());

        await submitTransactionForZCB({
            data: contract.methods.changeVaultAddress(ownerAccount.address).encodeABI(),
            privateKey: accountRandom5.privateKey
        })

        const defaultOwner = await contract.methods.AMET_VAULT().call()
        expect(defaultOwner.toLowerCase()).toBe(ownerAccount.address.toLowerCase());
    })


    test.failing("Decrease Fee Percentage| Wrong address", async () => {
        const contract = getZcbContract();
        await submitTransactionForZCB({
            data: contract.methods.decreaseFeePercentage(Number(constants.changedFeePercentage) - 2).encodeABI(),
            privateKey: constants.RandomPK2
        })
    })

    test.failing("Decrease Fee Percentage| Wrong amount", async () => {
        const contract = getZcbContract();
        await submitTransactionForZCB({
            data: contract.methods.decreaseFeePercentage(Number(constants.changedFeePercentage) + 10).encodeABI(),
            privateKey: constants.OwnerPK
        })
    })

    test("Decrease Fee Percentage| Correct", async () => {
        const contract = getZcbContract();
        await submitTransactionForZCB({
            data: contract.methods.decreaseFeePercentage(Number(constants.changedFeePercentage) - 10).encodeABI(),
            privateKey: constants.OwnerPK
        })

        const contractInfo = await contract.methods.getInfo().call();
        expect(Number(contractInfo[9])).toBe(Number(constants.changedFeePercentage) - 10);
    })


    test('Deposit to ZCB', async () => {
        const type = constants.bondInfoLocal.interest
        const tokenContract = getTokenContract(type);

        const value = toBN(constants.purchaseAmount).mul(toBN(constants.bondInfoLocal.interestTokenAmount))

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
        }).catch(error => {
            console.log(error)
            throw Error(error)
        })
    })

    test('Redeem| Correct', async () => {
        const web3 = getWeb3()
        const block = await web3.eth.getBlock("latest")
        await ganache.send("evm_mine", [{
            timestamp: block.timestamp + constants.bondInfoLocal.redeemLockPeriod + 20,
            blocks: block.number + 2000
        }]); // skips the timestamp to lockPeriod + 1 seconds

        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.redeem([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.OwnerPK
        }).catch(error => {
            console.log(error)
            throw Error(error)
        })
    })


    test.failing('Decreasing Lock Period| Wrong', async () => {
        const web3 = getWeb3()

        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.decreaseRedeemLockPeriod(constants.bondInfoLocal.redeemLockPeriod + 10).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.RandomPK3
        }).catch(error => {
            console.log(error)
            throw Error(error)
        })
    })

    test('Decreasing Lock Period| Correct', async () => {
        const web3 = getWeb3()

        const contract = getZcbContract();

        await submitTransaction({
            data: contract.methods.decreaseRedeemLockPeriod(constants.bondInfoLocal.redeemLockPeriod - 1).encodeABI(),
            toAddress: constants.bondInfoLocal.id,
            privateKey: constants.RandomPK3
        }).catch(error => {
            console.log(error)
            throw Error(error)
        })

        constants.bondInfoLocal.redeemLockPeriod = constants.bondInfoLocal.redeemLockPeriod - 1;
    })
})
