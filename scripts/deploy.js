const Web3 = require('web3');
const ganacheProvider = require('./ganache')

const web3 = new Web3(ganacheProvider);

async function deploy(account, contractAbi, contractBytecode, constructorArgs =[]) {
    try {


        const MyContract = new web3.eth.Contract(contractAbi);

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
            issuer: account.address,
            abi: contractAbi
        };
    } catch (error) {
        console.log(error)
        console.error('Error deploying contract: ' + error);
    }
}

module.exports = {
    deploy
}
