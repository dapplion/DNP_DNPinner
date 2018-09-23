// dedicated modules
const logs = require('logs.js')(module);
const web3 = require('./web3Setup');

const ensContract = require('contracts/ens.json');
const publicResolverContract = require('contracts/publicResolver.json');
const repoContract = require('contracts/repository.json');

function namehash(name, web3) {
    let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (name != '') {
        let labels = name.split('.');
        for (let i = labels.length - 1; i >= 0; i--) {
            node = web3.utils.sha3(node + web3.utils.sha3(labels[i]).slice(2), {encoding: 'hex'});
        }
    }
    return node.toString();
}

// Declare utility methods
const getRepoContract = async (reponame) => {
  const ens = new web3.eth.Contract(ensContract.abi, ensContract.address);
  const resolverAddress = await ens.methods.resolver(namehash(reponame, web3)).call();

  if (resolverAddress == '0x0000000000000000000000000000000000000000') {
    return;
  }

  const resolver = new web3.eth.Contract(publicResolverContract.abi, resolverAddress);
  const repoAddr = await resolver.methods.addr(namehash(reponame, web3)).call();
  return new web3.eth.Contract(repoContract.abi, repoAddr);
};

const getLatestVersion = async (repo) =>
  repo.methods.getLatest().call()
  .then((result) => web3.utils.hexToAscii(result.contentURI));

// Declare methods

const getLatest = async (name) => {
  let repo = await getRepoContract(name);
  if (!repo) {
    throw Error('Resolver could not found a match for ' + name);
  }
  return getLatestVersion(repo);
};

const subscribeToNewVersions = async (name, callback) => {
  let repo = await getRepoContract(name);
  if (!repo) {
    throw Error('Resolver could not found a match for ' + name);
  }
  /* eslint-disable new-cap */
  repo.events.NewVersion((error) => {
    if (error) logs.error('Error on NewVersion event of '+name+': '+error);
    else {
      getLatestVersion(repo).then(callback).catch((err) => {
        logs.error('Error fetching new version event of '+name+': '+err);
      });
    }
  });
};


module.exports = {
  getLatest,
  subscribeToNewVersions,
};
