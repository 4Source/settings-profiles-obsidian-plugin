import { Notice, debounce } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/settings/SettingsTab";
import { ProfileSwitcherModal } from './modals/ProfileSwitcherModal';
import { copyFile, ensurePathExist, getVaultPath, isValidPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_VAULT_SETTINGS, VaultSettings, ProfileOptions, GlobalSettings, DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROFILE_OPTIONS, DEFAULT_PROFILE_PATH, StatusbarClickAction } from './settings/SettingsInterface';
import { containsChangedFiles, filterChangedFiles, filterIgnoreFilesList, getConfigFilesList, getFilesWithoutPlaceholder, getIgnoreFilesList, loadProfileOptions, loadProfilesOptions, saveProfileOptions } from './util/SettingsFiles';
import { isAbsolute, join, normalize } from 'path';
import { FSWatcher, existsSync, watch } from 'fs';
import { DialogModal } from './modals/DialogModal';
import PluginExtended from './core/PluginExtended';
import { ICON_CURRENT_PROFILE, ICON_NO_CURRENT_PROFILE, ICON_UNLOADED_PROFILE, ICON_UNSAVED_PROFILE } from './constants';
import { machineIdSync } from 'node-machine-id';


export default class SettingsProfilesPlugin extends PluginExtended {
	private vaultSettings: VaultSettings;
	private globalSettings: GlobalSettings;
	private statusBarItem: HTMLElement;
	private settingsListener: FSWatcher;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));

		// Add settings change listener
		/**@todo watch didn't support recursive on Linux */
		if (this.getProfileUpdate()) {
			this.settingsListener = watch(join(getVaultPath(), this.app.vault.configDir), { recursive: true }, debounce((eventType, filename) => {
				if (eventType !== 'change' || !filename) return;

				const profile = this.getCurrentProfile();
				if (profile) {
					if (profile.autoSync) {
						this.updateProfile();
					}
					else if (!getIgnoreFilesList(profile).contains(filename)) {
						profile.modifiedAt = new Date();
						this.updateCurrentProfile(profile);
					}
				}
			}, this.getProfileUpdateDelay(), true));
		}

		// Update UI at Interval 
		if (this.getUiUpdate()) {
			this.registerInterval(window.setInterval(() => {
				this.updateUI();
			}, this.getUiRefreshInterval()));
		}

		// Command to Switch between profiles
		this.addCommand({
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				// Open new profile switcher modal to switch or create a new profile
				new ProfileSwitcherModal(this.app, this).open();
			}
		});

		// Command to Show current profile
		this.addCommand({
			id: "current-profile",
			name: "Show current profile",
			callback: () => {
				new Notice(`Current profile: ${this.getCurrentProfile()?.name}`);
			}
		});

		// Command to save current profile
		this.addCommand({
			id: "save-current-profile",
			name: "Save current profile",
			callback: () => {
				this.refreshProfilesList();
				const profile = this.getCurrentProfile();
				if (profile) {
					this.saveProfileSettings(profile)
						.then(() => {
							new Notice('Saved profile successfully.');
						})
						.catch((e) => {
							new Notice('Failed to save profile!');
							(e as Error).message = `Failed to handle command! CommandId: save-current-profile Profile: ${profile}` + (e as Error).message;
							console.error(e);
						})
				}
			}
		});

		// Command to load current profile
		this.addCommand({
			id: "load-current-profile",
			name: "Reload current profile",
			callback: () => {
				this.refreshProfilesList();
				const profile = this.getCurrentProfile();
				if (profile) {
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
							}, () => {
								this.saveSettings();
								new Notice('Need to reload obsidian!', 5000);
							}, 'Reload')
								.open();
						});

				}
			}
		});

		// Command to update profile status 
		if (this.getUiUpdate()) {
			this.addCommand({
				id: "update-profile-status",
				name: "Update profile status",
				callback: () => {
					this.updateUI();
				}
			});
		}
	}

	onunload() {
		if (this.settingsListener) {
			this.settingsListener.close();
		}
	}

	/**
	 * Update profile save state
	 */
	updateProfile() {
		this.refreshProfilesList();
		const profile = this.getCurrentProfile();

		if (profile) {
			if (!this.areSettingsSaved(profile)) {
				// Save settings to profile
				if (profile.autoSync) {
					this.saveProfileSettings(profile);
				}
			}
		}
	}

	/**
	 * Update status bar
	 */
	updateUI() {
		let profile = this.getCurrentProfile();

		let icon = ICON_NO_CURRENT_PROFILE;
		let label = 'Switch profile';

		// Attach status bar item
		try {
			if (profile) {
				if (this.isProfileSaved(profile)) {
					if (this.isProfileUpToDate(profile)) {
						// Profile is up-to-date and saved
						icon = ICON_CURRENT_PROFILE;
						label = 'Profile up-to-date';
					}
					else {
						// Profile is not up to date
						icon = ICON_UNSAVED_PROFILE;
						label = 'Unloaded changes for this profile';
					}
				}
				else {
					// Profile is not saved
					icon = ICON_UNLOADED_PROFILE;
					label = 'Unsaved changes for this profile';
				}
			}
		} catch (e) {
			(e as Error).message = 'Failed to check profile state! ' + (e as Error).message;
			console.error(e);
			this.updateCurrentProfile(undefined);
		}

		// Update status bar
		if (this.statusBarItem) {
			this.updateStatusBarItem(this.statusBarItem, icon, profile?.name, label);
		}
		else {
			this.statusBarItem = this.addStatusBarItem(icon, profile?.name, label, (ev: MouseEvent) => {
				try {
					const loadCallback = (profile: ProfileOptions) => {
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
								}, () => {
									this.saveSettings();
									new Notice('Need to reload obsidian!', 5000);
								}, 'Reload')
									.open();
							});
					};
					const saveCallback = (profile: ProfileOptions) => {
						this.saveProfileSettings(profile)
							.then(() => {
								new Notice('Saved profile successfully.');
							});
					};

					const profile = this.getCurrentProfile();

					const click_action = this.getStatusbarInteraction();
					const ctrl_action = this.getStatusbarInteraction('ctrl');
					const shift_action = this.getStatusbarInteraction('shift');
					const alt_action = this.getStatusbarInteraction('alt');

					const modifiers = [ev.ctrlKey, ev.shiftKey, ev.altKey].filter(Boolean).length;
					if (modifiers > 1) {
						throw Error('Can not handle more than one modifier key!');
					}
					else if ((modifiers === 0 && click_action == 'auto') || (ev.ctrlKey && ctrl_action == 'auto') || (ev.shiftKey && shift_action == 'auto') || (ev.altKey && alt_action == 'auto')) {
						if (!profile || this.isProfileSaved(profile)) {
							if (!profile || this.isProfileUpToDate(profile)) {
								// Profile is up-to-date and saved
								new ProfileSwitcherModal(this.app, this).open();
							}
							else {
								// Profile is not up to date
								loadCallback(profile);
							}
						}
						else {
							// Profile is not saved
							saveCallback(profile);
						}
					}
					else if ((modifiers === 0 && click_action == 'switch') || (ev.ctrlKey && ctrl_action == 'switch') || (ev.shiftKey && shift_action == 'switch') || (ev.altKey && alt_action == 'switch')) {
						new ProfileSwitcherModal(this.app, this).open();
					}
					else if ((modifiers === 0 && click_action == 'none') || (ev.ctrlKey && ctrl_action == 'none') || (ev.shiftKey && shift_action == 'none') || (ev.altKey && alt_action == 'none')) {
						new Notice(`This setting is disabled! Go to 'Settings profiles>Statusbar Interaction' to change this.`, 3000);
						return;
					}
					else if (!profile) {
						throw Error('No current profile! But is required for save or load.');
					}
					else if ((modifiers === 0 && click_action == 'load') || (ev.ctrlKey && ctrl_action == 'load') || (ev.shiftKey && shift_action == 'load') || (ev.altKey && alt_action == 'load')) {
						loadCallback(profile);
					}
					else if ((modifiers === 0 && click_action == 'save') || (ev.ctrlKey && ctrl_action == 'save') || (ev.shiftKey && shift_action == 'save') || (ev.altKey && alt_action == 'save')) {
						saveCallback(profile);
					}
					else {
						throw Error('Unknown Configuration!');
					}
				} catch (e) {
					(e as Error).message = 'Failed to handle status bar callback! ' + (e as Error).message;
					console.error(e);
					new Notice('Something went wrong check console for more information!');
				}
			});
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
			this.refreshProfilesList();
		} catch (e) {
			(e as Error).message = 'Failed to load settings! ' + (e as Error).message + ` VaultSettings: ${JSON.stringify(this.vaultSettings)} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Save plugin vault settings to file.
	 */
	async saveSettings() {
		try {
			// Remove Legacy Settings
			for (const key in this.vaultSettings) {
				if (!DEFAULT_VAULT_SETTINGS.hasOwnProperty(key)) {
					delete this.vaultSettings[key as keyof VaultSettings]
				}
			}

			// Save vault settings
			await this.saveData(this.vaultSettings);
		} catch (e) {
			(e as Error).message = 'Failed to save settings! ' + (e as Error).message + ` VaultSettings: ${JSON.stringify(this.vaultSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Check relevant files for profile are changed
	 * @param profile The profile to check
	 * @returns `ture` if at least one file has changed and is newer than the saved profile
	 */
	areSettingsChanged(profile: ProfileOptions): boolean {
		try {
			const sourcePath = [getVaultPath(), this.app.vault.configDir];
			const targetPath = [this.getAbsolutProfilesPath(), profile.name];

			// Check target dir exist
			if (!existsSync(join(...sourcePath))) {
				throw Error(`Source path do not exist! SourcePath: ${join(...sourcePath)}`);
			}

			// Target does not exist 
			if (!existsSync(join(...targetPath))) {
				return true;
			}

			let filesList = getConfigFilesList(profile);
			filesList = getFilesWithoutPlaceholder(filesList, sourcePath);
			filesList = filterIgnoreFilesList(filesList, profile);
			return containsChangedFiles(filesList, targetPath, sourcePath);
		} catch (e) {
			(e as Error).message = 'Failed to check settings changed! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)}`;
			console.error(e);
			return true;
		}
	}

	/**
	 * Check relevant files for profile are saved
	 * @param profile The profile to check
	 * @returns `ture` if at no file has changed or all are older than the saved profile
	 */
	areSettingsSaved(profile: ProfileOptions): boolean {
		try {
			const sourcePath = [getVaultPath(), this.app.vault.configDir];
			const targetPath = [this.getAbsolutProfilesPath(), profile.name];

			// Check target dir exist
			if (!existsSync(join(...sourcePath))) {
				throw Error(`Source path do not exist! SourcePath: ${join(...sourcePath)}`);
			}

			// Target does not exist 
			if (!existsSync(join(...targetPath))) {
				return false;
			}

			let filesList = getConfigFilesList(profile);
			filesList = getFilesWithoutPlaceholder(filesList, sourcePath);
			filesList = filterIgnoreFilesList(filesList, profile);
			return !containsChangedFiles(filesList, sourcePath, targetPath);
		} catch (e) {
			(e as Error).message = 'Failed to check settings changed! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)}`;
			console.error(e);
			return false;
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
			this.getProfilesList().forEach((value, index, array) => {
				if (value.name === profile.name) {
					array[index] = loadProfileOptions(profile, this.getAbsolutProfilesPath()) || value;
				}
			});
			return this.getProfile(profile.name);
		} catch (e) {
			(e as Error).message = 'Failed to load profile settings! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
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
			await saveProfileOptions(profile, this.getAbsolutProfilesPath())
			// Reload profiles list from files
			this.refreshProfilesList();

			return this.getProfile(profile.name);
		} catch (e) {
			(e as Error).message = 'Failed to save profile settings! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Switch to other profile with if settings
	 * @param profileName The name of the profile to switch to
	 */
	async switchProfile(profileName: string) {
		try {
			this.refreshProfilesList();
			const currentProfile = this.getCurrentProfile();

			// Deselect profile
			if (profileName === "") {
				// Open dialog save current profile
				if (currentProfile) {
					new DialogModal(this.app, 'Save befor deselect profile?', 'Otherwise, unsaved changes will be lost.', async () => {
						// Save current profile 
						await this.saveProfileSettings(currentProfile);
					}, async () => { }, 'Save', false, 'Do not Save')
						.open();
				}
				this.updateCurrentProfile(undefined);
				await this.saveSettings();
				return;
			}

			const targetProfile = this.getProfile(profileName);

			// Is target profile existing
			if (!targetProfile || !targetProfile.name) {
				throw Error(`Target profile does not exist! TargetProfile: ${JSON.stringify(targetProfile)}`);
			}

			// Check is current profile
			if (currentProfile?.name === targetProfile.name) {
				new Notice('Allready current profile!');
				return;
			}

			// Save current profile 
			if (currentProfile?.autoSync) {
				await this.saveProfileSettings(currentProfile);
			}

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
			}, async () => {
				await this.saveSettings();
				new Notice('Need to reload obsidian!', 5000);
			}, 'Reload')
				.open();
		} catch (e) {
			this.updateCurrentProfile(undefined);
			new Notice(`Failed to switch to ${profileName} profile!`);
			(e as Error).message = 'Failed to switch profile! ' + (e as Error).message + ` ProfileName: ${profileName} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Create a new profile with the current settings 
	 * @param profile The profile options the profile should be created with
	 */
	async createProfile(profile: ProfileOptions) {
		try {
			// Add profile to profileList
			this.appendProfilesList(profile);

			// Enabel new Profile
			const selectedProfile = this.getProfilesList().find(value => value.name === profile.name);
			if (selectedProfile) {
				// Sync the profile settings
				await this.saveProfileSettings(selectedProfile);
			}
			else {
				await this.removeProfile(profile.name);
				new Notice(`Failed to create profile ${profile.name}!`);
			}
		} catch (e) {
			new Notice(`Failed to create ${profile.name} profile!`);
			(e as Error).message = 'Failed to create profile! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Edit the profile with the given profile name to be profileSettings
	 * @param profileName The profile name to edit
	 * @param profileOptions The new profile options
	 */
	async editProfile(profileName: string, profileOptions: ProfileOptions) {
		try {
			const profile = this.getProfile(profileName);

			let renamed = false;

			Object.keys(profileOptions).forEach(key => {
				const objKey = key as keyof ProfileOptions;

				// Name changed
				if (objKey === 'name' && profileOptions.name !== profileName) {
					renamed = true;
				}

				// Values changed
				const value = profileOptions[objKey];
				if (typeof value === 'boolean') {
					(profile[objKey] as boolean) = value;
				}
			});

			// Profile renamed
			if (renamed) {
				await this.createProfile(profileOptions);
				await this.switchProfile(profileOptions.name);
				await this.removeProfile(profileName);
			}
			else {
				await this.saveProfileSettings(profile);
			}
		} catch (e) {
			new Notice(`Failed to edit ${profileName} profile!`);
			(e as Error).message = 'Failed to edit profile! ' + (e as Error).message + ` ProfileName: ${profileName} ProfileOptions: ${JSON.stringify(profileOptions)}`;
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
			removeDirectoryRecursiveSync([this.getAbsolutProfilesPath(), profileName]);
			this.refreshProfilesList();
			await this.saveSettings();
		} catch (e) {
			new Notice(`Failed to remove ${profileName} profile!`);
			(e as Error).message = 'Failed to remove profile! ' + (e as Error).message + ` ProfileName: ${profileName} GlobalSettings: ${JSON.stringify(this.globalSettings)}`;
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
			const targetPath = [this.getAbsolutProfilesPath(), profileName];
			let changed = false;

			// Check target dir exist
			ensurePathExist([...targetPath]);

			let filesList = getConfigFilesList(profile);
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = getFilesWithoutPlaceholder(filesList, sourcePath);
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = filterChangedFiles(filesList, sourcePath, targetPath);

			filesList.forEach(file => {
				if (existsSync(join(...sourcePath, file))) {
					changed = true;
					copyFile([...sourcePath, file], [...targetPath, file])
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
			(e as Error).message = 'Failed to save profile! ' + (e as Error).message + ` ProfileName: ${profileName}`;
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

			const sourcePath = [this.getAbsolutProfilesPath(), profileName];
			const targetPath = [getVaultPath(), this.app.vault.configDir];

			// Check target dir exist
			if (!existsSync(join(...sourcePath))) {
				throw Error(`Source path do not exist! SourcePath: ${join(...sourcePath)}`);
			}

			let filesList = getConfigFilesList(profile);
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = getFilesWithoutPlaceholder(filesList, sourcePath);
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = filterChangedFiles(filesList, sourcePath, targetPath);

			filesList.forEach(file => {
				if (existsSync(join(...sourcePath, file))) {
					copyFile([...sourcePath, file], [...targetPath, file])
				}
			});

			// Change active profile
			this.updateCurrentProfile(profile);
		} catch (e) {
			new Notice(`Failed to load ${profileName} profile!`);
			(e as Error).message = 'Failed to load profile! ' + (e as Error).message + ` ProfileName: ${profileName}`;
			console.error(e);
		}
	}

	/**
	 * Retrieves the profile path for the current device.
	 * 
	 * This function uses the machine ID to look up the associated profile path from the vault settings. 
	 * If the profile path is missing, it attempts to use a deprecated path and updates the vault settings accordingly.
	 * If neither the current nor deprecated paths are available, it creates a entry for current device with default profiles path.
	 * 
	 * @returns {string} The normalized profile path for the current device.
	 * @throws {Error} If the device ID cannot be determined.
	 */
	getProfilesPath(): string {
		const deviceID = machineIdSync(false);
		if (!deviceID || deviceID === "") {
			throw Error("Failed to load device ID!");
		}

		const devicePath = this.vaultSettings.devices[deviceID];
		if (!devicePath || devicePath === "") {
			const deprecatedPath = this.vaultSettings.profilesPath;
			if (deprecatedPath && deprecatedPath !== "") {
				// Use deprecated path if available
				this.vaultSettings.devices[deviceID] = deprecatedPath;
				this.saveSettings();

				return normalize(deprecatedPath);
			}
			else {
				// No path found, using default profile path
				console.warn(`No profile path stored for this device: ${deviceID} create entry with default!`);
				this.vaultSettings.devices[deviceID] = DEFAULT_PROFILE_PATH;
				this.saveSettings();

				return normalize(DEFAULT_PROFILE_PATH);
			}
		}

		return normalize(devicePath);
	}

	/**
	 * Retrieves the absolute profile path for the current device.
	 * 
	 * This function ensures that the profile path returned is an absolute path. 
	 * If the path is relative, it joins it with the vault path to convert it into an absolute path. 
	 * It validates the resulting path is an valid path. 
	 * 
	 * @returns {string} The normalized absolute profile path for the current device.
	 * @throws {Error} If the device ID cannot be determined.
	 * @throws {Error} If no valid profiles path can be found.
	 */
	getAbsolutProfilesPath(): string {
		const relativePath = this.getProfilesPath();
		let path = relativePath;

		if (!isAbsolute(path)) {
			path = join(getVaultPath(), path);
		}

		if (!isValidPath([path])) {
			throw Error(`No valid profiles path could be found! Path: ${path} ProfilesPath: ${relativePath}`);
		}

		return normalize(path);
	}

	/**
	 * Sets the profile path in the vault settings for the current device ID.
	 * 
	 * This function retrieves the device ID and updates its associated profile 
	 * path in the vault settings. If the provided path is invalid (empty after normalization), 
	 * an error is thrown, and the path is not updated.
	 * 
	 * @param {string} path - The new profile path to be set for the current device.
	 * 
	 * @throws {Error} If the device ID cannot be determined.
	 * @throws {Error} If the provided path is invalid (empty after normalization).
	 */
	setProfilePath(path: string) {
		const deviceID = machineIdSync(false);
		if (!deviceID || deviceID === "") {
			throw Error("Failed to load device ID!");
		}

		path = path.trim();
		if (path !== '') {
			this.vaultSettings.devices[deviceID] = normalize(path);
		} else {
			throw Error("Profile path failed to update. The provided path is invalid!");
		}
	}

	/**
	 * Reloads the profiles list from files.
	 */
	refreshProfilesList() {
		try {
			this.globalSettings.profilesList = loadProfilesOptions(this.getAbsolutProfilesPath());
			return;
		} catch (e) {
			console.warn(`Refresh profiles list failed with stored values because of: ${e.message}`);
		}
		try {
			this.globalSettings.profilesList = loadProfilesOptions(DEFAULT_PROFILE_PATH);
		} catch (e) {
			console.error(`Refresh profiles list failed with default path because of: ${e.message}`);
		}
	}

	/**
	 * Appends the profile list with new profile
	 * @param profile The profile to add to the profiles list
	 */
	appendProfilesList(profile: ProfileOptions) {
		if (!this.isValidProfile(profile)) {
			throw Error(`No valid profile received! Profile: ${JSON.stringify(profile)}`);
		}
		if (this.getProfilesList().find(p => profile.name === p.name)) {
			throw Error(`Profile does already exist! Profile: ${JSON.stringify(profile)} ProfilesList: ${JSON.stringify(this.globalSettings.profilesList)}`);
		}
		const length = this.globalSettings.profilesList.length;
		if (length >= this.globalSettings.profilesList.push(profile)) {
			throw Error(`Profile could not be added to the profile list! Profile: ${JSON.stringify(profile)} ProfilesList: ${JSON.stringify(this.globalSettings.profilesList)}`);
		}
	}

	/**
	 * Returns the profiles list currently in the settings
	 */
	getProfilesList(): ProfileOptions[] {
		return this.globalSettings.profilesList;
	}

	/**
	 * Set the profiles list in current settings
	 * @param profilesList What the profiles list should be set to
	 */
	setProfilesList(profilesList: ProfileOptions[]) {
		this.globalSettings.profilesList = profilesList;
	}

	/**
	 * Returns the refresh interval currently in the settings
	 * @returns 
	 */
	getUiRefreshInterval(): number {
		if (!this.vaultSettings.uiUpdateInterval || this.vaultSettings.uiUpdateInterval <= 0 || this.vaultSettings.uiUpdateInterval >= 900000) {
			this.setUiRefreshInterval(-1);
		}
		return this.vaultSettings.uiUpdateInterval;
	}

	/**
	 * Set the refresh interval in current settings
	 * @param interval To what the invervall should be set to
	 */
	setUiRefreshInterval(interval: number) {
		if (interval > 0 && interval < 900000) {
			this.vaultSettings.uiUpdateInterval = interval;
		}
		else {
			this.vaultSettings.uiUpdateInterval = DEFAULT_VAULT_SETTINGS.uiUpdateInterval;
		}
	}

	getUiUpdate() {
		return this.vaultSettings.uiUpdate;
	}

	setUiUpdate(value: boolean) {
		this.vaultSettings.uiUpdate = value;
	}

	getProfileUpdate() {
		return this.vaultSettings.profileUpdate;
	}

	setProfileUpdate(value: boolean) {
		this.vaultSettings.profileUpdate = value;
	}

	getStatusbarInteraction(mod?: 'ctrl' | 'shift' | 'alt') {
		switch (mod) {
			case 'ctrl':
				return this.vaultSettings.statusbarInteraction.ctrl_click;
			case 'shift':
				return this.vaultSettings.statusbarInteraction.shift_click;
			case 'alt':
				return this.vaultSettings.statusbarInteraction.alt_click;
			default:
				return this.vaultSettings.statusbarInteraction.click;
		}
	}

	setStatusbarInteraction(value: StatusbarClickAction, mod?: 'ctrl' | 'shift' | 'alt') {
		switch (mod) {
			case 'ctrl':
				this.vaultSettings.statusbarInteraction.ctrl_click = value;
				break;
			case 'shift':
				this.vaultSettings.statusbarInteraction.shift_click = value;
				break;
			case 'alt':
				this.vaultSettings.statusbarInteraction.alt_click = value;
				break;
			default:
				this.vaultSettings.statusbarInteraction.click = value;
				break;
		}
	}

	/**
	 * Returns the delay time for profile update currently in the settings
	 * @returns 
	 */
	getProfileUpdateDelay(): number {
		if (!this.vaultSettings.profileUpdateDelay || this.vaultSettings.profileUpdateDelay <= 0 || this.vaultSettings.profileUpdateDelay >= 900000) {
			this.setProfileUpdateDelay(-1);
		}
		return this.vaultSettings.profileUpdateDelay;
	}

	/**
	 * Set the delay time for profile update in current settings
	 * @param delay To what the invervall should be set to
	 */
	setProfileUpdateDelay(delay: number) {
		if (delay > 100 && delay < 900000) {
			this.vaultSettings.profileUpdateDelay = delay;
		}
		else {
			this.vaultSettings.profileUpdateDelay = DEFAULT_VAULT_SETTINGS.profileUpdateDelay;
		}
	}

	/**
	 * Gets the profile object
	 * @param name The name of the profile
	 * @returns The ProfileSetting object. Or undefined if not found.
	 */
	getProfile(name: string): ProfileOptions {
		const profile = this.getProfilesList().find(profile => profile.name === name);
		if (!profile) {
			throw Error(`Profile does not exist! ProfileName: ${name} ProfilesList: ${JSON.stringify(this.getProfilesList())}`);
		}

		// Convert date string to date
		profile.modifiedAt = new Date(profile.modifiedAt);

		return profile;
	}

	/**
	 * Gets the currently enabeled profile.
	 * @returns The ProfileSetting object. Or undefined if not found.
	 */
	getCurrentProfile(): ProfileOptions | undefined {
		const name = this.vaultSettings.activeProfile?.name;
		if (!name) {
			return;
		}
		const profile = this.getProfilesList().find(profile => profile.name === name);
		if (!profile) {
			return;
		}

		// Use modified at from vault settings
		if (this.vaultSettings.activeProfile) {
			let modifiedAt = this.vaultSettings.activeProfile.modifiedAt;
			if (modifiedAt) {
				// Convert date string to date
				modifiedAt = new Date(modifiedAt);
				profile.modifiedAt = modifiedAt;
			}
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
	 * Checks profile contains all requiered properties
	 * @param profile The profile to check
	 * @returns True if profile contains all requiered properties
	 */
	isValidProfile(profile: ProfileOptions): boolean {
		let result = true;
		for (const key in DEFAULT_PROFILE_OPTIONS) {
			if (!profile.hasOwnProperty(key)) {
				console.warn(`Missing property in profile! Property: ${key} Profile: ${JSON.stringify(profile)}`);
				result = false;
				break;
			}
			else if (typeof profile[key as keyof ProfileOptions] !== typeof DEFAULT_PROFILE_OPTIONS[key as keyof ProfileOptions]) {
				console.warn(`Wrong type of property in profile! Property: ${key} Type: ${typeof DEFAULT_PROFILE_OPTIONS[key as keyof ProfileOptions]} Profile: ${JSON.stringify(profile)}`);
				result = false;
				break;
			}
			else if (profile[key as keyof ProfileOptions] === undefined || profile[key as keyof ProfileOptions] === null) {
				console.warn(`Undefined property in profile! Property: ${key} Profile: ${JSON.stringify(profile)}`)
				result = false;
				break;
			}
		}
		return result;
	}

	/**
	 * Checks the profile is up to date to the saved profile
	 * @param profile The profile to check 
	 * @returns Is loaded profile newer/equal than saved profile
	 */
	isProfileUpToDate(profile: ProfileOptions): boolean {
		const profileOptions = loadProfileOptions(profile, this.getAbsolutProfilesPath());

		if (!profileOptions || !profileOptions.modifiedAt) {
			return true;
		}

		if (new Date(profile.modifiedAt).getTime() >= new Date(profileOptions.modifiedAt).getTime()) {
			return true;
		}

		return !this.areSettingsChanged(profile);
	}

	/**
	 * Check the profile settings are saved 
	 * @param profile The profile to check 
	 * @returns Is saved profile newer/equal than saved profile
	 */
	isProfileSaved(profile: ProfileOptions): boolean {
		const profileOptions = loadProfileOptions(profile, this.getAbsolutProfilesPath());

		if (!profileOptions || !profileOptions.modifiedAt) {
			return false;
		}

		if (new Date(profile.modifiedAt).getTime() <= new Date(profileOptions.modifiedAt).getTime()) {
			return true;
		}

		return this.areSettingsSaved(profile);
	}
}

