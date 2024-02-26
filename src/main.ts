import { Notice, debounce } from 'obsidian';
import { SettingsProfilesSettingTab } from "src/settings/SettingsTab";
import { ProfileSwitcherModal } from './modals/ProfileSwitcherModal';
import { copyFile, ensurePathExist, getVaultPath, isValidPath, removeDirectoryRecursiveSync } from './util/FileSystem';
import { DEFAULT_VAULT_SETTINGS, VaultSettings, ProfileOptions, GlobalSettings, DEFAULT_GLOBAL_SETTINGS } from './settings/SettingsInterface';
import { filterIgnoreFilesList, filterUnchangedFiles, getConfigFilesList, getFilesWithoutPlaceholder, getIgnoreFilesList, loadProfileOptions, loadProfilesOptions, saveProfileOptions } from './util/SettingsFiles';
import { isAbsolute, join, normalize } from 'path';
import { FSWatcher, existsSync, watch } from 'fs';
import { DialogModal } from './modals/DialogModal';
import PluginExtended from './core/PluginExtended';
import { ICON_CURRENT_PROFILE, ICON_NO_CURRENT_PROFILE, ICON_UNLOADED_PROFILE, ICON_UNSAVED_PROFILE } from './constants';

export default class SettingsProfilesPlugin extends PluginExtended {
	private vaultSettings: VaultSettings;
	private globalSettings: GlobalSettings;
	private statusBarItem: HTMLElement;
	private settingsListener: FSWatcher;
	private settingsChanged: boolean;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		try {
			ensurePathExist([this.getAbsolutProfilesPath()]);
		} catch (e) {
			new Notice("Profile save path is not valid!");
			(e as Error).message = 'Profile path is not valid! ' + (e as Error).message;
			console.error(e);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));

		// Add Settings change listener
		this.settingsListener = watch(join(getVaultPath(), this.app.vault.configDir), { recursive: true }, debounce((eventType, filename) => {
			this.refreshProfilesList();
			const profile = this.getCurrentProfile();
			if (profile) {
				this.settingsChanged = !getIgnoreFilesList(profile).contains(filename ?? "");
			}
		}, 500, false));

		// Update profiles at Intervall 
		this.registerInterval(window.setInterval(() => {
			this.update();
		}, this.vaultSettings.refreshIntervall));

		// Add Command to Switch between profiles
		this.addCommand({
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				// Open new profile switcher modal to switch or create a new profile
				new ProfileSwitcherModal(this.app, this).open();
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

	onunload() {
		if (this.settingsListener) {
			this.settingsListener.close();
		}
	}

	/**
	 * Update status bar
	 */
	update() {
		this.refreshProfilesList();
		let profile = this.getCurrentProfile();

		let icon = ICON_NO_CURRENT_PROFILE;
		let label = 'Switch profile';

		// Attach status bar item
		if (profile) {
			if (this.settingsChanged && this.areSettingsChanged(profile)) {
				// Save settings to profile
				if (profile.autoSync) {
					this.saveProfileSettings(profile);
				}
				// Update modifiedAt to now
				else {
					profile.modifiedAt = new Date()
					this.updateCurrentProfile(profile);
					this.saveSettings();
				}
			}
			this.settingsChanged = false;

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
		// Update status bar
		if (this.statusBarItem) {
			this.updateStatusBarItem(this.statusBarItem, icon, profile?.name, label);
		}
		else {
			this.statusBarItem = this.addStatusBarItem(icon, profile?.name, label, () => {
				try {
					const profile = this.getCurrentProfile();
					if (!profile || this.isProfileSaved(profile)) {
						if (!profile || this.isProfileUpToDate(profile)) {
							// Profile is up-to-date and saved
							new ProfileSwitcherModal(this.app, this).open();
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
									}, () => {
										this.saveSettings();
										new Notice('Need to reload obsidian!', 5000);
									}, 'Reload')
										.open();
								});
						}
					}
					else {
						// Profile is not saved
						this.saveProfileSettings(profile)
							.then(() => {
								new Notice('Saved profile successfully.');
							});
					}
				} catch (e) {
					(e as Error).message = 'Failed to handle status bar callback! ' + (e as Error).message;
					console.error(e);
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
			// Save vault settings
			await this.saveData(this.vaultSettings);
		} catch (e) {
			(e as Error).message = 'Failed to save settings! ' + (e as Error).message + ` VaultSettings: ${JSON.stringify(this.vaultSettings)}`;
			console.error(e);
		}
	}

	/**
	 * Check relevant files for current profile are changed
	 * @returns `ture` if at least one file has changed
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
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = getFilesWithoutPlaceholder(filesList, sourcePath);
			filesList = filterIgnoreFilesList(filesList, profile);
			filesList = filterUnchangedFiles(filesList, sourcePath, targetPath);

			return filesList.length > 0
		} catch (e) {
			(e as Error).message = 'Failed to check settings changed! ' + (e as Error).message + ` Profile: ${JSON.stringify(profile)}`;
			console.error(e);
			return true;
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
			saveProfileOptions(profile, this.getAbsolutProfilesPath());

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
					}, async () => { }, 'Save', 'Do not Save')
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
			// Check profile Exist
			if (this.getProfilesList().find(p => profile.name === p.name)) {
				throw Error('Profile does already exist!');
			}

			// Add profile to profileList
			this.globalSettings.profilesList.push(profile);

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
			filesList = filterUnchangedFiles(filesList, sourcePath, targetPath);

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
			filesList = filterUnchangedFiles(filesList, sourcePath, targetPath);

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
	 * Returns the path how its saved in settings to profiles. 
	 * @returns 
	 */
	getProfilesPath(): string {
		return normalize(this.vaultSettings.profilesPath);
	}

	/**
	 * Returns an absolut path to profiles.
	 */
	getAbsolutProfilesPath(): string {
		let path = this.vaultSettings.profilesPath;

		if (!isAbsolute(path)) {
			path = join(getVaultPath(), path);
		}

		if (!isValidPath([path])) {
			throw Error(`No valid profiles path could be found! Path: ${path} ProfilesPath: ${this.vaultSettings.profilesPath}`);
		}
		return normalize(path);
	}

	/**
	 * Sets the profiles path in the settings
	 * @param path Path the profiles path should be set to
	 */
	setProfilePath(path: string) {
		path = path.trim();
		if (path !== '') {
			this.vaultSettings.profilesPath = normalize(path)
		}
		else {
			this.vaultSettings.profilesPath = DEFAULT_VAULT_SETTINGS.profilesPath;
		}
	}

	/**
	 * Reloads the profiles list from files.
	 */
	refreshProfilesList() {
		this.globalSettings.profilesList = loadProfilesOptions(this.getAbsolutProfilesPath());
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
	 * Returns the refresh intervall currently in the settings
	 * @returns 
	 */
	getRefreshIntervall(): number {
		if (!this.vaultSettings.refreshIntervall || this.vaultSettings.refreshIntervall <= 0 || this.vaultSettings.refreshIntervall >= 900000) {
			this.setRefreshIntervall(-1);
		}
		return this.vaultSettings.refreshIntervall;
	}

	/**
	 * Set the refresh intervall in current settings
	 * @param intervall To what the invervall should be set to
	 */
	setRefreshIntervall(intervall: number) {
		if (intervall > 0 && intervall < 900000) {
			this.vaultSettings.refreshIntervall = intervall;
		}
		else {
			this.vaultSettings.refreshIntervall = DEFAULT_VAULT_SETTINGS.refreshIntervall;
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
	 * Checks the profile is up to date to the saved profile
	 * @param profile The profile to check 
	 * @returns Is loaded profile newer/equal than saved profile
	 */
	isProfileUpToDate(profile: ProfileOptions): boolean {
		const list = loadProfilesOptions(this.getAbsolutProfilesPath());
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
		const list = loadProfilesOptions(this.getAbsolutProfilesPath());
		const profileData = list.find((value, index, obj) => value.name === profile.name)

		if (!profileData || !profileData.modifiedAt) {
			return false;
		}

		const profileDataDate = new Date(profileData.modifiedAt);
		const profileDate = new Date(profile.modifiedAt);

		return profileDate.getTime() <= profileDataDate.getTime();
	}
}

