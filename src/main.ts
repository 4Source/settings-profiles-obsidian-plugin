import { Notice, Plugin } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/Settings";
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { copyFile, copyFolderRecursiveSync, ensurePathExist, getAllFiles, getVaultPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_SETTINGS, PER_PROFILE_SETTINGS_MAP, Settings, PerProfileSetting } from './interface';

export default class SettingsProfilesPlugin extends Plugin {
	settings: Settings;
	settingsTab: SettingsProfilesSettingTab;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		try {
			ensurePathExist([this.settings.profilesPath]);
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
		// Load settings from file if exist or create default
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
		try {
			// Copy profiles to new path
			copyFolderRecursiveSync([this.settings.profilesPath], [path]);
			// Remove old profiles path
			removeDirectoryRecursiveSync([this.settings.profilesPath]);

			this.settings.profilesPath = path;
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
		const newProfile = this.settings.profilesList.find(profile => profile.name === profileName);
		if (newProfile) {
			this.settings.activeProfile = newProfile.name;
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
				this.settings.activeProfile = previousProfile?.name;
				new Notice(`Failed to switch to ${profileName} profile!`);
				(e as Error).message = 'Failed to switch profile! ' + (e as Error).message;
				console.error(e);
			});
	}

	/**
	 * Create a new profile based on the current profile.
	 * @param profileName The name of the new profile
	 */
	async createProfile(profile: PerProfileSetting) {
		// Check profile Exist
		if (this.settings.profilesList.find(value => value.name === profile.name)) {
			new Notice('Failed to create profile! Already exist.')
			return;
		}

		// Add profile to profileList
		this.settings.profilesList.push(profile);
		await this.saveSettings();

		// Enabel new Profile
		const selectedProfile = this.settings.profilesList.find(value => value.name === profile.name);
		if (selectedProfile) {
			// Sync the profile settings
			this.saveProfile(selectedProfile.name);
		}
		else {
			new Notice(`Failed to create profile ${profile.name}!`);
			this.settings.profilesList.pop();
		}

		// Save settings and reload settings tab 
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
			const profile = this.settings.profilesList.find(value => value.name === profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('No profile received!');
			}

			// Is profile to remove current profile
			if (this.isEnabled(profile)) {
				const otherProfile = this.settings.profilesList.first();
				if (otherProfile) {
					this.switchProfile(otherProfile.name);
				}
			}

			// Remove to profile settings
			removeDirectoryRecursiveSync([this.settings.profilesPath, profileName]);
			this.settings.profilesList.remove(profile);

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
			ensurePathExist([this.settings.profilesPath, profileName]);

			// Check for modified files
			this.getAllConfigFiles(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file]).map(value => value.split('\\').slice(-file.split('/').length));

					pathVariants.forEach(value => {
						copyFile([getVaultPath(), this.app.vault.configDir, ...value], [this.settings.profilesPath, profileName, ...value])
					})
				}
				else if (getVaultPath() !== "") {
					copyFile([getVaultPath(), this.app.vault.configDir, file], [this.settings.profilesPath, profileName, file])
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
			ensurePathExist([this.settings.profilesPath, profileName]);

			// Check for modified files
			this.getAllConfigFiles(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([this.settings.profilesPath, profileName, file]).map(value => value.split('\\').slice(-file.split('/').length));

					pathVariants.forEach(value => {
						copyFile([this.settings.profilesPath, profileName, ...value], [getVaultPath(), this.app.vault.configDir, ...value]);
					})
				}
				else if (getVaultPath() !== "") {
					copyFile([this.settings.profilesPath, profileName, file], [getVaultPath(), this.app.vault.configDir, file]);
				}
			});
		} catch (e) {
			new Notice(`Failed to load ${profileName} profile!`);
			(e as Error).message = 'Failed to load profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Returns all settings if they are enabeled in profile
	 * @param [profile=Current profile] The profile for which the files will be returned
	 * @returns an array of file names
	 * @todo return {add: string[], remove: string[]}
	 */
	getAllConfigFiles(profile = this.getCurrentProfile()): string[] {
		const files = [];
		for (const key in profile) {
			if (profile.hasOwnProperty(key)) {
				const value = profile[key as keyof PerProfileSetting];
				if (typeof value === 'boolean' && key !== 'enabled' && value) {
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

		return files;
	}

	/**
	 * Gets the profile object
	 * @param name The name of the profile
	 * @returns The PerProfileSetting object. Or undefined if not found.
	 */
	getProfile(name: string): PerProfileSetting | undefined {
		const profile = this.settings.profilesList.find(profile => profile.name === name);
		if (!profile) {
			return;
		}
		return profile;
	}

	/**
	 * Gets the currently enabeled profile.
	 * @returns The PerProfileSetting object. Or undefined if not found.
	 */
	getCurrentProfile(): PerProfileSetting | undefined {
		const name = this.settings.activeProfile;
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
	isEnabled(profile: PerProfileSetting): boolean {
		return this.settings.activeProfile === profile.name;
	}
}

