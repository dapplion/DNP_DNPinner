'use strict';

// node modules
const logs = require('logs.js')(module);
const ipfs = require('modules/ipfs');
const web3 = require('./modules/web3Setup');
const registryContract = require('./contracts/registry.json');
const repoContract = require('./contracts/repository.json');

const directoryHashes = {};

const registry = new web3.eth.Contract(
  registryContract.abi,
  registryContract.address
);

// Get current repos
logs.info(`Fetching past events of registry ${registryContract.address}`)
registry.getPastEvents('NewRepo', {
  fromBlock: registryContract.deployBlock,
  toBlock: 'latest',
}).then(events => {
  // Deal with duplicated repos
  // If two events have the same id, the latest will be pinned
  const uniqueIdEvents = {}
  for (const event of events) {
    const {id, repo, name} = event.returnValues
    if (uniqueIdEvents[id]){
      if (event.blockNumber > uniqueIdEvents[id].blockNumber) {
        logs.warn(`Ignoring repo ${name} - ${uniqueIdEvents[id].returnValues.repo}, another most recent repo has the same id ${event.blockNumber} > ${uniqueIdEvents[id].blockNumber}`)
        uniqueIdEvents[id] = event
      } else {
        logs.warn(`Ignoring repo ${name} - ${repo}, another most recent repo has the same id ${uniqueIdEvents[id].blockNumber} > ${event.blockNumber}`)
      }  
    } else {
      uniqueIdEvents[id] = event
    }
  }
  Object.values(uniqueIdEvents).forEach(handleNewRepo)
});

// Subscribe to new repos
registry.events.NewRepo((err, event) => {
  if (err) return logs.error(`Error on registry NewRepo: ${err.stack || err.message}`);
  handleNewRepo(event);
});

function handleNewRepo(event) {
  // id: '0xd7ec73ef33cd0720e49cbc4bfb1a912840535bee540dcf01d1cc4caae0129631',
  // name: 'livepeer',
  // repo: '0xf655173FAfb85f9f2943b2F2518146a4c149c70b',
  const {id, name, repo: repoAddr} = event.returnValues
  addPackage({id, name, repoAddr})
}



function addPackage({id, name, repoAddr}) {
  logs.info(`Adding ${name}, repoAddr: ${repoAddr}, id: ${id}`)
  const repo = new web3.eth.Contract(repoContract.abi, repoAddr);

  function getLatest() {
    repo.methods.getLatest().call()
    .then((result) => web3.utils.hexToAscii(result.contentURI))
    .then((hash) => {
      if (hash.startsWith('/ipfs/')) newVersion({id, hash, name})
    })
    .catch((err) => logs.error(`Error getting ${name}'s latest version: ${err.stack || err.message}`))
  }

  // Get latest version
  getLatest()

  // Subscribe to new verions
  repo.events.NewVersion((error) => {
    if (error) return logs.error(`Error on NewVersion of ${name}: ${err.stack || err.message}`);
    getLatest()
  });
}

function newVersion({id, hash, name}) {
  // Provided hash is the hash of the manifest.
  // Resolve it to get the image hash and avatar hash
  ipfs.cat(hash)
  .then((file) => file.toString('utf8'))
  .then(JSON.parse)
  .then((manifest) => {
    const avatarHash = manifest.avatar;
    const imageHash = manifest.image.hash;
    rePin(id, hash, 'manifest', `${name}'s manifest`);
    rePin(id, imageHash, 'image', `${name}'s image`);
    rePin(id, avatarHash, 'avatar', `${name}'s avatar`);
  });
}

function rePin(id, hash, item, topic) {
  if (!hash) {
    return logs.warn('Missing hash of '+topic);
  }
  if (!directoryHashes[id]) {
    directoryHashes[id] = {};
  }
  if (directoryHashes[id][item]) {
    pinSafe('pinRm', hash, topic);
  }
  directoryHashes[id][item] = hash;
  pinSafe('pinAdd', hash, topic);
}

// method = pinRm, pinAdd
function pinSafe(method, hash, topic) {
  ipfs[method](hash).then(() => {
    logs.info(`Successfully ${method} ${topic} ${hash}`);
  }).catch((err) => {
    logs.error(`Error ${method} ${topic} ${hash}: ${err.stack || err.message}`);
  });
}
