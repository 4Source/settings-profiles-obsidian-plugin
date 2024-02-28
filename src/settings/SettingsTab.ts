import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import SettingsProfilesPlugin from '../main';
import { DEFAULT_PROFILE_OPTIONS, DEFAULT_VAULT_SETTINGS } from './SettingsInterface';
import { ProfileOptionsModal } from '../modals/ProfileOptionsModal';
import { DialogModal } from 'src/modals/DialogModal';
import { isAbsolute } from 'path';
import { ICON_ADD_PROFILE, ICON_CURRENT_PROFILE, ICON_NOT_CURRENT_PROFILE, ICON_PROFILE_OPTIONS, ICON_PROFILE_REMOVE, ICON_PROFILE_SAVE, ICON_RELOAD_PROFILES } from 'src/constants';

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

		this.plugin.refreshProfilesList();

		// Path where the Profiles are Saved
		new Setting(containerEl)
			.setName('Profile save path')
			.setDesc('The path to store the profile settings')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(() => {
					try {
						// Get text component
						const inputEl: HTMLInputElement | null = this.containerEl.querySelector('#profile-path');
						if (!inputEl) {
							throw Error("Input element not found! #profile-path");
						}

						// Textbox empty
						if (inputEl.value === '') {
							inputEl.value = DEFAULT_VAULT_SETTINGS.profilesPath;
						}

						// Backup to possible restore
						const backupPath = this.plugin.getProfilesPath();
						// Set profiles path to textbox value
						this.plugin.setProfilePath(inputEl.value);

						new DialogModal(this.app, 'Would you like to change the path to the profiles?', isAbsolute(inputEl.value) ? `Absolut path: ${this.plugin.getAbsolutProfilesPath()}` : `Stores the relative path. Absolut path: ${this.plugin.getAbsolutProfilesPath()} `, () => {
							// Clean up settings
							this.plugin.updateCurrentProfile(undefined);
							this.plugin.setProfilesList([]);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									// Reload the profiles at new path
									this.plugin.refreshProfilesList();
									this.display();
								});
						}, () => {
							// Restore old value
							this.plugin.setProfilePath(backupPath);
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'profile-path-change', 'style': 'visibility:hidden' }))
			.addText(text => text
				.setValue(this.plugin.getProfilesPath())
				.onChange(value => {
					try {
						const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#profile-path-change');
						if (!buttonEl) {
							throw Error("Button element not found! #profile-path-change");
						}
						// Value is changed 
						if (value !== this.plugin.getProfilesPath()) {
							buttonEl.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							buttonEl.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				})
				.inputEl.id = 'profile-path');

		new Setting(containerEl)
			.setName('Profile status update interval')
			.setDesc('The time in ms in which profile changes are checked')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(() => {
					try {
						// Get toggle component
						const toggleEl: HTMLInputElement | null = this.containerEl.querySelector('#refresh-interval-toggle');
						if (!toggleEl) {
							throw Error("Input element not found! #refresh-interval-toggle");
						}

						// Backup to possible restore
						const backupInterval = this.plugin.getRefreshInterval();

						if (toggleEl.hasClass('is-enabled') && this.plugin.getRefreshInterval() < 0) {
							// Set interval to slider value
							this.plugin.setRefreshInterval(DEFAULT_VAULT_SETTINGS.refreshInterval);
						}
						else if (toggleEl.hasClass('is-enabled')) {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#refresh-interval');
							if (!sliderEl) {
								throw Error("Input element not found! #refresh-interval");
							}

							// Set interval to slider value
							this.plugin.setRefreshInterval(sliderEl.valueAsNumber);
						}
						else {
							// Set interval to disabeled value
							this.plugin.setRefreshInterval(-1);
						}

						new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
							// Save Settings
							this.plugin.saveSettings().then(() => {
								// @ts-ignore
								this.app.commands.executeCommandById("app:reload");
							});
						}, () => {
							// Restore old value
							this.plugin.setRefreshInterval(backupInterval);
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change profile status update interval! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'refresh-interval-change', 'style': 'visibility:hidden' }))
			.addSlider(slider => slider
				.setLimits(100, 5000, 100)
				.setValue(this.plugin.getRefreshInterval())
				.setDynamicTooltip()
				.setDisabled(this.plugin.getRefreshInterval() < 0)
				.onChange(value => {
					try {
						const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#refresh-interval-change');
						if (!buttonEl) {
							throw Error("Button element not found! #refresh-interval-change");
						}
						// Value is changed 
						if (value !== this.plugin.getRefreshInterval()) {
							buttonEl.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							buttonEl.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change refresh interval! ' + (e as Error).message;
						console.error(e);
					}
				})
				.sliderEl.setAttr('id', 'refresh-interval'))
			.addToggle(toggle => toggle
				.setTooltip('Enable/Disable interval')
				.setValue(this.plugin.getRefreshInterval() > 0)
				.onChange(value => {
					try {
						let interval;
						if (value) {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#refresh-interval');
							if (!sliderEl) {
								throw Error("Input element not found! #refresh-interval");
							}
							// Set profiles path to textbox value
							interval = sliderEl.valueAsNumber;
						}
						else {
							interval = -1;
						}

						const button: HTMLButtonElement | null = this.containerEl.querySelector('#refresh-interval-change');
						if (!button) {
							throw Error("Button element not found! #refresh-interval-change");
						}
						// Value is changed 
						if (interval !== this.plugin.getRefreshInterval()) {
							button.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							button.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profile status update interval! ' + (e as Error).message;
						console.error(e);
					}
				})
				.toggleEl.setAttr('id', 'refresh-interval-toggle'))


		// Heading for Profiles
		new Setting(containerEl)
			.setHeading()
			.setName('Profiles')
			.addExtraButton(button => button
				.setIcon(ICON_ADD_PROFILE)
				.setTooltip('Add new profile')
				.onClick(() => {
					new ProfileOptionsModal(this.app, this.plugin, DEFAULT_PROFILE_OPTIONS, async (result) => {
						this.plugin.createProfile(result)
							.then(() => {
								this.display();
							});
					}).open();
				}))
			.addExtraButton(button => button
				.setIcon(ICON_RELOAD_PROFILES)
				.setTooltip('Reload profiles')
				.onClick(() => {
					// Reload data from files
					this.plugin.refreshProfilesList();
					this.display();
				}));

		this.plugin.getProfilesList().forEach(profile => {
			new Setting(containerEl.createEl("div", { cls: "profiles-container" }))
				.setName(profile.name)
				.setClass(this.plugin.isEnabled(profile) ? 'profile-enabled' : 'profile-disabled')
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_OPTIONS)
					.setTooltip('Options')
					.onClick(() => {
						this.plugin.refreshProfilesList();
						const prevName = profile.name;
						new ProfileOptionsModal(this.app, this.plugin, profile, async (result) => {
							this.plugin.editProfile(prevName, result)
								.then(() => {
									this.display();
								});
						}).open();
					}))
				// .addExtraButton(button => button
				// 	.setIcon(ICON_PROFILE_ADD_HOTKEY)
				// 	.setTooltip('Hotkeys')
				// 	.onClick(() => {

				// 	}))
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_REMOVE)
					.setTooltip('Remove')
					.onClick(async () => {
						this.plugin.removeProfile(profile.name)
							.then(() => {
								this.display();
							});
					}))
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_SAVE)
					.setTooltip('Save settings to profile')
					.setDisabled(!this.plugin.areSettingsChanged(profile))
					.onClick(() => {
						new DialogModal(this.app, 'Save current settings to profile?', 'You are about to overwrite the current settings of this profile. This cannot be undone.', async () => {
							this.plugin.saveProfileSettings(profile)
								.then(() => {
									new Notice('Saved profile successfully.');
									this.display();
								});
						}, async () => { }, 'Override')
							.open();
					}))
				.addExtraButton(button => button
					.setIcon(this.plugin.isEnabled(profile) ? ICON_CURRENT_PROFILE : ICON_NOT_CURRENT_PROFILE)
					.setTooltip(this.plugin.isEnabled(profile) ? "Deselect profile" : 'Switch to profile')
					.onClick(() => {
						this.plugin.switchProfile(this.plugin.isEnabled(profile) ? "" : profile.name)
							.then(() => {
								this.display();
							});
					}));
		})
	}
}
