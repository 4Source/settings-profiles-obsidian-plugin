import { Notice } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/settings/SettingsTab";
import { ProfileSwitcherModal, ProfileState } from './modals/ProfileSwitcherModal';
import { copyFile, ensurePathExist, getAllFiles, getVaultPath, isValidPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_VAULT_SETTINGS, VaultSettings, ProfileSetting, GlobalSettings, DEFAULT_GLOBAL_SETTINGS } from './settings/SettingsInterface';
import { getConfigFilesList, getIgnoreFilesList, loadProfileData, saveProfileData } from './util/SettingsFiles';
import { isAbsolute, join } from 'path';
import { existsSync } from 'fs';
import { DialogModal } from './modals/DialogModal';
import PluginExtended from './core/PluginExtended';

export default class SettingsProfilesPlugin extends PluginExtended {
	vaultSettings: VaultSettings;
	globalSettings: GlobalSettings;
	settingsTab: SettingsProfilesSettingTab;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		try {
			ensurePathExist([this.getProfilesPath()]);
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
			this.saveSettings();
		}));

		// Attach status bar item
		if (profile) {
			let icon = 'alert-circle';
			let label = 'Settings profiles';

			if (this.isProfileSaved(profile)) {
				if (this.isProfileUpToDate(profile)) {
					// Profile is up-to-date and saved
					icon = 'user-check';
					label = 'Profile up-to-date'
				}
				else {
					// Profile is not up to date
					icon = 'user-x';
					label = 'Unloaded changes for this profile'
				}
			}
			else {
				// Profile is not saved
				icon = 'user-cog';
				label = 'Unsaved changes for this profile'
			}

			this.statusBarItem = this.addStatusBarItem(icon, profile?.name, label);
		}

		// Update non time critical UI at Intervall 
		this.registerInterval(window.setInterval(() => {
			this.updateUI();
		}, 1000));

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
	 * Update non time critical UI at Intervall
	 */
	updateUI() {
		const profile = this.getCurrentProfile();

		// Attach status bar item
		if (profile) {
			let icon = 'alert-circle';
			let label = 'Settings profiles';

			if (this.isProfileSaved(profile)) {
				if (this.isProfileUpToDate(profile)) {
					// Profile is up-to-date and saved
					icon = 'user-check';
					label = 'Profile up-to-date'
				}
				else {
					// Profile is not up to date
					icon = 'user-x';
					label = 'Unloaded changes for this profile'
				}
			}
			else {
				// Profile is not saved
				icon = 'user-cog';
				label = 'Unsaved changes for this profile'
			}

			this.updateStatusBarItem(this.statusBarItem, icon, profile?.name, label);
		}
	}

	/**
	 * Load Plugin Settings from file or default.
	 * Sync Profiles if enabeled.
	 */
	async loadSettings() {
		try {
			// Load vault settings from file if exist or create default
			this.vaultSettings = Object.assign({}, DEFAULT_VAULT_SETTINGS, await this.loadData());

			// Load global settings from profiles path
			this.globalSettings = DEFAULT_GLOBAL_SETTINGS;
			this.globalSettings.profilesList = loadProfileData(this.getProfilesPath());

			// Sync Profiles
			const profile = this.getCurrentProfile();
			// Load settings from profile
			if (profile?.autoSync && profile.name) {
				this.loadProfile(profile.name);
			}
		} catch (e) {
			(e as Error).message = 'Failed to load Settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Save Plugin Settings to file.
	 * Sync Profiles if enabeled.
	 */
	async saveSettings() {
		try {
			// Save vault settings
			await this.saveData(this.vaultSettings);

			// Auto Sync
			const profile = this.getCurrentProfile();
			if (profile?.autoSync && profile.name) {
				// Save profile data
				saveProfileData(this.globalSettings.profilesList, this.getProfilesPath());

				// Save profile settings
				await this.saveProfile(profile.name);
			}
		} catch (e) {
			(e as Error).message = 'Failed to save Settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Switch to other Settings Profile.
	 * @param profileName The name of the profile to switch to
	 */
	async switchProfile(profileName: string) {
		try {
			const currentProfile = this.getCurrentProfile();
			const targetProfile = this.getProfile(profileName);

			// Is target profile existing
			if (!targetProfile || !targetProfile.name) {
				throw Error('Target profile does not exist!');
			}

			// Check is current profile
			if (currentProfile?.name === targetProfile.name) {
				new Notice('Allready current profile!');
				return;
			}

			// Save current profile 
			if (currentProfile?.name) {
				await this.saveProfile(currentProfile.name)
			}
			else {
				console.info('No current profile.');
			}

			// Load new profile
			await this.loadProfile(targetProfile.name);

			// Open dialog obsidain should be reloaded
			new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', async () => {
			// Save Settings
			await this.saveSettings();
				// @ts-ignore
				this.app.commands.executeCommandById("app:reload");
			}, () => { 
				this.settingsTab.display();
			}, 'Reload')
				.open();
		} catch (e) {
			this.updateCurrentProfile(undefined);
			new Notice(`Failed to switch to ${profileName} profile!`);
			(e as Error).message = 'Failed to switch profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Create a new profile based on the current profile.
	 * @param profileName The name of the new profile
	 */
	async createProfile(profile: ProfileSetting) {
		try {
			// Check profile Exist
			if (this.getProfile(profile.name)) {
				throw Error('Profile does already exist!');
			}

			// Add profile to profileList
			this.globalSettings.profilesList.push(profile);

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
		} catch (e) {
			new Notice(`Failed to create ${profile.name} profile!`);
			(e as Error).message = 'Failed to create profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	async editProfile(profileName: string, profileSettings: ProfileSetting) {
		try {
			const profile = this.getProfile(profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('Profile does not exist!');
			}

			let renamed = false;

			Object.keys(profileSettings).forEach(key => {
				const objKey = key as keyof ProfileSetting;

				// Name changed
				if (objKey === 'name' && profileSettings.name !== profileName) {
					renamed = true;
				}

				// Values changed
				const value = profileSettings[objKey];
				if (typeof value === 'boolean') {
					(profile[objKey] as boolean) = value;
				}
			});

			// Profile renamed
			if (renamed && profileSettings.name) {
				this.createProfile(profileSettings);
				this.removeProfile(profileName);
			}

			// Save settings and reload settings tab 
			await this.saveSettings();

		} catch (e) {
			new Notice(`Failed to edit ${profileName} profile!`);
			(e as Error).message = 'Failed to edit profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Removes the profile and all its settings
	 * @param profileName The name of the profile
	 */
	async removeProfile(profileName: string) {
		try {
			const profile = this.getProfile(profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('Profile does not exist!');
			}

			// Is profile to remove current profile
			if (this.isEnabled(profile)) {
				const otherProfile = this.globalSettings.profilesList.first();
				if (otherProfile) {
					this.switchProfile(otherProfile.name);
				}
			}

			// Remove to profile settings
			removeDirectoryRecursiveSync([this.getProfilesPath(), profileName]);
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
		try {
			let profile = this.getProfile(profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('Profile does not exist!');
			}
			// Check target dir exist
			ensurePathExist([this.getProfilesPath(), profileName]);

			// Get ignore files
			let ignoreFiles: string[][] = [];
			getIgnoreFilesList(this.getProfile(profileName)).forEach(ignore => {
				if ((ignore.includes("/*/") || ignore.includes("/*")) && getVaultPath() !== "") {
					const files = getAllFiles([getVaultPath(), this.app.vault.configDir, ignore]).map(value => value.split('\\').slice(-ignore.split('/').length))
					files.forEach(file => {
						ignoreFiles.push(file)
					})
				}
				else if (getVaultPath() !== "") {
					ignoreFiles.push([ignore]);
				}
			});

			// Update files
			getConfigFilesList(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([getVaultPath(), this.app.vault.configDir, file])
						// Trim the start of path
						.map(value => value.split('\\').slice(-file.split('/').length))
						// Filter ignore files
						.filter((value) => {
							return existsSync(join(getVaultPath(), this.app.vault.configDir, ...value)) && !ignoreFiles.some((ignore) => {
								return ignore.every((element, index) => element === value[index])
							});
						});

					pathVariants.forEach(value => {
						copyFile([getVaultPath(), this.app.vault.configDir, ...value], [this.getProfilesPath(), profileName, ...value])
					})
				}
				else if (getVaultPath() !== "") {
					if (existsSync(join(getVaultPath(), this.app.vault.configDir, file)) && !ignoreFiles.some((ignore) => {
						return ignore.every((element, index) => element === file[index])
					})) {
						copyFile([getVaultPath(), this.app.vault.configDir, file], [this.getProfilesPath(), profileName, file])
					}
				}
			});

			// Update profile data
			profile.modifiedAt = new Date();
			this.updateCurrentProfile(profile);
		}
		catch (e) {
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
		try {
			const profile = this.getProfile(profileName);
			// Check profile Exist
			if (!profile) {
				throw Error('Profile does not exist!');
			}
			// Check target dir exist
			ensurePathExist([this.getProfilesPath(), profileName]);

			// Get ignore files
			let ignoreFiles: string[][] = [];
			getIgnoreFilesList(this.getProfile(profileName)).forEach(ignore => {
				if ((ignore.includes("/*/") || ignore.includes("/*")) && getVaultPath() !== "") {
					const files = getAllFiles([this.getProfilesPath(), profileName, ignore]).map(value => value.split('\\').slice(-ignore.split('/').length))
					files.forEach(file => {
						ignoreFiles.push(file)
					})
				}
				else if (getVaultPath() !== "") {
					ignoreFiles.push([ignore]);
				}
			});

			// Load files
			getConfigFilesList(this.getProfile(profileName)).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([this.getProfilesPath(), profileName, file])
						// Trim the start of path
						.map(value => value.split('\\').slice(-file.split('/').length))
						// Filter ignore files
						.filter((value) => {
							return existsSync(join(this.getProfilesPath(), profileName, ...value)) && !ignoreFiles.some((ignore) => {
								return ignore.every((element, index) => element === value[index])
							});
						});

					pathVariants.forEach(value => {
						copyFile([this.getProfilesPath(), profileName, ...value], [getVaultPath(), this.app.vault.configDir, ...value]);
					})
				}
				else if (getVaultPath() !== "") {
					if (existsSync(join(this.getProfilesPath(), profileName, file)) && !ignoreFiles.some((ignore) => {
						return ignore.every((element, index) => element === file[index]);
					})) {
						copyFile([this.getProfilesPath(), profileName, file], [getVaultPath(), this.app.vault.configDir, file]);
					}
				}
			});

			// Change active profile
			this.updateCurrentProfile(profile);
		} catch (e) {
			new Notice(`Failed to load ${profileName} profile!`);
			(e as Error).message = 'Failed to load profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Returns an absolut path to profiles. Recommendet to use this function instead of directly access settings.
	 */
	getProfilesPath(): string {
		let path = this.vaultSettings.profilesPath;

		if (!isAbsolute(path)) {
			path = join(getVaultPath(), path);
		}

		if (!isValidPath([path])) {
			throw Error('No valid profiles path could be found!');
		}
		return path;
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
		const name = this.vaultSettings.activeProfile?.name;
		if (!name) {
			return;
		}
		let profile = this.getProfile(name);
		if (!profile) {
			return;
		}

		if (this.vaultSettings.activeProfile?.modifiedAt) {
			profile.modifiedAt = this.vaultSettings.activeProfile?.modifiedAt;
		}
		return profile;
	}

	/**
	 * Updates the current profile to passed profile
	 * @param profile The profile to update to 
	 */
	updateCurrentProfile(profile: ProfileSetting | undefined) {
		if (!profile) {
			this.vaultSettings.activeProfile = {};
			return;
		}
		this.vaultSettings.activeProfile = { name: profile.name, modifiedAt: profile.modifiedAt };
	}

	/**
	 * Checks the profile is currently enabled
	 * @param profile The profile to check 
	 * @returns Is enabled profile
	 */
	isEnabled(profile: ProfileSetting): boolean {
		return this.vaultSettings.activeProfile?.name === profile.name;
	}

	/**
	 * Checks the profile is up to date to the saved profile
	 * @param profile The profile to check 
	 * @returns Is loaded profile newer/equal than saved profile
	 */
	isProfileUpToDate(profile: ProfileSetting): boolean {
		const list = loadProfileData(this.vaultSettings.profilesPath);
		const profileData = list.find((value) => value.name === profile.name);

		if (!profileData || !profileData.modifiedAt) {
			return false;
		}

		const profileDataDate = new Date(profileData.modifiedAt);
		const profileDate = new Date(profile.modifiedAt);

		return profileDate.getTime() >= profileDataDate.getTime();
	}

	/**
	 * Check the profile settings are saved 
	 * @param profile The profile to check 
	 * @returns Is saved profile newer/equal than saved profile
	 */
	isProfileSaved(profile: ProfileSetting): boolean {
		const list = loadProfileData(this.vaultSettings.profilesPath);
		const profileData = list.find((value, index, obj) => value.name === profile.name)

		if (!profileData || !profileData.modifiedAt) {
			return false;
		}

		const profileDataDate = new Date(profileData.modifiedAt);
		const profileDate = new Date(profile.modifiedAt);

		return profileDate.getTime() <= profileDataDate.getTime();
	}
}

