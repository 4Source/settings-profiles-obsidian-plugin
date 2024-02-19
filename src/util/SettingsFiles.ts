import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { PROFILE_OPTIONS_MAP, ProfileOptions } from "src/settings/SettingsInterface";
import { ensurePathExist, getAllFiles, isValidPath } from "./FileSystem";

/**
 * Saves the profiles options data to the path.
 * @param profilesList The profiles to save
 * @param profilesPath The path where the profiles should be saved 
 */
export function saveProfilesOptions(profilesList: ProfileOptions[], profilesPath: string) {
    try {
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
            ensurePathExist([profilesPath, profile.name]);

            // Write profile settings to path
            const file = join(profilesPath, profile.name, "profile.json");
            const profileSettings = JSON.stringify(profile, null, 2);
            writeFileSync(file, profileSettings, 'utf-8');
        });
    } catch (e) {
        (e as Error).message = 'Failed to save profile data! ' + (e as Error).message;
        throw e;
    }
}

/**
 * Loads the profiles options data form the path
 * @param profilesPath The path where the profiles are saved
 */
export function loadProfilesOptions(profilesPath: string) {
    try {
        // Search for all profiles existing
        const files = getAllFiles([profilesPath, "/*/profile.json"]);
        let profilesList: ProfileOptions[] = [];

        // Read profile settings
        files.forEach(file => {
            if (existsSync(file) && statSync(file).isFile()) {
                const data = readFileSync(file, "utf-8");
                profilesList.push(JSON.parse(data));
            }
        });
        return profilesList;
    } catch (e) {
        (e as Error).message = 'Failed to load profile data! ' + (e as Error).message;
        throw e;
    }
}

/**
 * Returns all setting files if they are enabeled in profile
 * @param profile The profile for which the files will be returned
 * @returns an array of file names
 * @todo return {add: string[], remove: string[]}
 */
export function getConfigFilesList(profile: ProfileOptions | undefined): string[] {
    const files = [];
    for (const key in profile) {
        if (profile.hasOwnProperty(key)) {
            const value = profile[key as keyof ProfileOptions];
            if (typeof value === 'boolean' && key !== 'enabled' && value) {
                const file = PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].file;
                if (typeof file === 'string') {
                    files.push(file);
                }
                else if (Array.isArray(file)) {
                    files.push(...file);
                }
            }
        }
    }

    return files;
}

/**
 * Returns all ignore files if they are enabeled in profile
 * @param profile The profile for which the files will be returned
 * @returns an array of file names
 * @todo return {add: string[], remove: string[]}
 */
export function getIgnoreFilesList(profile: ProfileOptions | undefined): string[] {
    const files = [];
    for (const key in profile) {
        if (profile.hasOwnProperty(key)) {
            const value = profile[key as keyof ProfileOptions];
            if (typeof value === 'boolean' && key !== 'enabled' && value) {
                const file = PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].ignore;
                if (typeof file === 'string') {
                    files.push(file);
                }
                else if (Array.isArray(file)) {
                    files.push(...file);
                }
            }
        }
    }

    return files;
}