import {Plugin} from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import {DEFAULT_SETTINGS, Settings, SettingsProfilesSettingTab} from "src/Settings";

export default class SettingsProfilesPlugin extends Plugin {
	settings: Settings;
	previousSettings: Settings;

	async onload() {
		await this.loadSettings();

		// Make sure Profile path exists
		if (!fs.existsSync(this.settings.ProfilesPath)) {
			fs.mkdirSync(this.settings.ProfilesPath, {recursive: true});
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsProfilesSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.previousSettings = structuredClone(this.settings);

		// Sync Profiles
		if(this.settings.AutoSync) {
			// ToDo Sync Profiles
		}
	}

	async saveSettings() {
		// Save settings
		await this.saveData(this.settings);

		// Check profilePath has changed
		if(this.previousSettings.ProfilesPath != this.settings.ProfilesPath) {
			// Copy profiles to new path
			copyFolderRecursiveSync(this.previousSettings.ProfilesPath, this.settings.ProfilesPath);
			// Remove old profiles path
			removeDirectoryRecursiveSync(this.previousSettings.ProfilesPath);
		}

		// Sync Profiles
		if(this.settings.AutoSync) {
			// ToDo Sync Profiles
		}
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
