# DNPinner

## Purpose

- Pin the latest version of all packages in the DAppNode's directory
- Unpin older version when the latest version changes

## Tasks

- Watch the DAppNode's directory and mantain an update list of packages
  - PackageAdded(uint indexed idPackage, string name);
    - call addPackage(name)
  - PackageUpdated(uint indexed idPackage, string name);
    - call addPackage(name)
- Watch each package's APM repo and mantain a record of the latest version
  - NewVersion(uint256 versionId, uint16[3] semanticVersion);
    - call newVersion(name, hash)
- On change pin or unpin accordingly
  - ipfs.pin.add(hash, function (err) {})
  - ipfs.pin.rm(hash, function (err, pinset) {})

## Data structure

```javascript
directory = {
    "kovan.dnp.dappmanager.eth": "QmQwBzV37wtnm1BtU1VZr3hramLZuCJDsz3m4P53fbCoHv",
    "ethchain.dnp.dappnode.eth": "QmQwBzV37wtnm1BtU1VZr3hramLZuCJDsz3m4P53fbCoHv"
    ...
}
```

## Methods

### addPackage(name)

Call newVersion. Subscribe to that repo's NewVersion event.

### newVersion(name, hash)

Check the directory object, if it's not empty unpin the current hash. Pin the new hash and store it in the directory object.
