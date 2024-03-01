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
			.setName('UI update')
			.setDesc('Controls UI update, when disabled, fewer file reads/writes are performed')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(() => {
					try {
						// Get text component
						const toggleEl: HTMLInputElement | null = this.containerEl.querySelector('#ui-update');
						if (!toggleEl) {
							throw Error("Input element not found! #ui-update");
						}

						// Backup to possible restore
						const backup = this.plugin.getUiUpdate();
						// Set profiles path to textbox value
						this.plugin.setUiUpdate(toggleEl.hasClass('is-enabled'));

						new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
							// Save Settings
							this.plugin.saveSettings().then(() => {
								// @ts-ignore
								this.app.commands.executeCommandById("app:reload");
							});
						}, () => {
							// Restore old value
							this.plugin.setUiUpdate(backup);
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change ui update! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'ui-update-change', 'style': 'visibility:hidden' }))
			.addToggle(toggle => toggle
				.setValue(this.plugin.getUiUpdate())
				.onChange(value => {
					try {
						const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#ui-update-change');
						if (!buttonEl) {
							throw Error("Button element not found! #ui-update-change");
						}
						// Value is changed 
						if (value !== this.plugin.getUiUpdate()) {
							buttonEl.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							buttonEl.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change ui update! ' + (e as Error).message;
						console.error(e);
					}
				})
				.toggleEl.setAttr('id', 'ui-update'));

		if (this.plugin.getUiUpdate()) {
			new Setting(containerEl)
				.setName('UI update interval')
				.setDesc('The time in ms in which ui is updated')
				.addButton(button => button
					.setButtonText('Change')
					.setWarning()
					.onClick(() => {
						try {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#ui-interval');
							if (!sliderEl) {
								throw Error("Input element not found! #ui-interval");
							}

							// Backup to possible restore
							const backupInterval = this.plugin.getUiRefreshInterval();
							// Set interval to slider value
							this.plugin.setUiRefreshInterval(sliderEl.valueAsNumber);

							new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
								// Save Settings
								this.plugin.saveSettings().then(() => {
									// @ts-ignore
									this.app.commands.executeCommandById("app:reload");
								});
							}, () => {
								// Restore old value
								this.plugin.setUiRefreshInterval(backupInterval);
								this.display();
							}).open();
						} catch (e) {
							(e as Error).message = 'Failed to change profile status update interval! ' + (e as Error).message;
							console.error(e);
						}
					})
					.buttonEl.setAttrs({ 'id': 'ui-interval-change', 'style': 'visibility:hidden' }))
				.addSlider(slider => slider
					.setLimits(100, 5000, 100)
					.setValue(this.plugin.getUiRefreshInterval())
					.setDynamicTooltip()
					.onChange(value => {
						try {
							const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#ui-interval-change');
							if (!buttonEl) {
								throw Error("Button element not found! #ui-interval-change");
							}
							// Value is changed 
							if (value !== this.plugin.getUiRefreshInterval()) {
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
					.sliderEl.setAttr('id', 'ui-interval'))
		}

		new Setting(containerEl)
			.setName('Profile update')
			.setDesc('Controls profile update, when disabled, fewer file reads/writes are performed')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(() => {
					try {
						// Get text component
						const toggleEl: HTMLInputElement | null = this.containerEl.querySelector('#profile-update');
						if (!toggleEl) {
							throw Error("Input element not found! #profile-update");
						}

						// Backup to possible restore
						const backup = this.plugin.getProfileUpdate();
						// Set profiles path to textbox value
						this.plugin.setProfileUpdate(toggleEl.hasClass('is-enabled'));

						new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
							// Save Settings
							this.plugin.saveSettings().then(() => {
								// @ts-ignore
								this.app.commands.executeCommandById("app:reload");
							});
						}, () => {
							// Restore old value
							this.plugin.setProfileUpdate(backup);
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change profile update! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'profile-update-change', 'style': 'visibility:hidden' }))
			.addToggle(toggle => toggle
				.setValue(this.plugin.getProfileUpdate())
				.onChange(value => {
					try {
						const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#profile-update-change');
						if (!buttonEl) {
							throw Error("Button element not found! #profile-update-change");
						}
						// Value is changed 
						if (value !== this.plugin.getProfileUpdate()) {
							buttonEl.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							buttonEl.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profile update! ' + (e as Error).message;
						console.error(e);
					}
				})
				.toggleEl.setAttr('id', 'profile-update'));

		if (this.plugin.getProfileUpdate()) {
			new Setting(containerEl)
				.setName('Profile update delay')
				.setDesc('The time in ms that must pass before the profile can be updated again')
				.addButton(button => button
					.setButtonText('Change')
					.setWarning()
					.onClick(() => {
						try {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#update-delay');
							if (!sliderEl) {
								throw Error("Input element not found! #update-delay");
							}

							// Backup to possible restore
							const backupDelay = this.plugin.getProfileUpdateDelay();
							// Set interval to slider value
							this.plugin.setProfileUpdateDelay(sliderEl.valueAsNumber);

							new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
								// Save Settings
								this.plugin.saveSettings().then(() => {
									// @ts-ignore
									this.app.commands.executeCommandById("app:reload");
								});
							}, () => {
								// Restore old value
								this.plugin.setProfileUpdateDelay(backupDelay);
								this.display();
							}).open();
						} catch (e) {
							(e as Error).message = 'Failed to change profile status update interval! ' + (e as Error).message;
							console.error(e);
						}
					})
					.buttonEl.setAttrs({ 'id': 'update-delay-change', 'style': 'visibility:hidden' }))
				.addSlider(slider => slider
					.setLimits(500, 10000, 250)
					.setValue(this.plugin.getProfileUpdateDelay())
					.setDynamicTooltip()
					.onChange(value => {
						try {
							const buttonEl: HTMLButtonElement | null = this.containerEl.querySelector('#update-delay-change');
							if (!buttonEl) {
								throw Error("Button element not found! #update-delay-change");
							}
							// Value is changed 
							if (value !== this.plugin.getProfileUpdateDelay()) {
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
					.sliderEl.setAttr('id', 'update-delay'))
		}

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
