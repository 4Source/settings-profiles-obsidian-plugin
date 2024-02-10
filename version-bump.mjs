import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// read versions file 
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
let keys = Object.keys(versions);

// remove existing versions with minAppVersion
keys.forEach(key => {
    if (minAppVersion === versions[key]) {
        delete versions[key];
    }
});

// update versions.json with target version and minAppVersion from manifest.json
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
