const Web3 = require("web3");
const Issuer_ABI = require('./abi-jsons/Issuer.json')

const constants = {
    IssuerContract: "0xFe159cC17d1c98758bB98c9437F9f1349940049C",
    OwnerPK: "0x5d11d2d5f2402073eeabedb99c8f29828d5aa522f429257e1bf43f5ca9674d5a",
    RandomPK1: "0x11c6805600c2faaa90c3143f8b0edb4cb2ae209cb005a0ea0f47314e737d459f",
    RandomPK2: "0xd14394b32435023676efadeadbf13e11ca8882d4109be3914805a30ca191dad5",

    changedFee: "1000000000000000000",
    changedFeePercentage: "10"
}

describe("Testing the issuer contract", () => {


    function getWeb3() {
        return new Web3('http://127.0.0.1:7545');
    }

    function getContract() {
        const web3 = getWeb3()
        return new web3.eth.Contract(Issuer_ABI, constants.IssuerContract);
    }

    const functions = Object.keys(getContract().methods).filter(i => !i.startsWith("0x"))
    console.log(functions)

    test('Change Creation Fee with wrong wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();
            const account = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeCreationFee(constants.changedFee).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);


            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('Change Creation Fee with correct wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const account = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeCreationFee(constants.changedFee).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);

            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    }) // fee is 1 ETH already

    test('Change Creation Fee Percentage with wrong wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();
            const account = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);


            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('Change Creation Fee Percentage with correct wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const account = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeCreationFeePercentage(constants.changedFeePercentage).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);

            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    }) // fee percentage is 10%

    test('Change Issuer with wrong wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();
            const account = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeIssuer(account.address).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);


            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(true);
    })

    test('Change Issuer with correct wallet', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const account = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);
            const newAccount = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeIssuer(newAccount.address).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);

            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('Bring the Original issuer back', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const account = web3.eth.accounts.privateKeyToAccount(constants.RandomPK1);
            const newAccount = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK);

            const tx = {
                to: constants.IssuerContract,
                from: account.address,
                data: contract.methods.changeIssuer(newAccount.address).encodeABI()
            }

            tx.gas = await web3.eth.estimateGas(tx);

            const transactionSigned = await account.signTransaction(tx);
            const txDetails = await web3.eth.sendSignedTransaction(transactionSigned.rawTransaction)
            console.log(txDetails)
        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })

    test('Issue Bond', async () => {

    })

    test('Validate The Tests', async () => {
        let hasError = false;
        try {
            const web3 = getWeb3();
            const contract = getContract();

            const owner = web3.eth.accounts.privateKeyToAccount(constants.OwnerPK)

            const issuer = await contract.methods.issuer().call()
            const creationFeePercentage = await contract.methods.creationFeePercentage().call()
            const creationFee = await contract.methods.creationFee().call()

            if (issuer.toLowerCase() !== owner.address.toLowerCase()) {
                throw ""
            }

            if (creationFeePercentage != constants.changedFeePercentage) {
                throw ""
            }

            if (creationFee != constants.changedFee) {
                throw ""
            }

        } catch (error) {
            hasError = true
        }

        expect(hasError).toBe(false);
    })


    //       'create',
    //       'create(uint256,uint256,address,uint256,address,uint256,string)',

    //       'withdraw',
    //       'withdraw(address,uint256)',
})