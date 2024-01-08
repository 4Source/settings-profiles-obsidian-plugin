import { App, Notice, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import * as os from 'os';
import * as path from 'path';
import SettingsProfilesPlugin, { getVaultPath } from './main';
import { ProfileModal, ProfileState } from './ProfileModal';
import { join } from 'path';

export interface SettingsProfile {
	name: string;
}

export const DEFAULT_PROFILE: SettingsProfile = {
	name: 'Default',
}

export interface Settings {
	profile: string;
	profilesPath: string;
	profilesList: SettingsProfile[]
	autoSync: boolean;
	snippets: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	profile: DEFAULT_PROFILE.name,
	profilesPath: path.join(os.homedir(), 'Documents', 'Obsidian', 'Profiles'),
	profilesList: [DEFAULT_PROFILE],
	autoSync: true,
	snippets: false,
}


export class SettingsProfilesSettingTab extends PluginSettingTab {
	plugin: SettingsProfilesPlugin;

	constructor(app: App, plugin: SettingsProfilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Open profile switcher')
				.onClick(async () => {
					new ProfileModal(this.app, this.plugin, (result, state) => {
						switch (state) {
							case ProfileState.CURRENT:
								return;
							case ProfileState.NEW:
								// Create new Profile
								const current = structuredClone(this.plugin.settings.profilesList.find(value => value.name === this.plugin.settings.profile));
								if (!current) {
									new Notice('Failed to create Profile!');
									return;
								}
								current.name = result.name;
								this.plugin.settings.profilesList.push(current);

								// Copy profile config
								const configSource = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";
								const configTarget = join(this.plugin.settings.profilesPath, result.name);
								this.plugin.copyConfig(configSource, configTarget);
								break;
						}
						this.plugin.switchProfile(result.name);
						this.plugin.saveSettings();
					}).open();
				}));

		// Heading for General Settings
		this.containerEl.createEl("h2", { text: "General" });

		// Path where the Profiles are Saved
		new Setting(containerEl)
			.setName('Profile save path')
			.setDesc('The path to store the profile settings')
			.addText(text => text
				.setValue(this.plugin.settings.profilesPath)
				.onChange(async (value) => {
					// Make a Copy of this previous Setting
					this.plugin.previousSettings.profilesPath = structuredClone(this.plugin.settings.profilesPath);
					// Assign value of this Setting an save it
					this.plugin.settings.profilesPath = normalizePath(value);
					await this.plugin.saveSettings();
				}));
		// Auto Sync Profiles
		new Setting(containerEl)
			.setName('Auto Sync')
			.setDesc('If enabled syncronize the profiles on startup.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSync)
				.onChange(async (value) => {
					// Assign value of this Setting an save it
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();
				}));

		// Heading for Profiles overview
		// this.containerEl.createEl("h2", { text: "Profiles" });

		new Setting(containerEl)
			.setName('Copy CSS snippets')
			.setDesc('Copy CSS snippets from the current profile to the new profile.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.snippets)
				.onChange(async (value) => {
					// Assign value of this Setting an save it
					this.plugin.settings.snippets = value;
					await this.plugin.saveSettings();
				}));
	}
}
