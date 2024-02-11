import { App, Notice, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import SettingsProfilesPlugin from './main';
import { ProfileEditModal } from './ProfileEditModal';
import { ProfileAddModal } from './ProfileAddModal';
import { DEFAULT_PROFILE_SETTINGS } from './interface';
import { loadProfileData } from './util/SettingsFiles';
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

		// Path where the Profiles are Saved
		new Setting(containerEl)
			.setName('Profile save path')
			.setDesc('The path to store the profile settings')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(async () => {
					const input: HTMLInputElement | null = this.containerEl.querySelector('#profile-path');
					if (input) {
						await this.plugin.changeProfilePath(normalizePath(input.value));
					}
					const button: HTMLButtonElement | null = this.containerEl.querySelector('#profile-change');
					if (button) {
						button.toggleVisibility(false);
					}
				})
				.buttonEl.setAttrs({ 'id': 'profile-change', 'style': 'visibility:hidden' }))
			.addText(text => text
				.setValue(this.plugin.vaultSettings.profilesPath)
				.onChange(value => {
					if (value !== this.plugin.vaultSettings.profilesPath) {
						const input: HTMLInputElement | null = this.containerEl.querySelector('#profile-path');
						if (input) {
							const button: HTMLButtonElement | null = this.containerEl.querySelector('#profile-change');
							if (button) {
								button.toggleVisibility(true);
							}
						}
					}
					else {
						const button: HTMLButtonElement | null = this.containerEl.querySelector('#profile-change');
						if (button) {
							button.toggleVisibility(false);
						}
					}
				})
				.inputEl.id = 'profile-path')
			;

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Save profile')
				.onClick(() => {
					const profile = this.plugin.getCurrentProfile();
					if (profile)
						this.plugin.saveProfile(profile.name);
				}))
			.addButton(button => button
				.setButtonText('Load profile')
				.onClick(() => {
					const profile = this.plugin.getCurrentProfile();
					if (profile)
						this.plugin.loadProfile(profile.name)
							.then(async () => {
								// Reload obsidian so changed settings can take effect
								// @ts-ignore
								this.app.commands.executeCommandById("app:reload");
							})
							.catch((e) => {
								new Notice(`Failed to load ${profile.name} profile!`);
								(e as Error).message = 'Failed to load profile! ' + (e as Error).message;
								console.error(e);
							});
				}));


		// Heading for Profiles
		new Setting(containerEl)
			.setHeading()
			.setName('Profiles')
			.addExtraButton(button => button
				.setIcon('plus')
				.setTooltip('Add new profile')
				.onClick(() => {
					new ProfileAddModal(this.app, this.plugin, DEFAULT_PROFILE_SETTINGS, (result) => {
						this.plugin.createProfile(result);
						this.display();
					}).open();
				}))
			.addExtraButton(button => button
				.setIcon('refresh-cw')
				.setTooltip('Reload profiles')
				.onClick(() => {
					// Reload data from files
					this.plugin.globalSettings.profilesList = loadProfileData(this.plugin.vaultSettings.profilesPath);
					this.display();
				}));

		this.plugin.globalSettings.profilesList.forEach(profile => {
			new Setting(containerEl.createEl("div", { cls: "profiles-container" }))
				.setName(profile.name)
				.setClass(this.plugin.isEnabled(profile) ? 'profile-enabled' : 'profile-disabled')
				.addExtraButton(button => button
					.setIcon('settings')
					.setTooltip('Options')
					.onClick(() => {
						new ProfileEditModal(this.app, this.plugin, profile, (result) => {
							this.plugin.editProfile(result.name, result);
							this.display();
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
					.setIcon(this.plugin.isEnabled(profile) ? 'check' : 'download')
					.setTooltip(this.plugin.isEnabled(profile) ? "" : 'Switch to profile')
					.setDisabled(this.plugin.isEnabled(profile))
					.onClick(async () => {
						if (!this.plugin.isEnabled(profile)) {
							this.plugin.switchProfile(profile.name)
								.then(() => {
									this.display();
								});
						}
					}));
		})
	}
}
