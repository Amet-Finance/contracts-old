const ganache = require('ganache')

const options = {};
const provider = ganache.provider(options);

module.exports = provider