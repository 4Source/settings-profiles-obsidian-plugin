import { FileSystemAdapter, Notice, Plugin } from 'obsidian';
import { join } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from 'fs';
import { DEFAULT_SETTINGS, Settings, SettingsProfilesSettingTab } from "src/Settings";
import { ProfileModal, ProfileState } from './ProfileModal';

const settingsFiles = ['app.json', 'appearance.json', 'bookmarks.json', 'community-plugins.json', 'core-plugins.json', 'core-plugins-migration.json', 'graph.json', 'hotkeys.json'];

export default class SettingsProfilesPlugin extends Plugin {
	settings: Settings;
	previousSettings: Settings;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		if (!existsSync(this.settings.profilesPath)) {
			mkdirSync(this.settings.profilesPath, { recursive: true });
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));

		// Register to close obsidian
		this.registerEvent(this.app.workspace.on('quit', () => {
			// Sync Profiles
			if (this.settings.autoSync) {
				this.syncSettings();
			}
		}));

		// Display Settings Profile on Startup
		new Notice(`Current profile: ${this.settings.profile}`);

		// Add Command to Switch between profiles
		this.addCommand({
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				new ProfileModal(this.app, this, (result, state) => {
					switch (state) {
						case ProfileState.CURRENT:
							return;
						case ProfileState.NEW:
							// Create new Profile
							const current = structuredClone(this.settings.profilesList.find(value => value.name === this.settings.profile));
							if (!current) {
								new Notice('Failed to create profile!');
								return;
							}
							current.name = result.name;
							this.settings.profilesList.push(current);

							// Copy profile config
							const configSource = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";
							const configTarget = join(this.settings.profilesPath, result.name);
							this.copyConfig(configSource, configTarget);
							break;
					}
					this.switchProfile(result.name);
					this.saveSettings();
				}).open();
			}
		});

		// Add Command to Show current profile
		this.addCommand({
			id: "current-profile",
			name: "Show current profile",
			callback: () => {
				new Notice(`Current profile: ${this.settings.profile}`);
			}
		});
	}

	onunload() { }

	/**
	 * Load Plugin Settings from file or default.
	 * Sync Profiles if enabeled.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.previousSettings = structuredClone(this.settings);

		// Sync Profiles
		if (this.settings.autoSync) {
			this.syncSettings();
		}
	}

	/**
	 * Save Plugin Settings to file.
	 * Sync Profiles if enabeled.
	 */
	async saveSettings() {
		// Save settings
		await this.saveData(this.settings);

		// Check profilePath has changed
		if (this.previousSettings.profilesPath != this.settings.profilesPath) {
			// Copy profiles to new path
			copyFolderRecursiveSync(this.previousSettings.profilesPath, this.settings.profilesPath);
			// Remove old profiles path
			removeDirectoryRecursiveSync(this.previousSettings.profilesPath);
		}

		// Sync Profiles
		if (this.settings.autoSync) {
			this.syncSettings();
		}
	}

	/**
	 * Switch to other Settings Profile.
	 */
	async switchProfile(profileName: string) {
		// Check profile Exist
		if (!this.settings.profilesList.find(value => value.name === profileName)) {
			new Notice(`Failed to switch ${profileName} profile!`, 10000);
			return;
		}

		this.previousSettings.profile = structuredClone(this.settings.profile)
		this.settings.profile = profileName;
		// Switch to Profile
		const configSource = join(this.settings.profilesPath, this.settings.profile);
		const configTarget = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";

		// Load profile config
		if (this.copyConfig(configSource, configTarget)) {
			new Notice(`Switched to profile ${this.settings.profile}`);
			// Reload obsidian so changed settings can take effect
			// @ts-ignore
			this.app.commands.executeCommandById("app:reload");
		}
		else {
			new Notice(`Failed to switch ${this.settings.profile} profile!`, 10000);
			this.settings.profile = this.previousSettings.profile;
		}
	}

	/**
	 * Sync Settings for active Profile.
	 */
	async syncSettings() {
		const configSource = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";
		const configTarget = join(this.settings.profilesPath, this.previousSettings.profile);

		// Check target dir exist
		if (!existsSync(configTarget) && isValidPath(configTarget)) {
			mkdirSync(configTarget, { recursive: true });
		}

		// Check for modified settings
		settingsFiles.forEach(file => {
			const sourcePath = join(configSource, file);
			const targetPath = join(configTarget, file);

			this.keepNewestSettings(sourcePath, targetPath);
		});

		this.getAllCSSFiles(configTarget).forEach(file => {
			const sourcePath = join(configSource, 'snippets', file);
			const targetPath = join(configTarget, 'snippets', file);

			this.keepNewestSettings(sourcePath, targetPath);
		});
	}

	keepNewestSettings(sourcePath: string, targetPath: string) {
		// Keep newest settings

		if ((!existsSync(targetPath) && existsSync(sourcePath)) || statSync(sourcePath).mtime >= statSync(targetPath).mtime) {
			copyFileSync(sourcePath, targetPath);
		}
		else if (existsSync(targetPath)) {
			copyFileSync(targetPath, sourcePath);
		}
	}

	/**
	 * Copy the Config form source to target.
	 * @param source Source Config
	 * @param target Target Config
	 * @returns True if was successfull.
	 */
	copyConfig(source: string, target: string) {
		if (!isValidPath(source) || !isValidPath(target) || !existsSync(source)) {
			return false;
		}
		if (!existsSync(target)) {
			mkdirSync(target, { recursive: true });
		}

		// Check each Setting File
		settingsFiles.forEach(file => {
			const sourcePath = join(source, file);
			const targetPath = join(target, file);

			if (!existsSync(sourcePath)) {
				return;
			}

			copyFileSync(sourcePath, targetPath);
		});

		this.getAllCSSFiles(target).forEach(file => {
			const sourcePath = join(source, 'snippets', file);
			const targetPath = join(target, 'snippets', file);
			if (!existsSync(sourcePath)) {
				return;
			}
			copyFileSync(sourcePath, targetPath);
		});
		return true;
	}

	getAllCSSFiles(target: string): string[] {
		if (!this.settings.snippets) {
			return [];
		}
		const parent = join(target, 'snippets');
		console.log(parent, existsSync(parent), target)
		if (!existsSync(parent)) {
			mkdirSync(parent, { recursive: true });
		}

		//@ts-ignore
		return this.app.customCss.snippets.map(name => `${name}.css`);
	}
}

/**
 * Copy recursive Folder Strucure
 * @param source The source folder to copy the subfolders/files
 * @param target The target folder where to copy the subfolders/files to
 */
function copyFolderRecursiveSync(source: string, target: string) {
	if (!isValidPath(source) || !isValidPath(target) || !existsSync(source)) {
		return false;
	}
	if (!existsSync(target)) {
		mkdirSync(target, { recursive: true });
	}

	const files = readdirSync(source);

	files.forEach(file => {
		const sourcePath = join(source, file);
		const targetPath = join(target, file);

		if (statSync(sourcePath).isDirectory()) {
			copyFolderRecursiveSync(sourcePath, targetPath);
		} else {
			copyFileSync(sourcePath, targetPath);
		}
	});

	return true;
}

/**
 * Check Path is Valid.
 * @param path Path to Check
 * @returns True if is Valid
 */
function isValidPath(path: string) {
	try {
		if (path === "") {
			return false;
		}
		// accessSync(path, constants.F_OK);
	} catch (err) {
		return false;
	}
	return true;
}

/**
 * Remove recursive Folder Strucure
 * @param directory The folder to remove
 */
function removeDirectoryRecursiveSync(directory: string) {
	if (existsSync(directory)) {
		readdirSync(directory).forEach(file => {
			const filePath = join(directory, file);

			if (statSync(filePath).isDirectory()) {
				// Recursively remove subdirectories
				removeDirectoryRecursiveSync(filePath);
			} else {
				// Remove files
				unlinkSync(filePath);
			}
		});

		// Remove the empty directory
		rmdirSync(directory);
	}
}

/**
 * Get the absolute path of this vault
 * @returns Returns the Absolut path
 */
export function getVaultPath() {
	const adapter = this.app.vault.adapter;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath();
	}
	return "";
}
