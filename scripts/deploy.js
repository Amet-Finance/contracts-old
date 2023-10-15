const Web3 = require('web3');
const fs = require('fs');
const solc = require('solc');
const path = require("path");

const ganacheProvider = require('./ganache')
const web3 = new Web3(ganacheProvider);

const DIRECTIONS = {
    "ZCB_ISSUER": {
        bin: path.join(__dirname, '../contracts/zcb-v2/artefacts/zcb-issuer/bin/contracts_zcb-v2_ZeroCouponBondsIssuerV1_AmetFinance_sol_Zero_Coupon_Bond_Issuer_V1.bin'),
        abi: path.join(__dirname, '../contracts/zcb-v2/artefacts/zcb-issuer/abi/contracts_zcb-v2_ZeroCouponBondsIssuerV1_AmetFinance_sol_Zero_Coupon_Bond_Issuer_V1.abi')
    }
}

const accounts = ganacheProvider.getInitialAccounts();
const ownerAddress = Object.keys(accounts)[0]
const ownerDetails = accounts[ownerAddress]

const type = process.env.TYPE || "ZCB_ISSUER"
// Read the compiled bytecode and ABI of your contract
const contractBytecode = "0x" + fs.readFileSync(DIRECTIONS[type].bin).toString();
const contractAbi = JSON.parse(fs.readFileSync(DIRECTIONS[type].abi));

const account = web3.eth.accounts.privateKeyToAccount(ownerDetails.secretKey);


async function deploy() {
    try {

        // Create a new contract instance
        const MyContract = new web3.eth.Contract(contractAbi);

        // Define constructor arguments if your contract has any
        const constructorArgs = []; // Replace with actual constructor arguments
        const gasPrice = await web3.eth.getGasPrice();
        console.log(`gasPrice`, gasPrice)

        const contractDeployment = MyContract.deploy({
            data: contractBytecode,
            arguments: constructorArgs,
        })


        const newContractInstance = await contractDeployment.send({
            from: account.address,
            gas: '30000000', // Set an appropriate gas limit
            gasPrice: gasPrice, // Set an appropriate gas price
        });

        console.log('Contract deployed at address: ' + newContractInstance.options.address);
        return {
            contractAddress: newContractInstance.options.address,
            issuer: ownerAddress,
            abi: contractAbi
        };
    } catch (error) {
        console.error('Error deploying contract: ' + error);
    }
}

module.exports = {
    deploy
}