import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import SettingsProfilesPlugin from './main';
import { ProfileConfigModal } from './ProfileConfigModal';
import { AddNewProfileSettings } from './addNewProfileConfig';
import { DEFAULT_PROFILE } from './interface';


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

		new Setting(containerEl)
				.addButton(button => button
					.setButtonText('Sync Profile')
					.onClick(() => {
						this.plugin.syncSettings(this.plugin.getCurrentProfile().name);
					}));

		// Heading for Profiles
		new Setting(containerEl)
			.setHeading()
			.setName('Profiles')
			.addExtraButton(button => button
				.setIcon('plus')
				.setTooltip('Add new profile')
				.onClick(() => {
					const newProfile = structuredClone(DEFAULT_PROFILE);
					console.log(newProfile);
					new AddNewProfileSettings(this.plugin, newProfile, (result) => {
						this.plugin.createProfile(result);
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
				.setClass(this.plugin.isEnabledOrDefault(profile) ? 'profile-enabled' : 'profile-disabled')
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
					.setIcon(this.plugin.isEnabledOrDefault(profile) ? 'check' : 'download')
					.setTooltip(this.plugin.isEnabledOrDefault(profile) ? "" : 'Switch to Profile')
					.setDisabled(this.plugin.isEnabledOrDefault(profile))
					.onClick(async () => {
						if (!profile.enabled) {
							this.plugin.switchProfile(profile.name);
							this.display();
						}
					}));
		})
	}
}
