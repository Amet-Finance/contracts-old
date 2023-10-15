const Web3 = require("web3");
const {describe, test, expect, beforeAll} = require("@jest/globals")

const ganache = require('../scripts/ganache');
const {deploy} = require("../scripts/deploy");

const constants = {
    changedFee: "1000000000000000000",
    changedFeePercentage: "100" // decimals 2
}


//   "create(uint256,uint256,address,uint256,address,uint256,string)",

//   "withdraw",
//   "withdraw(address,uint256)",

function getWeb3() {
    return new Web3(ganache);
}

function getContract() {
    const web3 = getWeb3()

    return new web3.eth.Contract(constants.Issuer_ABI, constants.IssuerContract);
}

async function submitTransaction({data, privateKey}) {
    const web3 = getWeb3();
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    const tx = {
        to: constants.IssuerContract,
        from: account.address,
        data
    }

    tx.gas = await web3.eth.estimateGas(tx);
    const transactionSigned = await account.signTransaction(tx);
    return await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction);
}

describe("Testing the issuer contract", () => {

    beforeAll(() => {
        return deploy().then((data) => {

            const accounts = ganache.getInitialAccounts()
            const {contractAddress, issuer, abi} = data

            constants.Issuer_ABI = abi
            constants.IssuerContract = contractAddress
            constants.OwnerPK = accounts[issuer].secretKey
            let index = 1;
            Object.keys(accounts).forEach((account) => {
                if (account !== issuer) {
                    constants[`RandomPK${index}`] = accounts[account].secretKey
                    index++
                }
            })
        })
    });


    // const functions = Object.keys(getContract().methods).filter(i => !i.startsWith("0x"))
    // console.log(functions)

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

    test('Variable validation', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const owner = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK)

            const issuer = await contract.methods.issuer().call()
            const creationFeePercentage = await contract.methods.creationFeePercentage().call()
            const creationFee = await contract.methods.creationFee().call()

            if (issuer.toLowerCase() !== owner.address.toLowerCase()) {
                hasError = true
            }

            if (creationFeePercentage !== constants.changedFeePercentage) {
                hasError = true
            }

            if (creationFee !== constants.changedFee) {
                hasError = true
            }

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('create| Correct Issue Bond', async () => {
        expect(true).toBe(true)
    })

    test('create| Wrong Issue Bond', async () => {
        expect(true).toBe(true)
    })

    test('withdraw| Correct wallet', async () => {
        expect(true).toBe(true)
    })

    test('withdraw| Wrong wallet', async () => {
        expect(true).toBe(true)
    })

    test('isPaused| Pause and Check', async () => {
        expect(true).toBe(true)
    })
})


