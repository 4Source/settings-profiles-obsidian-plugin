import {Notice, Plugin} from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import {DEFAULT_SETTINGS, Settings, SettingsProfilesSettingTab} from "src/Settings";
import { ProfileSwitcherModal } from './ProfileSwitcherModal';

export default class SettingsProfilesPlugin extends Plugin {
	settings: Settings;
	previousSettings: Settings;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		if (!fs.existsSync(this.settings.profilesPath)) {
			fs.mkdirSync(this.settings.profilesPath, {recursive: true});
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));

		// Add Command to Switch between profiles
		this.addCommand({
			id: "switch-settings-profile",
			name: "Switch settings profile",
			hotkeys: [{modifiers: ["Ctrl", "Shift"], key: "p"}],
			callback: () => {
				new ProfileSwitcherModal(this.app, this, (result) => {
					new Notice(`Switched to Profile ${result.name}`);
					this.previousSettings.profile = structuredClone(this.settings.profile)
					this.settings.profile = result.name;
					this.saveSettings();
				}).open();
			}
		})
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.previousSettings = structuredClone(this.settings);

		// Sync Profiles
		// if(this.settings.autoSync) {
		 	// ToDo Sync Profiles
		// }
	}

	async saveSettings() {
		// Save settings
		await this.saveData(this.settings);

		// Check profilePath has changed
		if(this.previousSettings.profilesPath != this.settings.profilesPath) {
			// Copy profiles to new path
			copyFolderRecursiveSync(this.previousSettings.profilesPath, this.settings.profilesPath);
			// Remove old profiles path
			removeDirectoryRecursiveSync(this.previousSettings.profilesPath);
		}

		// Sync Profiles
		// if(this.settings.autoSync) {
			// ToDo Sync Profiles
		// }

		// Check profile has changed
		if(this.previousSettings.profile != this.settings.profile) {
			// Switch to Profile		
			this.switchSettings(this.settings.profile)
		}
	}

	async switchSettings(profileName: string) {
		// ToDo Switch to profile
	}
}

/**
 * Copy recursive Folder Strucure 
 * @param source The source folder to copy the subfolders/files
 * @param target The target folder where to copy the subfolders/files to
 */
function copyFolderRecursiveSync(source: string, target: string) {
	if (!fs.existsSync(target)) {
	  fs.mkdirSync(target, {recursive: true});
	}
  
	const files = fs.readdirSync(source);
  
	files.forEach(file => {
	  const sourcePath = path.join(source, file);
	  const targetPath = path.join(target, file);
  
	  if (fs.statSync(sourcePath).isDirectory()) {
		copyFolderRecursiveSync(sourcePath, targetPath);
	  } else {
		fs.copyFileSync(sourcePath, targetPath);
	  }
	});
}

/**
 * Remove recursive Folder Strucure 
 * @param directory The folder to remove 
 */
function removeDirectoryRecursiveSync(directory: string) {
	if (fs.existsSync(directory)) {
	  fs.readdirSync(directory).forEach(file => {
		const filePath = path.join(directory, file);
  
		if (fs.statSync(filePath).isDirectory()) {
		  // Recursively remove subdirectories
		  removeDirectoryRecursiveSync(filePath);
		} else {
		  // Remove files
		  fs.unlinkSync(filePath);
		}
	  });
  
	  // Remove the empty directory
	  fs.rmdirSync(directory);
	}
}
