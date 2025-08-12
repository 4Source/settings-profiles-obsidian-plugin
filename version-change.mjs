import { readFileSync, writeFileSync } from "fs";
import { valid } from "semver";

const newVersion = process.argv.find(value => value.startsWith('--new_version'));
if (!newVersion) {
    throw Error('Param --new_version is missing!');
}
const targetVersion = newVersion.split('=')[1];
if (!targetVersion) {
    throw Error('Param --new_version is empty!');
}
if (!valid(targetVersion)) {
    throw Error('New version is invalid!')
}

// read minAppVersion from manifest.json
let manifestFile = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifestFile;
if (!minAppVersion || minAppVersion === "") {
    throw Error('Missing minAppVersion in "manifest.json"');
}

// update version to target version
manifestFile.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifestFile, null, "\t"));

// update version in package
let packageFile = JSON.parse(readFileSync("package.json", "utf8"));
packageFile.version = targetVersion;
writeFileSync("package.json", JSON.stringify(packageFile, null, "\t"));

// read versions file 
let versionsFile = JSON.parse(readFileSync("versions.json", "utf8"));
let keys = Object.keys(versionsFile);

// remove existing versions with same minAppVersion
keys.forEach(key => {
    if (minAppVersion === versionsFile[key]) {
        delete versionsFile[key];
    }
});

// update versions.json with target version and minAppVersion from manifest.json
versionsFile[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versionsFile, null, "\t"));
