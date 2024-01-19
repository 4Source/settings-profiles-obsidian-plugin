import { Notice, Plugin } from 'obsidian';
import { join } from 'path';
import { existsSync } from 'fs';
import { SettingsProfilesSettingTab } from "src/Settings";
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { copyFile, copyFolderRecursiveSync, ensurePathExist, getAllFiles, getVaultPath, isValidPath, keepNewestFile, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_SETTINGS, PER_PROFILE_SETTINGS_MAP, Settings, PerProfileSetting } from './interface';

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

		const profile = this.getCurrentProfile();
		// Register to close obsidian
		this.registerEvent(this.app.workspace.on('quit', () => {
			// Sync profiles
			if (profile?.autoSync) {
				this.saveProfile(profile.name);
			}
		}));

		// Display Settings Profile on Startup
		new Notice(`Current profile: ${this.getCurrentProfile()?.name}`);

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
				new Notice(`Current profile: ${this.getCurrentProfile()?.name}`);
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
		let profile = this.getCurrentProfile();
		if (profile?.autoSync) {
			this.loadProfile(profile.name);
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
		const profile = this.getCurrentProfile();
		if (profile?.autoSync) {
			this.saveProfile(profile.name);
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
		// Save current Profile to possible switch back if failed
		const previousProfile = this.getCurrentProfile();

		// Check is current profile
		if (previousProfile && previousProfile.name === profileName) {
			new Notice('Allready current Profile!');
			return;
		}

		// Enabel new Profile
		const newProfile = this.settings.profilesList.find(profile => profile.name === profileName);
		if (newProfile) {
			newProfile.enabled = true;
		}

		// Load profile config
		const profile = this.getCurrentProfile();
		if (profile && await this.copyConfig(
			[
				this.settings.profilesPath,
				profile.name],
			getVaultPath() !== "" ? [
				getVaultPath(),
				this.app.vault.configDir
			] : [])) {

			new Notice(`Switched to profile ${this.getCurrentProfile()?.name}`);
			// Reload obsidian so changed settings can take effect
			// @ts-ignore
			this.app.commands.executeCommandById("app:reload");
		}
		else {
			// Copy settings failed.
			new Notice(`Failed to switch ${profileName} Profile!`);
		}

		this.loadProfile(profileName)
			.then(() => {
				this.saveSettings();
			})
			.finally(() => {
				// Reload obsidian so changed settings can take effect
				// @ts-ignore
				this.app.commands.executeCommandById("app:reload");
			})
	}

	/**
	 * Create a new profile based on the current profile.
	 * @param profileName The name of the new profile
	 */
	async createProfile(profile: PerProfileSetting) {
		// Check profile Exist
		if (this.settings.profilesList.find(value => value.name === profile.name)) {
			new Notice('Failed to create Profile! Already exist.')
			return;
		}

		// Add profile to profileList
		this.settings.profilesList.push(profile);

		// Enabel new Profile
		const selectedProfile = this.settings.profilesList.find(value => value.name === profile.name);
		if (selectedProfile) {
			// Sync the profile settings
			this.saveProfile(selectedProfile.name);
			// Disable selected profile
			selectedProfile.enabled = false;
		}
		else {
			new Notice(`Failed to create Profile ${profile.name}!`);
			this.settings.profilesList.pop();
		}

		await this.saveSettings();
	}

	async editProfile(profileName: string, profileSettings: Partial<PerProfileSetting>) {
		const profile = this.settings.profilesList.find(value => value.name === profileName);
		// Check profile Exist
		if (!profile) {
			new Notice(`Failed to remove ${profileName} profile!`);
			return;
		}

		Object.keys(profileSettings).forEach(key => {
			const objKey = key as keyof PerProfileSetting;

			if (objKey === 'name' || objKey === 'enabled') {
				return;
			}

			const value = profileSettings[objKey];
			if (typeof value === 'boolean') {
				profile[objKey] = value;
			}
		});

		await this.saveSettings();
	}

	/**
	 * Removes the profile and all its settings
	 * @param profileName The name of the profile
	 */
	async removeProfile(profileName: string) {
		const profile = this.settings.profilesList.find(value => value.name === profileName);
		// Check profile Exist
		if (!profile) {
			new Notice(`Failed to remove ${profileName} profile!`);
			return;
		}

		// Is profile to remove current profile
		if (profile.enabled) {
			const otherProfile = this.settings.profilesList.first();
			if (otherProfile) {
				this.switchProfile(otherProfile.name);
			}
		}

		// Remove to profile settings
		removeDirectoryRecursiveSync([this.settings.profilesPath, profileName]);

		this.settings.profilesList.remove(profile);
		await this.saveSettings();
	}

	/**
	 * Save the profile settings
	 * @param profileName [profileName='Default'] The name of the profile to load.
	 */
	async saveProfile(profileName: string = 'Default') {
		// Check target dir exist
		if (!ensurePathExist([this.settings.profilesPath, profileName])) {
			new Notice(`Failed to save ${profileName} Profile!`);
			return;
		}
		// Check for modified files
		this.getAllConfigFiles().forEach(file => {
			if (file.includes("/*/") && getVaultPath() !== "") {
				const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file]).map(value => value.split('\\').slice(-file.split('/').length));

				pathVariants.forEach(value => {
					if (!copyFile([getVaultPath(), this.app.vault.configDir, ...value], [this.settings.profilesPath, profileName, ...value])) {
						new Notice(`Failed to save ${profileName} Profile!`);
						return;
					}
				})
			}
			else if (getVaultPath() !== "") {
				if (!copyFile([getVaultPath(), this.app.vault.configDir, file], [this.settings.profilesPath, profileName, file])) {
					new Notice(`Failed to save ${profileName} Profile!`);
					return;
				}
			}
		});

		// Check for modified files in paths
		this.getAllConfigPaths().forEach(path => {
			if (getVaultPath() !== '') {
				let files = getAllFiles([getVaultPath(), this.app.vault.configDir, path]).map(value => value.split('\\').slice(-path.split('/').length - 1));

				files.forEach(file => {
					if (!copyFile([getVaultPath(), this.app.vault.configDir, ...file], [this.settings.profilesPath, profileName, ...file])) {
						new Notice(`Failed to save ${profileName} Profile!`);
						return;
					}
				});
			}
		});
	}

	/**
	 * Load the profile settings
	 * @param profileName [profileName='Default'] The name of the profile to load.
	 */
	async loadProfile(profileName: string = 'Default') {
		// Check target dir exist
		if (!ensurePathExist([this.settings.profilesPath, profileName])) {
			new Notice(`Failed to load ${profileName} Profile!`);
			return;
		}
		// Check for modified files
		this.getAllConfigFiles().forEach(file => {
			if (file.includes("/*/") && getVaultPath() !== "") {
				const pathVariants = getAllFiles([this.settings.profilesPath, profileName, file]).map(value => value.split('\\').slice(-file.split('/').length));

				pathVariants.forEach(value => {
					copyFile([this.settings.profilesPath, profileName, ...value], [getVaultPath(), this.app.vault.configDir, ...value]);
				})
			}
			else if (getVaultPath() !== "") {
				copyFile([this.settings.profilesPath, profileName, file], [getVaultPath(), this.app.vault.configDir, file]);
			}
		});

		// Check for modified files in paths
		this.getAllConfigPaths().forEach(path => {
			if (getVaultPath() !== '') {
				let files = getAllFiles([this.settings.profilesPath, profileName, path]).map(value => value.split('\\').slice(-path.split('/').length - 1));

				files.forEach(file => {
					copyFile([this.settings.profilesPath, profileName, ...file], [getVaultPath(), this.app.vault.configDir, ...file]);
				});
			}
		});
	}

	/**
	 * Sync Settings for the profile. With the current vault settings.
	 * @param profileName [profileName='Default'] The name of the profile to sync.
	 * @deprecated will be removed on release. Replaced with saveProfile/loadProfile
	 */
	async syncSettings(profileName: string = 'Default') {
		// Check target dir exist
		if (!ensurePathExist([this.settings.profilesPath, profileName])) {
			new Notice(`Failed to sync ${profileName} profile!`);
			return;
		}
		// Check for modified files
		this.getAllConfigFiles().forEach(file => {
			if (file.includes("/*/") && getVaultPath() !== "") {
				const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file]).map(value => value.split('\\').slice(-file.split('/').length));

				pathVariants.forEach(value => {
					keepNewestFile([this.settings.profilesPath, profileName, ...value], [getVaultPath(), this.app.vault.configDir, ...value]);
				})
			}
			else if (getVaultPath() !== "") {
				keepNewestFile([this.settings.profilesPath, profileName, file], [getVaultPath(), this.app.vault.configDir, file]);
			}
		});

		// Check for modified files in paths
		this.getAllConfigPaths().forEach(path => {
			if (getVaultPath() !== '') {
				let files = getAllFiles([getVaultPath(), this.app.vault.configDir, path]).map(value => value.split('\\').slice(-path.split('/').length - 1));

				files.forEach(file => {
					keepNewestFile([this.settings.profilesPath, profileName, ...file], [getVaultPath(), this.app.vault.configDir, ...file]);
				});
			}
		});
	}

	/**
	 * Copy the Config form source to target.
	 * @param sourcePath Source Config
	 * @param targetPath Target Config
	 * @returns True if was successfull.
	 * @deprecated will be removed on release
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
			if (!copyFile([...sourcePath, file], [...targetPath, file])) {
				new Notice(`Failed to copy config!`);
				return;
			}
		});

		// Check for modified files
		this.getAllConfigFiles().forEach(file => {
			if (file.includes("/*/") && getVaultPath() !== "") {
				const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file]).map(value => value.split('\\').slice(-file.split('/').length));

				pathVariants.forEach(value => {
					if (!copyFile([...sourcePath, ...value], [...targetPath, ...value])) {
						new Notice(`Failed to copy config!`);
						return;
					}
				})
			}
			else {
				if (!copyFile([...sourcePath, file], [...targetPath, file])) {
					new Notice(`Failed to copy config!`);
					return;
				}
			}
		});


		// Check each file in paths
		this.getAllConfigPaths().forEach(path => {
			if (!existsSync(join(...sourcePath, path))) {
				new Notice(`Failed to copy config!`);
				return;
			}

			let files = getAllFiles([...sourcePath, path]);

			files.forEach(file => {
				if (!copyFile([...sourcePath, path, file], [...targetPath, path, file])) {
					new Notice(`Failed to copy config!`);
					return;
				}
			})
		})
		return true;
	}

	/**
	 * Returns all settings if they are enabeled in profile
	 * @returns an array of file names
	 * @todo return {add: string[], remove: string[]}
	 */
	getAllConfigFiles(): string[] {
		const profile = this.getCurrentProfile();
		const files = [];
		for (const key in profile) {
			if (profile.hasOwnProperty(key)) {
				const value = profile[key as keyof PerProfileSetting];
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
	 * Returns all settings paths if thay are enabeled in profile
	 * @returns an array of paths
	 * @todo return {add: string[], remove: string[]}
	 */
	getAllConfigPaths(): string[] {
		const profile = this.getCurrentProfile();
		const paths = [];
		for (const key in profile) {
			if (profile.hasOwnProperty(key)) {
				const value = profile[key as keyof PerProfileSetting];
				if (typeof value === 'boolean' && key !== 'enabled' && value) {
					const path = PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].path;
					if (typeof path === 'string') {
						paths.push(path);
					}
					else if (Array.isArray(path)) {
						paths.push(...path);
					}
				}
			}
		}

		return paths;
	}


	/**
	 * Gets the currently enabeled profile.
	 * @returns The SettingsProfile object. Or undefined if not found.
	 */
	getCurrentProfile(): PerProfileSetting | undefined {
		const currentProfile = this.settings.profilesList.find(profile => profile.enabled === true);
		if (!currentProfile) {
			return;
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

