import { Notice } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/settings/SettingsTab";
import { ProfileSwitcherModal, ProfileState } from './modals/ProfileSwitcherModal';
import { copyFile, ensurePathExist, getAllFiles, getVaultPath, isValidPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_VAULT_SETTINGS, VaultSettings, ProfileOptions, GlobalSettings, DEFAULT_GLOBAL_SETTINGS } from './settings/SettingsInterface';
import { filterUnchangedFiles, getConfigFilesList, getIgnoreFilesList, loadProfileOptions, loadProfilesOptions, saveProfileOptions } from './util/SettingsFiles';
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

		// Register to close obsidian
		// this.registerEvent(this.app.workspace.on('quit', () => {
		// 	const profile = this.getCurrentProfile();
		// 	if (profile?.autoSync && profile.name) {
		// 		this.saveProfileSettings(profile)
		// 			.then((profile) => {
		// 				this.updateCurrentProfile(profile);
		// 			});
		// 	}
		// 	this.saveSettings();
		// }));

		// Update profiles at Intervall 
		this.registerInterval(window.setInterval(() => {
			this.update();
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
	 * Update status bar
	 */
	update() {
		this.globalSettings.profilesList = loadProfilesOptions(this.vaultSettings.profilesPath);
		let profile = this.globalSettings.profilesList.find(profile => profile.name === this.vaultSettings.activeProfile?.name);

		// Attach status bar item
		if (profile) {
			// Use modified at from vault settings
			if (this.vaultSettings.activeProfile?.modifiedAt) {
				profile.modifiedAt = this.vaultSettings.activeProfile?.modifiedAt;
			}

			let icon = 'alert-circle';
			let label = 'Settings profiles';

			if (this.isProfileSaved(profile)) {
				if (this.isProfileUpToDate(profile)) {
					// Profile is up-to-date and saved
					icon = 'user-check';
					label = 'Profile up-to-date';
				}
				else {
					// Profile is not up to date
					icon = 'user-x';
					label = 'Unloaded changes for this profile';
				}
			}
			else {
				// Profile is not saved
				icon = 'user-cog';
				label = 'Unsaved changes for this profile';
			}
			if (this.statusBarItem) {
				this.updateStatusBarItem(this.statusBarItem, icon, profile?.name, label);
			}
			else {
				this.statusBarItem = this.addStatusBarItem(icon, profile?.name, label, () => {
					try {
						const profile = this.getCurrentProfile();
						if (this.isProfileSaved(profile)) {
							if (this.isProfileUpToDate(profile)) {
								// Profile is up-to-date and saved
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
							else {
								// Profile is not up to date
								this.loadProfileSettings(profile)
									.then((profile) => {
										this.updateCurrentProfile(profile);
										// Reload obsidian so changed settings can take effect
										new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
											// Save Settings
											this.saveSettings().then(() => {
												// @ts-ignore
												this.app.commands.executeCommandById("app:reload");
											});
										}, () => { }, 'Reload')
											.open();
									});
							}
						}
						else {
							// Profile is not saved
							this.saveProfileSettings(profile)
								.then((profile) => {
									this.updateCurrentProfile(profile);
									this.saveSettings()
										.then(() => {
											new Notice('Saved profile successfully.');
										});
								});
						}
					} catch (e) {
						(e as Error).message = 'Failed to handle status bar callback! ' + (e as Error).message;
						console.error(e);
					}
				});
			}
		}
		else {
			if (this.statusBarItem) {
				this.removeStatusBarItem(this.statusBarItem);
			}
		}
	}

	/**
	 * Load plugin settings from file or default.
	 */
	private async loadSettings() {
		try {
			// Load vault settings from file if exist or create default
			this.vaultSettings = Object.assign({}, DEFAULT_VAULT_SETTINGS, await this.loadData());

			// Load global settings from profiles path
			this.globalSettings = DEFAULT_GLOBAL_SETTINGS;
			this.globalSettings.profilesList = loadProfilesOptions(this.getProfilesPath());
		} catch (e) {
			(e as Error).message = 'Failed to load settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Save plugin vault settings to file.
	 */
	async saveSettings() {
		try {
			// Save vault settings
			await this.saveData(this.vaultSettings);
		} catch (e) {
			(e as Error).message = 'Failed to save settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Load settings and data for the given profile
	 * @param profile The profile 
	 */
	async loadProfileSettings(profile: ProfileOptions) {
		try {
			// Load profile settings
			await this.loadProfile(profile.name);
			// Load profile data
			this.globalSettings.profilesList.forEach((value, index, array) => {
				if (value.name === profile.name) {
					array[index] = loadProfileOptions(profile, this.getProfilesPath()) || value;
				}
			});
			return this.getProfile(profile.name);
		} catch (e) {
			(e as Error).message = 'Failed to load profile settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Save settings and data for the given profile
	 * @param profile The profile 
	 */
	async saveProfileSettings(profile: ProfileOptions) {
		try {
			// Save profile settings
			await this.saveProfile(profile.name);
			// Save profile data
			saveProfileOptions(profile, this.getProfilesPath());

			this.globalSettings.profilesList = loadProfilesOptions(this.vaultSettings.profilesPath);

			return this.getProfile(profile.name);
		} catch (e) {
			(e as Error).message = 'Failed to save profile settings! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Switch to other profile with if settings
	 * @param profileName The name of the profile to switch to
	 */
	async switchProfile(profileName: string) {
		try {
			this.globalSettings.profilesList = loadProfilesOptions(this.vaultSettings.profilesPath);
			const currentProfile = this.globalSettings.profilesList.find(profile => profile.name === this.vaultSettings.activeProfile?.name);
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
			// if (currentProfile?.autoSync) {
			// 	await this.saveProfileSettings(currentProfile);
			// }

			// Load new profile
			await this.loadProfileSettings(targetProfile)
				.then((profile) => {
					this.updateCurrentProfile(profile);
				});

			// Open dialog obsidain should be reloaded
			new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
				// Save Settings
				this.saveSettings().then(() => {
					// @ts-ignore
					this.app.commands.executeCommandById("app:reload");
				});
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
	 * Create a new profile with the current settings 
	 * @param profile The profile options the profile should be created with
	 */
	async createProfile(profile: ProfileOptions) {
		try {
			// Check profile Exist
			if (this.globalSettings.profilesList.find(p => profile.name === p.name)) {
				throw Error('Profile does already exist!');
			}

			// Add profile to profileList
			this.globalSettings.profilesList.push(profile);

			// Enabel new Profile
			const selectedProfile = this.globalSettings.profilesList.find(value => value.name === profile.name);
			if (selectedProfile) {
				// Sync the profile settings
				this.saveProfileSettings(selectedProfile)
					.then(() => {
						this.globalSettings.profilesList = loadProfilesOptions(this.getProfilesPath());
					});
			}
			else {
				this.removeProfile(profile.name);
				new Notice(`Failed to create profile ${profile.name}!`);
			}
		} catch (e) {
			new Notice(`Failed to create ${profile.name} profile!`);
			(e as Error).message = 'Failed to create profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Edit the profile with the given profile name to be profileSettings
	 * @param profileName The profile name to edit
	 * @param profileSettings The new profile options
	 */
	async editProfile(profileName: string, profileSettings: ProfileOptions) {
		try {
			const profile = this.getProfile(profileName);

			let renamed = false;

			Object.keys(profileSettings).forEach(key => {
				const objKey = key as keyof ProfileOptions;

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
			if (renamed) {
				await this.createProfile(profileSettings);
				await this.switchProfile(profileSettings.name);
				await this.removeProfile(profileName);
			}
			else {
				// saveProfileData()
			}
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

			// Is profile to remove current profile
			if (this.isEnabled(profile)) {
				this.updateCurrentProfile(undefined);
			}

			// Remove to profile settings
			removeDirectoryRecursiveSync([this.getProfilesPath(), profileName]);
			this.globalSettings.profilesList = loadProfilesOptions(this.getProfilesPath());
		} catch (e) {
			new Notice(`Failed to remove ${profileName} profile!`);
			(e as Error).message = 'Failed to remove profile! ' + (e as Error).message;
			console.error(e);
		}
	}

	/**
	 * Save the profile settings
	 * @param profileName The name of the profile to load.
	 * @todo Update profile data/settings only when changed 
	 */
	private async saveProfile(profileName: string) {
		try {
			let profile = this.getProfile(profileName);

			const sourcePath = [getVaultPath(), this.app.vault.configDir];
			const targetPath = [this.getProfilesPath(), profileName];
			let changed = false;

			// Check target dir exist
			ensurePathExist([...targetPath]);

			// Get ignore files
			let ignoreFiles: string[][] = [];
			getIgnoreFilesList(profile).forEach(ignore => {
				if ((ignore.includes("/*/") || ignore.includes("/*")) && getVaultPath() !== "") {
					const files = getAllFiles([...sourcePath, ignore]).map(value => value.split('\\').slice(-ignore.split('/').length))
					files.forEach(file => {
						ignoreFiles.push(file)
					})
				}
				else if (getVaultPath() !== "") {
					ignoreFiles.push([ignore]);
				}
			});

			// Update files
			filterUnchangedFiles(getConfigFilesList(profile), sourcePath, targetPath).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([...sourcePath, file])
						// Trim the start of path
						.map(value => value.split('\\').slice(-file.split('/').length))
						// Filter ignore files
						.filter((value) => {
							return existsSync(join(...sourcePath, ...value)) && !ignoreFiles.some((ignore) => {
								return ignore.every((element, index) => element === value[index])
							});
						});

					pathVariants.forEach(value => {
						console.log('save', value);
						changed = true;
						copyFile([...sourcePath, ...value], [...targetPath, ...value])
					})
				}
				else if (getVaultPath() !== "") {
					if (existsSync(join(...sourcePath, file)) && !ignoreFiles.some((ignore) => {
						return ignore.every((element, index) => element === file[index])
					})) {
						console.log('save', file);
						changed = true;
						copyFile([...sourcePath, file], [...targetPath, file])
					}
				}
			});

			// Update profile data 	
			if (changed) {
				profile.modifiedAt = new Date();
			}
			if (this.isEnabled(profile)) {
				this.updateCurrentProfile(profile);
			}
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
	private async loadProfile(profileName: string) {
		try {
			const profile = this.getProfile(profileName);

			const sourcePath = [this.getProfilesPath(), profileName];
			const targetPath = [getVaultPath(), this.app.vault.configDir];

			// Check target dir exist
			if (!existsSync(join(...sourcePath))) {
				throw Error('Source path do not exist!');
			}

			// Get ignore files
			let ignoreFiles: string[][] = [];
			getIgnoreFilesList(profile).forEach(ignore => {
				if ((ignore.includes("/*/") || ignore.includes("/*")) && getVaultPath() !== "") {
					const files = getAllFiles([...sourcePath, ignore]).map(value => value.split('\\').slice(-ignore.split('/').length))
					files.forEach(file => {
						ignoreFiles.push(file)
					})
				}
				else if (getVaultPath() !== "") {
					ignoreFiles.push([ignore]);
				}
			});

			// Load files
			filterUnchangedFiles(getConfigFilesList(profile), sourcePath, targetPath).forEach(file => {
				if ((file.includes("/*/") || file.includes("/*")) && getVaultPath() !== "") {
					const pathVariants = getAllFiles([...sourcePath, file])
						// Trim the start of path
						.map(value => value.split('\\').slice(-file.split('/').length))
						// Filter ignore files
						.filter((value) => {
							return existsSync(join(...sourcePath, ...value)) && !ignoreFiles.some((ignore) => {
								return ignore.every((element, index) => element === value[index])
							});
						});

					pathVariants.forEach(value => {
						console.log('load', value);
						copyFile([...sourcePath, ...value], [...targetPath, ...value]);
					})
				}
				else if (getVaultPath() !== "") {
					if (existsSync(join(...sourcePath, file)) && !ignoreFiles.some((ignore) => {
						return ignore.every((element, index) => element === file[index]);
					})) {
						console.log('load', file);
						copyFile([...sourcePath, file], [...targetPath, file]);
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
	 * @returns The ProfileSetting object. Or undefined if not found.
	 */
	getProfile(name: string): ProfileOptions {
		const profile = this.globalSettings.profilesList.find(profile => profile.name === name);
		if (!profile) {
			throw Error('Profile does not exist!');
		}
		return profile;
	}

	/**
	 * Gets the currently enabeled profile.
	 * @returns The ProfileSetting object. Or undefined if not found.
	 */
	getCurrentProfile(): ProfileOptions {
		const name = this.vaultSettings.activeProfile?.name;
		if (!name) {
			throw Error('No current profile');
		}
		let profile = this.getProfile(name);

		// Use modified at from vault settings
		if (this.vaultSettings.activeProfile?.modifiedAt) {
			profile.modifiedAt = this.vaultSettings.activeProfile?.modifiedAt;
		}
		return profile;
	}

	/**
	 * Updates the current profile to passed profile
	 * @param profile The profile to update to 
	 */
	updateCurrentProfile(profile: ProfileOptions | undefined) {
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
	isEnabled(profile: ProfileOptions): boolean {
		return this.vaultSettings.activeProfile?.name === profile.name;
	}

	/**
	 * Checks the profile is up to date to the saved profile
	 * @param profile The profile to check 
	 * @returns Is loaded profile newer/equal than saved profile
	 */
	isProfileUpToDate(profile: ProfileOptions): boolean {
		const list = loadProfilesOptions(this.getProfilesPath());
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
	isProfileSaved(profile: ProfileOptions): boolean {
		const list = loadProfilesOptions(this.getProfilesPath());
		const profileData = list.find((value, index, obj) => value.name === profile.name)

		if (!profileData || !profileData.modifiedAt) {
			return false;
		}

		const profileDataDate = new Date(profileData.modifiedAt);
		const profileDate = new Date(profile.modifiedAt);

		return profileDate.getTime() <= profileDataDate.getTime();
	}
}

