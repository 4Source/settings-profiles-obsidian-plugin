import { App, Notice, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import * as os from 'os';
import * as path from 'path';
import SettingsProfilesPlugin, { getVaultPath } from './main';
import { AddProfileModal, ChooseSettingsToSync } from './ProfileModal';
import { join } from 'path';

export interface SettingsProfile {
	name: string;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean; //include core-plugins and core-plugins-migration
	corePlugins: boolean;
	graph: boolean;
	hotkeys: boolean;
}

export const configFiles = {
	"appearance.json": "appearance",
	"app.json": "app",
	"bookmarks.json": "bookmarks",
	"community-plugins.json": "communityPlugins",
	"core-plugins.json": "corePlugins",
	"core-plugins-migration.json": "corePlugins",
	"graph.json": "graph",
	"hotkeys.json": "hotkeys",
}

export const DEFAULT_PROFILE: SettingsProfile = {
	name: 'Default',
	appearance: true,
	app: true,
	bookmarks: true,
	communityPlugins: true,
	corePlugins: true,
	graph: true,
	hotkeys: true,
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

		this.containerEl.createEl("h2", { text: "Profiles" });
		this.containerEl.createEl("p", { text: "The current profile is marked with a star." });
		for (const profile of this.plugin.settings.profilesList) {
			const profileSetting = new Setting(containerEl)
				.setName(profile.name)
				.setClass(this.plugin.settings.profile === profile.name ? "settings-profiles-current" : "settings-profiles")
				.addExtraButton(button => button
					.setIcon('pencil')
					.setTooltip("Edit file used in the profile")
					.onClick(async () => {
						new ChooseSettingsToSync(this.app, this.plugin, profile, (profile) => {
							const index = this.plugin.settings.profilesList.findIndex(value => value.name === profile.name);
							this.plugin.settings.profilesList[index] = profile;
							this.plugin.saveSettings();
						}).open();
					})
				);
			if (profile.name !== this.plugin.settings.profile) {
				profileSetting.addExtraButton(button => button
					.setIcon('trash')
					.setTooltip('Delete Profile')
					.onClick(async () => {
						if (this.plugin.settings.profilesList.length === 1) {
							new Notice('You cannot delete the last profile!');
							return;
						}
						this.plugin.settings.profilesList = this.plugin.settings.profilesList.filter(value => value.name !== profile.name);
						await this.plugin.saveSettings();
						this.display();
					}))
					.addExtraButton(button => button
					.setIcon("play")
					.setTooltip("Switch to this profile")
					.onClick(async () => {
						this.plugin.settings.profile = profile.name;
						this.plugin.switchProfile(profile.name);
						await this.plugin.saveSettings();
					}))

			}
		}

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add profile')
				.onClick(async () => {
					new AddProfileModal(this.app, this.plugin, async (name) => {
						this.plugin.settings.profilesList.push({
							name,
							appearance: true,
							app: true,
							bookmarks: true,
							communityPlugins: true,
							corePlugins: true,
							graph: true,
							hotkeys: true,
						});

						// Copy profile config
						const configSource = getVaultPath() !== "" ? join(getVaultPath(), this.app.vault.configDir) : "";
						const configTarget = join(this.plugin.settings.profilesPath, name);
						this.plugin.copyConfig(configSource, configTarget);
						this.display();
						await this.plugin.saveSettings();
					}).open();

				}));
	}
}

