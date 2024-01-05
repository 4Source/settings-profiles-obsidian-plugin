import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import * as os from 'os';
import * as path from 'path';
import SettingsProfilesPlugin from './main';

export interface Settings {
	ProfilesPath: string;
    AutoSync: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	ProfilesPath: path.join(os.homedir(), 'Documents', 'Obsidian', 'Profiles'),
    AutoSync: true
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
				.setValue(this.plugin.settings.ProfilesPath)
				.onChange(async (value) => {
					// Make a Copy of this previous Setting
					this.plugin.previousSettings.ProfilesPath = structuredClone(this.plugin.settings.ProfilesPath);
					// Assign value of this Setting an save it
					this.plugin.settings.ProfilesPath = value;
					await this.plugin.saveSettings();
				}));
        new Setting(containerEl)
                .setName('Auto Sync')
                .setDesc('If enabled syncronize the profiles on startup.')       
                .addToggle(toggle => toggle 
                    .setValue(this.plugin.settings.AutoSync)
                    .onChange(async (value) => {
                        // Assign value of this Setting an save it
                        this.plugin.settings.AutoSync = value;
                        await this.plugin.saveSettings();
                    }));
        // ToDo Add DropDown Setting to select Activ Profile
        
        this.containerEl.createEl("h2", { text: "Profiles" });
	}
}
