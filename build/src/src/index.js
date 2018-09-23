'use strict';

// node modules
const logs = require('logs.js')(module);
const apm = require('modules/apm');
const ipfs = require('modules/ipfs');
const getDirectory = require('modules/getDirectory');

const directoryHashes = {};

getDirectory.getDirectory().then((packages) => {
  packages.forEach(addPackage);
});

getDirectory.subscribeToNewPackages(addPackage);

function addPackage(name) {
  const callback = (hash) => newVersion(name, hash);
  // Fetch current latest version
  apm.getLatest(name).then(callback);

  // Subscribe to new versions
  apm.subscribeToNewVersions(name, callback).then(() => {
    logs.info('Successfully subscribed to new versions of '+name);
  }).catch((err) => {
    logs.error('Error subscribing to new versions of '+name+': '+err);
  });
}

function newVersion(name, hash) {
  // Provided hash is the hash of the manifest.
  // Resolve it to get the image hash and avatar hash
  ipfs.cat(hash)
  .then((file) => file.toString('utf8'))
  .then(JSON.parse)
  .then((manifest) => {
    const avatarHash = manifest.avatar;
    const imageHash = manifest.image.hash;
    rePin(name, hash, 'manifest', name+'\'s manifest');
    rePin(name, imageHash, 'image', name+'\'s image');
    rePin(name, avatarHash, 'avatar', name+'\'s avatar');
  });
}

function rePin(name, hash, item, topic) {
  if (!hash) {
    return logs.warn('Missing hash of '+topic);
  }
  if (!directoryHashes[name]) {
    directoryHashes[name] = {};
  }
  if (directoryHashes[name][item]) {
    pinRmSafe(hash, topic);
  }
  directoryHashes[name][item] = hash;
  pinAddSafe(hash, topic);
}

function pinRmSafe(hash, topic) {
  ipfs.pinRm(hash).then(() => {
    logs.info('Successfully unpinned '+topic+' '+hash);
  }).catch((err) => {
    logs.error('Error unpinning '+topic+' '+hash+': '+err);
  });
}

function pinAddSafe(hash, topic) {
  ipfs.pinAdd(hash).then(() => {
    logs.info('Successfully pinned '+topic+' '+hash);
  }).catch((err) => {
    logs.error('Error pinning '+topic+' '+hash+': '+err);
  });
}
