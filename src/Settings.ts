import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import { homedir } from 'os';
import { join } from 'path';
import SettingsProfilesPlugin from './main';
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { ProfileConfigModal } from './ProfileConfigModal';

export interface SettingsProfile {
	name: string;
	enabled: boolean;
	autoSync: boolean;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean; //include core-plugins and core-plugins-migration
	corePlugins: boolean;
	graph: boolean;
	hotkeys: boolean;
	snippets: boolean;
}

type SettingsProfileMap = {
	[key in keyof SettingsProfile]: {
	  name: string;
	  description: string;
	  file?: string|string[];
	};
  };

export const SETTINGS_PROFILE_MAP: SettingsProfileMap = {
	name: {
		name: 'Name',
		description: 'Naming of this Profile.',
	},
	enabled: {
		name: 'Enabled',
		description: 'Says whether this profile is selected.',
	},
	autoSync: {
		name: 'Auto Sync',
		description: 'Auto Sync this profile on startup.',
	},
	appearance: {
		name: 'Appearance',
		description: 'Says whether the obsidian appearance settings will sync.',
		file: 'appearance.json'
	},
	app: {
		name: 'App',
		description: 'Says whether the obsidian app settings will sync.',
		file: 'app.json'
	},
	bookmarks: {
		name: 'Bookmarks',
		description: 'Says whether the obsidian bookmarks will sync.',
		file: 'bookmarks.json'
	},
	communityPlugins: {
		name: 'Community Plugins',
		description: 'Says whether the community plugins and there settings will sync.',
		file: 'community-plugins.json',
	},
	corePlugins: {
		name: 'Core Plugins',
		description: 'Says whether the obsidian core plugin settings will sync.',
		file: ['core-plugins.json', 'core-plugins-migration.json']
	},
	graph: {
		name: 'Graph',
		description: 'Says whether the obsidian graph settings will sync.',
		file: 'graph.json'
	},
	hotkeys: {
		name: 'Hotkeys',
		description: 'Says whether the obsidian hotkey settings will sync.',
		file: 'hotkeys.json'
	},
	snippets: {
		name: 'CSS snippets',
		description: 'Says whether the CSS snippets will sync.',
	},
}

export const DEFAULT_PROFILE: SettingsProfile = {
	name: 'Default',
	enabled: true,
	autoSync: true,
	appearance: true,
	app: true,
	bookmarks: true,
	communityPlugins: false,
	corePlugins: true,
	graph: true,
	hotkeys: true,
	snippets: false,
}

export interface Settings {
	profilesPath: string;
	profilesList: SettingsProfile[]
}

export const DEFAULT_SETTINGS: Settings = {
	profilesPath: join(homedir(), 'Documents', 'Obsidian', 'Profiles'),
	profilesList: [DEFAULT_PROFILE]
}


export class SettingsProfilesSettingTab extends PluginSettingTab {
	plugin: SettingsProfilesPlugin;
	profilesSettings: Setting[];

	constructor(app: App, plugin: SettingsProfilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Heading for General Settings
		new Setting(containerEl)
			.setHeading()
			.setName('General');

		// Path where the Profiles are Saved
		new Setting(containerEl)
			.setName('Profile save path')
			.setDesc('The path to store the profile settings')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(async () => {
					const input:HTMLInputElement|null = this.containerEl.querySelector('#profile-path');
					if(input) {
						await this.plugin.changeProfilePath(normalizePath(input.value));
					}
					const button:HTMLButtonElement|null = this.containerEl.querySelector('#profile-change');
					if(button) {
						button.toggleVisibility(false);
					}
				})
				.buttonEl.setAttrs({'id': 'profile-change', 'style': 'visibility:hidden'}))
			.addText(text => text
				.setValue(this.plugin.settings.profilesPath)
				.onChange(value => {
					if(value !== this.plugin.settings.profilesPath) {
						const input:HTMLInputElement|null = this.containerEl.querySelector('#profile-path');
						if(input) {
							const button:HTMLButtonElement|null = this.containerEl.querySelector('#profile-change');
							if(button) {
								button.toggleVisibility(true);
							}
						}
					}
					else {
						const button:HTMLButtonElement|null = this.containerEl.querySelector('#profile-change');
							if(button) {
								button.toggleVisibility(false);
							}
					}
				})
				.inputEl.id = 'profile-path')
			;

		// Heading for Profiles
		new Setting(containerEl)
			.setHeading()
			.setName('Profiles')
			.addExtraButton(button => button
				.setIcon('plus')
				.setTooltip('Add new profile')
				.onClick(() => {
					new ProfileSwitcherModal(this.app, this.plugin, (result, state) => {
						switch (state) {
							case ProfileState.CURRENT:
								return;
							case ProfileState.NEW:
								// Create new Profile
								this.plugin.creatProfile(result.name);
								break;
						}
						this.display();
					}).open();
				}))
			.addExtraButton(button => button
				.setIcon('refresh-cw')
				.setTooltip('Reload profiles')
				.onClick(() => {
					this.display();
				}));

		this.plugin.settings.profilesList.forEach(profile => {
			new Setting(containerEl.createEl("div", { cls: "profiles-container" }))
				.setName(profile.name)
				.addExtraButton(button => button
					.setIcon('settings')
					.setTooltip('Options')
					.onClick(() => {
						new ProfileConfigModal(this.app, structuredClone(profile), (result) => {
							this.plugin.editProfile(result.name, result);
						}).open();
					}))
				// .addExtraButton(button => button
				// 	.setIcon('plus-circle')
				// 	.setTooltip('Hotkeys')
				// 	.onClick(() => {

				// 	}))
				.addExtraButton(button => button
					.setIcon('trash-2')
					.setTooltip('Remove')
					.onClick(() => {
						this.plugin.removeProfile(profile.name);
						this.display();
					}))

				.addExtraButton(button => button
					.setIcon(profile.enabled ? 'check' : 'download')
					.setTooltip('Switch to Profile')
					.onClick(async () => {
						if (!profile.enabled) {
							this.plugin.switchProfile(profile.name);
							this.display();
						}
					}));
		})
	}
}
