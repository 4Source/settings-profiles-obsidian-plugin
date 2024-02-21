import { App, Notice, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import SettingsProfilesPlugin from '../main';
import { DEFAULT_PROFILE_OPTIONS, DEFAULT_VAULT_SETTINGS } from './SettingsInterface';
import { loadProfilesOptions } from '../util/SettingsFiles';
import { ProfileOptionsModal } from '../modals/ProfileOptionsModal';
import { DialogModal } from 'src/modals/DialogModal';
import { isAbsolute } from 'path';
import { ICON_ADD_PROFILE, ICON_CURRENT_PROFILE, ICON_NOT_CURRENT_PROFILE, ICON_PROFILE_OPTIONS, ICON_PROFILE_REMOVE, ICON_RELOAD_PROFILES } from 'src/constants';

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

		this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());

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
						const input: HTMLInputElement | null = this.containerEl.querySelector('#profile-path');
						if (!input) {
							throw Error("Input element not found!");
						}

						// Textbox empty
						if (input.value === '') {
							input.value = DEFAULT_VAULT_SETTINGS.profilesPath;
						}

						// Backup to possible restore
						const backupPath = this.plugin.vaultSettings.profilesPath;
						// Set profiles path to textbox value
						this.plugin.vaultSettings.profilesPath = normalizePath(input.value);

						new DialogModal(this.app, 'Would you like to change the path to the profiles?', isAbsolute(input.value) ? `Absolut path: ${this.plugin.getAbsolutProfilesPath()}` : `Stores the relative path. Absolut path: ${this.plugin.getAbsolutProfilesPath()} `, () => {
							// Clean up settings
							this.plugin.updateCurrentProfile(undefined);
							this.plugin.globalSettings.profilesList = [];

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									// Reload the profiles at new path
									this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());
									this.display();
								});
						}, () => {
							// Restore old value
							this.plugin.vaultSettings.profilesPath = backupPath;
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'profile-path-change', 'style': 'visibility:hidden' }))
			.addText(text => text
				.setValue(this.plugin.vaultSettings.profilesPath)
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.vaultSettings.profilesPath) {
							const button: HTMLButtonElement | null = this.containerEl.querySelector('#profile-path-change');
							if (!button) {
								throw Error("Button element not found!");
							}
							button.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							const button: HTMLButtonElement | null = this.containerEl.querySelector('#profile-path-change');
							if (!button) {
								throw Error("Button element not found!");
							}
							button.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				})
				.inputEl.id = 'profile-path');

		new Setting(containerEl)
			.setName('Refresh intervall')
			.setDesc('The time in ms in which profile changes are checked')
			.addButton(button => button
				.setButtonText('Change')
				.setWarning()
				.onClick(() => {
					try {
						// Get text component
						const input: HTMLInputElement | null = this.containerEl.querySelector('#refresh-intervall');
						if (!input) {
							throw Error("Input element not found!");
						}

						// Backup to possible restore
						const backupIntervall = this.plugin.vaultSettings.refreshIntervall;
						// Set profiles path to textbox value
						this.plugin.vaultSettings.refreshIntervall = input.valueAsNumber;

						new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
							// Save Settings
							this.plugin.saveSettings().then(() => {
								// @ts-ignore
								this.app.commands.executeCommandById("app:reload");
							});
						}, () => {
							// Restore old value
							this.plugin.vaultSettings.refreshIntervall = backupIntervall;
							this.display();
						}).open();
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				})
				.buttonEl.setAttrs({ 'id': 'refresh-intervall-change', 'style': 'visibility:hidden' }))
			.addSlider(slider => slider
				.setLimits(100, 5000, 100)
				.setValue(this.plugin.vaultSettings.refreshIntervall)
				.setDynamicTooltip()
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.vaultSettings.refreshIntervall) {
							const button: HTMLButtonElement | null = this.containerEl.querySelector('#refresh-intervall-change');
							if (!button) {
								throw Error("Button element not found!");
							}
							button.toggleVisibility(true);
						}
						// Value is same as in file
						else {
							const button: HTMLButtonElement | null = this.containerEl.querySelector('#refresh-intervall-change');
							if (!button) {
								throw Error("Button element not found!");
							}
							button.toggleVisibility(false);
						}
					} catch (e) {
						(e as Error).message = 'Failed to change refresh intervall! ' + (e as Error).message;
						console.error(e);
					}
				})
				.sliderEl.setAttr('id', 'refresh-intervall'))

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Save profile')
				.onClick(() => {
					this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());
					const profile = this.plugin.getCurrentProfile();
					if (profile) {
						this.plugin.saveProfileSettings(profile)
							.then(() => {
								new Notice('Saved profile successfully.');
								this.display();
							});
					}
				}))
			.addButton(button => button
				.setButtonText('Load profile')
				.onClick(() => {
					this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());
					const profile = this.plugin.getCurrentProfile();
					if (profile) {
						this.plugin.loadProfileSettings(profile)
							.then((profile) => {
								this.plugin.updateCurrentProfile(profile);
								// Reload obsidian so changed settings can take effect
								new DialogModal(this.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
									// Save Settings
									this.plugin.saveSettings().then(() => {
										// @ts-ignore
										this.app.commands.executeCommandById("app:reload");
									});
								}, () => {
									this.plugin.saveSettings()
										.then(() => {
											this.display();
										});
									new Notice('Need to reload obsidian!', 5000);
								}, 'Reload')
									.open();
							});
					}
				}));


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
					this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());
					this.display();
				}));

		this.plugin.globalSettings.profilesList.forEach(profile => {
			new Setting(containerEl.createEl("div", { cls: "profiles-container" }))
				.setName(profile.name)
				.setClass(this.plugin.isEnabled(profile) ? 'profile-enabled' : 'profile-disabled')
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_OPTIONS)
					.setTooltip('Options')
					.onClick(() => {
						this.plugin.globalSettings.profilesList = loadProfilesOptions(this.plugin.getAbsolutProfilesPath());
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
