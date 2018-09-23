const logs = require('logs.js')(module);
const directoryContract = require('contracts/directory.json');
const web3 = require('./web3Setup');


 /**
  * Fetches all package names in the custom dappnode directory.
  *
  * @return {Array} An array of objects:
  *  [
  *     name: packageName,  (string)
  *     ...
  *  ]
  */
async function getDirectory() {
  const directory = new web3.eth.Contract(directoryContract.abi, directoryContract.address);
  const numberOfDAppNodePackages = parseFloat(
    await directory.methods.numberOfDAppNodePackages().call()
  );

  let packages = [];
  for (let i = 0; i < numberOfDAppNodePackages; i++) {
    try {
      const pkg = await directory.methods.getPackage(i).call();
      packages.push(pkg.name);
    } catch (e) {
      logs.error('Error retrieving package #' + i + ' from directory, err: ' + e);
    }
  }
  return packages;
}

async function subscribeToNewPackages(callback) {
  const directory = new web3.eth.Contract(directoryContract.abi, directoryContract.address);
  /* eslint-disable new-cap */
  directory.events.PackageAdded((error, event) => {
    if (error) logs.error('Error on directory PackageAdded event: '+error);
    else callback(event.name);
  });
  directory.events.PackageUpdated((error, event) => {
    if (error) logs.error('Error on directory PackageUpdated event: '+error);
    else callback(event.name);
  });
}


module.exports = {
  getDirectory,
  subscribeToNewPackages,
};
