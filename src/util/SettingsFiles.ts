import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ProfileSetting } from "src/interface";
import { ensurePathExist, getAllFiles, isValidPath } from "./FileSystem";

/**
 * Saves the profile data to the path.
 * @param profilesList The profiles to save
 * @param profilesPath The path where the profiles should be saved 
 */
export function saveProfileData(profilesList: ProfileSetting[], profilesPath: string) {
    profilesList.forEach(profile => {
        // Ensure is valid profile
        if (!profile) {
            throw Error("Can't save undefined profile!");
        }
        // Ensure is valid path
        if (!isValidPath([profilesPath, profile.name])) {
            throw Error("Invalid path received!")
        }
        // Ensure path exist
        if (!ensurePathExist([profilesPath, profile.name])) {
            throw Error("The path cannot be accessed!")
        }

        // Write profile settings to path
        const file = join(profilesPath, profile.name, "profile.json");
        const profileSettings = JSON.stringify(profile, null, 2);
        writeFileSync(file, profileSettings, 'utf-8');
    });
}

/**
 * Loads the profiles data form the path
 * @param profilesPath The path where the profiles are saved
 */
export function loadProfileData(profilesPath: string) {
    // Search for all profiles existing
    const files = getAllFiles([profilesPath, "/*/profile.json"]);
    let profilesList: ProfileSetting[] = [];

    // Read profile settings
    files.forEach(file => {
        const data = readFileSync(file, "utf-8");
        profilesList.push(JSON.parse(data));
    });
    return profilesList;
}