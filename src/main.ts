import { Notice, Plugin } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/Settings";
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { copyFile, copyFolderRecursiveSync, ensurePathExist, getAllFiles, getVaultPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_VAULT_SETTINGS, VaultSettings, ProfileSetting, GlobalSettings, DEFAULT_GLOBAL_SETTINGS } from './interface';
import { getConfigFilesList, loadProfileData, saveProfileData } from './util/SettingsFiles';

export default class SettingsProfilesPlugin extends Plugin {
	vaultSettings: VaultSettings;
	globalSettings: GlobalSettings;
	settingsTab: SettingsProfilesSettingTab;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		try {
			ensurePathExist([this.vaultSettings.profilesPath]);
		} catch (e) {
			new Notice("Profile save path is not valid!");
			(e as Error).message = 'Profile path is not valid! ' + (e as Error).message;
			console.error(e);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.settingsTab = new SettingsProfilesSettingTab(this.app, this);
		this.addSettingTab(this.settingsTab);

		const profile = this.getCurrentProfile();
		// Register to close obsidian
		this.registerEvent(this.app.workspace.on('quit', () => {
			// Sync profiles
			if (profile?.autoSync) {
				this.saveProfile(profile.name);
				saveProfileData(this.globalSettings.profilesList, this.vaultSettings.profilesPath);
			}
		}));

		// Display Settings Profile on Startup
		new Notice(`Current profile: ${profile?.name}`);

		// Add Command to Switch between profiles
		this.addCommand({
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				// Open new profile switcher modal to switch or create a new profile
				new ProfileSwitcherModal(this.app, this, async (result, state) => {
					switch (state) {
						case ProfileState.CURRENT:
							return;
						case ProfileState.NEW:
							// Create new Profile
							await this.createProfile(result);
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
		// Load vault settings from file if exist or create default
		this.vaultSettings = Object.assign({}, DEFAULT_VAULT_SETTINGS, await this.loadData());

		// Load global settings from profiles path
		this.globalSettings = DEFAULT_GLOBAL_SETTINGS;
		this.globalSettings.profilesList = loadProfileData(this.vaultSettings.profilesPath);

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
		// Save vault settings
		await this.saveData(this.vaultSettings);

		// Save profile data
		saveProfileData(this.globalSettings.profilesList, this.vaultSettings.profilesPath);

		// Save profile settings
		const profile = this.getCurrentProfile();
		if (profile?.autoSync) {
			await this.saveProfile(profile.name);
		}
	}

	/**
	 * Change the path to save the profiles
	 * @param path The target where to save the profiles
	 */
	async changeProfilePath(path: string) {
		try {
			// Copy profiles to new path
			copyFolderRecursiveSync([this.vaultSettings.profilesPath], [path]);
			// Remove old profiles path
			removeDirectoryRecursiveSync([this.vaultSettings.profilesPath]);

			this.vaultSettings.profilesPath = path;
			await this.saveSettings();
		} catch (e) {
			(e as Error).message = 'Failed to change profile path! ' + (e as Error).message;
			console.error(e);
		}
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
			new Notice('Allready current profile!');
			return;
		}

		// Enabel new Profile
		const newProfile = this.globalSettings.profilesList.find(profile => profile.name === profileName);
		if (newProfile) {
			this.vaultSettings.activeProfile = newProfile.name;
		}

		await this.loadProfile(profileName)
			.then(async () => {
				this.saveSettings()
					.then(() => {
						// Reload obsidian so changed settings can take effect
						// @ts-ignore
						this.app.commands.executeCommandById("app:reload");
					});
			})
			.catch((e) => {
				this.vaultSettings.activeProfile = previousProfile?.name;
				new Notice(`Failed to switch to ${profileName} profile!`);
				(e as Error).message = 'Failed to switch profile! ' + (e as Error).message;
				console.error(e);
			});
	}

	/**
	 * Create a new profile based on the current profile.
	 * @param profileName The name of the new profile
	 */
	async createProfile(profile: ProfileSetting) {
		// Check profile Exist
		if (this.globalSettings.profilesList.find(value => value.name === profile.name)) {
			new Notice('Failed to create profile! Already exist.')
			return;
		}

		// Add profile to profileList
		this.globalSettings.profilesList.push(profile);
		await this.saveSettings();

		// Enabel new Profile
		const selectedProfile = this.globalSettings.profilesList.find(value => value.name === profile.name);
		if (selectedProfile) {
			// Sync the profile settings
			this.saveProfile(selectedProfile.name);
		}
		else {
			new Notice(`Failed to create profile ${profile.name}!`);
			this.globalSettings.profilesList.pop();
		}

		// Save settings and reload settings tab 
		await this.saveSettings();
	}

	async editProfile(profileName: string, profileSettings: Partial<ProfileSetting>) {
		const profile = this.globalSettings.profilesList.find(value => value.name === profileName);
		// Check profile Exist
		if (!profile) {
			new Notice(`Failed to remove ${profileName} profile!`);
			return;
		}

		Object.keys(profileSettings).forEach(key => {
			const objKey = key as keyof ProfileSetting;

			if (objKey === 'name') {
				return;
			}

			const value = profileSettings[objKey];
			if (typeof value === 'boolean') {
				profile[objKey] = value;
			}
		});

		// Save settings and reload settings tab 
		await this.saveSettings();
	}

	/**
	 * Removes the profile and all its settings
	 * @param profileName The name of the profile
	 */
	async removeProfile(profileName: string) {
		try {
			const profile = this.globalSettings.profilesList.find(value => value.name === profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('No profile received!');
			}

			// Is profile to remove current profile
			if (this.isEnabled(profile)) {
				const otherProfile = this.globalSettings.profilesList.first();
				if (otherProfile) {
					this.switchProfile(otherProfile.name);
				}
			}

			// Remove to profile settings
			removeDirectoryRecursiveSync([this.vaultSettings.profilesPath, profileName]);
			this.globalSettings.profilesList.remove(profile);

			// Save settings and reload settings tab 
			await this.saveSettings();
		} catch (e) {
			new Notice(`Failed to remove ${profileName} profile!`);
			(e as Error).message = 'Failed to remove profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Save the profile settings
	 * @param profileName The name of the profile to load.
	 */
	async saveProfile(profileName: string) {
		// Check target dir exist
		try {
			ensurePathExist([this.vaultSettings.profilesPath, profileName]);

			// Check for modified files
			getConfigFilesList(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file]).map(value => value.split('\\').slice(-file.split('/').length));

					pathVariants.forEach(value => {
						copyFile([getVaultPath(), this.app.vault.configDir, ...value], [this.vaultSettings.profilesPath, profileName, ...value])
					})
				}
				else if (getVaultPath() !== "") {
					copyFile([getVaultPath(), this.app.vault.configDir, file], [this.vaultSettings.profilesPath, profileName, file])
				}
			});
		} catch (e) {
			new Notice(`Failed to save ${profileName} profile!`);
			(e as Error).message = 'Failed to save profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Load the profile settings
	 * @param profileName The name of the profile to load.
	 */
	async loadProfile(profileName: string) {
		// Check target dir exist
		try {
			ensurePathExist([this.vaultSettings.profilesPath, profileName]);

			// Check for modified files
			getConfigFilesList(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([this.vaultSettings.profilesPath, profileName, file]).map(value => value.split('\\').slice(-file.split('/').length));

					pathVariants.forEach(value => {
						copyFile([this.vaultSettings.profilesPath, profileName, ...value], [getVaultPath(), this.app.vault.configDir, ...value]);
					})
				}
				else if (getVaultPath() !== "") {
					copyFile([this.vaultSettings.profilesPath, profileName, file], [getVaultPath(), this.app.vault.configDir, file]);
				}
			});
		} catch (e) {
			new Notice(`Failed to load ${profileName} profile!`);
			(e as Error).message = 'Failed to load profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Gets the profile object
	 * @param name The name of the profile
	 * @returns The PerProfileSetting object. Or undefined if not found.
	 */
	getProfile(name: string): ProfileSetting | undefined {
		const profile = this.globalSettings.profilesList.find(profile => profile.name === name);
		if (!profile) {
			return;
		}
		return profile;
	}

	/**
	 * Gets the currently enabeled profile.
	 * @returns The PerProfileSetting object. Or undefined if not found.
	 */
	getCurrentProfile(): ProfileSetting | undefined {
		const name = this.vaultSettings.activeProfile;
		if (!name) {
			return;
		}
		return this.getProfile(name);
	}

	/**
	 * Checks the profile is currently enabled
	 * @param profile The profile to check 
	 * @returns boolean.
	 */
	isEnabled(profile: ProfileSetting): boolean {
		return this.vaultSettings.activeProfile === profile.name;
	}
}

