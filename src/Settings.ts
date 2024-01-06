import { App, PluginSettingTab, Setting } from 'obsidian';
import * as os from 'os';
import * as path from 'path';
import SettingsProfilesPlugin from './main';

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
}

export const DEFAULT_SETTINGS: Settings = {
    profile: DEFAULT_PROFILE.name,
	profilesPath: path.join(os.homedir(), 'Documents', 'Obsidian', 'Profiles'),
	profilesList: [DEFAULT_PROFILE],
	autoSync: true
}


export class SettingsProfilesSettingTab extends PluginSettingTab {
	plugin: SettingsProfilesPlugin;

	constructor(app: App, plugin: SettingsProfilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        this.containerEl.createEl("h2", { text: "General" });

		new Setting(containerEl)
			.setName('Profile save path')
			.setDesc('The path to store the profile settings')
			.addText(text => text
				.setValue(this.plugin.settings.profilesPath)
				.onChange(async (value) => {
					// Make a Copy of this previous Setting
					this.plugin.previousSettings.profilesPath = structuredClone(this.plugin.settings.profilesPath);
					// Assign value of this Setting an save it
					this.plugin.settings.profilesPath = value;
					await this.plugin.saveSettings();
				}));
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
        
        this.containerEl.createEl("h2", { text: "Profiles" });
	}
}
