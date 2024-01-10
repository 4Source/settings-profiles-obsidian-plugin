import { Notice, Plugin } from 'obsidian';
import { join } from 'path';
import { existsSync } from 'fs';
import { SettingsProfilesSettingTab } from "src/Settings";
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { copyFile, copyFolderRecursiveSync, ensurePathExist, getVaultPath, isValidPath, keepNewestFile, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, PER_PROFILE_SETTINGS_MAP, Settings, PerProfileSetting } from './interface';

export default class SettingsProfilesPlugin extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		if (!ensurePathExist([this.settings.profilesPath])) {
			new Notice("Profile save path is not valid!");
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));

		// Register to close obsidian
		this.registerEvent(this.app.workspace.on('quit', () => {
			// Sync Profiles
			if (this.getCurrentProfile().autoSync) {
				this.syncSettings();
			}
		}));

		// Display Settings Profile on Startup
		new Notice(`Current profile: ${this.getCurrentProfile().name}`);

		// Add Command to Switch between profiles
		this.addCommand({
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				new ProfileSwitcherModal(this.app, this, (result, state) => {
					switch (state) {
						case ProfileState.CURRENT:
							return;
						case ProfileState.NEW:
							// Create new Profile
							this.createProfile(result);
							break;
					}
					this.switchProfile(result.name);
				}).open();
			}
		});

		// Add Command to Show current profile
		this.addCommand({
			id: "current-profile",
			name: "Show current profile",
			callback: () => {
				new Notice(`Current profile: ${this.getCurrentProfile().name}`);
			}
		});
	}

	onunload() { }

	/**
	 * Load Plugin Settings from file or default.
	 * Sync Profiles if enabeled.
	 */
	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Sync Profiles
		if (this.getCurrentProfile().autoSync) {
			this.syncSettings();
		}
	}

	/**
	 * Save Plugin Settings to file.
	 * Sync Profiles if enabeled.
	 */
	private async saveSettings() {
		// Save settings
		await this.saveData(this.settings);

		// Sync Profiles
		if (this.getCurrentProfile().autoSync) {
			this.syncSettings();
		}
	}

	/**
	 * Change the path to save the profiles
	 * @param path The target where to save the profiles
	 */
	async changeProfilePath(path: string) {
		// Copy profiles to new path
		copyFolderRecursiveSync([this.settings.profilesPath], [path]);
		// Remove old profiles path
		removeDirectoryRecursiveSync([this.settings.profilesPath]);

		this.settings.profilesPath = path;
		await this.saveSettings();
	}

	/**
	 * Switch to other Settings Profile.
	 * @param profileName The name of the profile to switch to
	 */
	async switchProfile(profileName: string) {
		// Check profile Exist
		if (!this.settings.profilesList.find(value => value.name === profileName)) {
			new Notice(`Failed to switch ${profileName} profile!`);
			return;
		}

		// Save current Profile to possible switch back if failed
		const previousProfile = structuredClone(this.getCurrentProfile());

		// Check is current profile
		if (previousProfile.name === profileName) {
			new Notice('Allready current Profile!');
			return;
		}

		this.previousSettings.profile = structuredClone(this.settings.profile)
		this.settings.profile = profileName;
		// Switch to Profile
		const configSource = join(this.settings.profilesPath, this.settings.profile);
		const configTarget = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";

		// Load profile config
		if (await this.copyConfig(
			[
				this.settings.profilesPath,
				this.getCurrentProfile().name],
			getVaultPath() !== "" ? [
				getVaultPath(),
				this.app.vault.configDir
			] : [])) {

			new Notice(`Switched to profile ${this.getCurrentProfile().name}`);
			// Reload obsidian so changed settings can take effect
			// @ts-ignore
			this.app.commands.executeCommandById("app:reload");
		}
		else {
			// Copy config failed.
			new Notice(`Failed to switch ${this.getCurrentProfile().name} profile!`);
			// Reset profile
			this.getCurrentProfile().enabled = false;
			previousProfile.enabled = true;
		}
		await this.saveSettings();
	}

	/**
	 * Create a new profile based on the current profile.
	 * @param profileName The name of the new profile
	 */
	async createProfile(newProfile: PerProfileSetting) {
		if (this.settings.profilesList.find(profile => profile.name === newProfile.name)) {
			new Notice('Failed to create Profile! Already exist.')
			return;
		}

		newProfile.enabled = false;

		this.settings.profilesList.push(newProfile);

		// Copy profile config
		this.copyConfig(getVaultPath() !== "" ? [getVaultPath(), this.app.vault.configDir] : [], [this.settings.profilesPath, newProfile.name]);
		await this.saveSettings();
	}

	async editProfile(profileName: string, profileSettings: Partial<PerProfileSetting>) {
		const profile = this.settings.profilesList.find(value => value.name === profileName);
		// Check profile Exist
		if (!profile) {
			new Notice(`Failed to remove ${profileName} Profile!`);
			return;
		}

		Object.keys(profileSettings).forEach(key => {
			const objKey = key as keyof PerProfileSetting;

			if (objKey === 'name' || objKey === 'enabled') {
				return;
			}

			const value = profileSettings[objKey];
			if (typeof value === 'boolean'){
				profile[objKey] = value;
			}
		});

		await this.saveSettings();
	}

	/**
	 * Removes the profile and all its configs
	 * @param profileName The name of the profile
	 */
	async removeProfile(profileName: string) {
		const profile = this.settings.profilesList.find(value => value.name === profileName);
		// Check profile Exist
		if (!profile) {
			new Notice(`Failed to remove ${profileName} Profile!`);
			return;
		}

		// Is profile to remove current profile
		if (profile.enabled) {
			const otherProfile = this.settings.profilesList.first();
			if (otherProfile) {
				this.switchProfile(otherProfile.name);
			}
		}

		// Remove to profile config
		removeDirectoryRecursiveSync([this.settings.profilesPath, profileName]);

		this.settings.profilesList.remove(profile);
		await this.saveSettings();
	}

	/**
	 * Sync Settings for the profile. With the current vault settings.
	 * @param profileName [current profile] The name of the profile to sync.
	 */
	async syncSettings(profileName: string = this.getCurrentProfile().name) {
		// Check target dir exist
		if (!ensurePathExist([this.settings.profilesPath, profileName])) {
			new Notice(`Failed to sync ${profileName} Profile!`);
			return;
		}

		// Check for modified settings
		this.getAllConfigFiles().forEach(file => {
			keepNewestFile(getVaultPath() !== "" ?
				[
					getVaultPath(),
					this.app.vault.configDir,
					file] : [],
				[
					this.settings.profilesPath,
					profileName,
					file
				]);
		});
	}

	/**
	 * Copy the Config form source to target.
	 * @param sourcePath Source Config
	 * @param targetPath Target Config
	 * @returns True if was successfull.
	 */
	async copyConfig(sourcePath: string[], targetPath: string[]) {
		if (!isValidPath(sourcePath) || !isValidPath(targetPath) || !existsSync(join(...sourcePath))) {
			return false;
		}
		if (!ensurePathExist(targetPath)) {
			new Notice(`Failed to copy config!`);
			return;
		}
		if (!ensurePathExist(sourcePath)) {
			new Notice(`Failed to copy config!`);
			return;
		}

		// Check each Config File
		this.getAllConfigFiles().forEach(file => {
			if (!copyFile(sourcePath, targetPath, file)) {
				new Notice(`Failed to copy config!`);
				return;
			}
		});

		return true;
	}

	/**
	 * Returns all configs if they are enabeled in current profile
	 * @returns an array of file names
	 */
	getAllConfigFiles(): string[] { // {add: string[], remove: string[]}
		const files = [];
		for (const key in this.getCurrentProfile()) {
			if (this.getCurrentProfile().hasOwnProperty(key)) {
				const value = this.getCurrentProfile()[key as keyof PerProfileSetting];

				if (typeof value === 'boolean' && key !== 'enabled') {
					if (value) {
						const file = PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].file;
						if (typeof file === 'string') {
							files.push(file);
						}
						else if (Array.isArray(file)) {
							files.push(...file);
						}
					}
				}
			}
		}

		return files;
	}

	/**
	 * Gets the currently enabeled profile.
	 * @returns The SettingsProfile object.
	 */
	getCurrentProfile(): PerProfileSetting {
		const currentProfile = this.settings.profilesList.find(profile => profile.enabled === true);
		if (!currentProfile) {
			return DEFAULT_PROFILE;
		}
		return currentProfile;
	}

	/**
	 * Gets the currently enabled profile.
	 * @returns boolean.
	 */
	isEnabled(profile: PerProfileSetting): boolean {
		//verify if a profil is already enabled
		if (this.settings.profilesList.find(value => value.enabled === true) && !profile.enabled)
			return false;
		return profile.enabled ?? profile.name === "Default";
	}
}

