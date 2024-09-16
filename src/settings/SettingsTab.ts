import { App, PluginSettingTab, Setting, debounce } from 'obsidian';
import SettingsProfilesPlugin from '../main';
import { DEFAULT_PROFILE_SETTINGS, DEFAULT_VAULT_SETTINGS } from './SettingsInterface';
import { ProfileSettingsModal } from '../modals/ProfileSettingsModal';
import { ICON_ADD_PROFILE, ICON_CURRENT_PROFILE, ICON_NOT_CURRENT_PROFILE, ICON_PROFILE_SETTINGS, ICON_PROFILE_REMOVE, ICON_PROFILE_SAVE, ICON_RELOAD_PROFILES, ICON_RESET, ICON_PROFILE_DEFAULT, ICON_PROFILE_DEFAULT_SELECTED } from 'src/constants';
import { isValidPath } from 'src/util/FileSystem';
import { ProfileSaveDialogModal } from 'src/modals/ProfileSaveDialogModal';
import { ProfileRemoveDialogModal } from 'src/modals/ProfileRemoveDialogModal';

export class SettingsProfilesSettingTab extends PluginSettingTab {
	plugin: SettingsProfilesPlugin;

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
			.addExtraButton(button => button
				.setIcon(ICON_RESET)
				.setTooltip('Reset')
				.onClick(() => {
					try {
						// Get text component
						const inputEl: HTMLInputElement | null = this.containerEl.querySelector('#profile-path');
						if (!inputEl) {
							throw Error("Input element not found! #profile-path");
						}

						inputEl.value = DEFAULT_VAULT_SETTINGS.profilesPath;

						if (DEFAULT_VAULT_SETTINGS.profilesPath === this.plugin.getProfilesPath()) {
							this.display();
							return;
						}

						// Set profiles path to textbox value
						this.plugin.setProfilePath(inputEl.value);

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
					} catch (e) {
						(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
						console.error(e);
					}
				}))
			.addText(text => text
				.setValue(this.plugin.getProfilesPath())
				.onChange(value => {
					debounce((value: string) => {
						try {
							// Value is changed 
							if (value !== this.plugin.getProfilesPath()) {
								// Textbox empty
								if (value === '') {
									throw Error('Text box is empty!');
								}

								// Validate entry is path
								if (!isValidPath([value])) {
									throw Error('Entry is not a valid path!');
								}

								// Set profiles path to textbox value
								this.plugin.setProfilePath(value);

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
							}
						} catch (e) {
							(e as Error).message = 'Failed to change profiles path! ' + (e as Error).message;
							console.error(e);
						}
					}, 2000, true).call(this, value);
				})
				.inputEl.id = 'profile-path');

		new Setting(containerEl)
			.setName('UI update')
			.setDesc(createFragment((fragment) => {
				fragment.append(fragment.createEl('div', { text: 'Controls UI update, when disabled, fewer file reads are performed. The status bar icon is deactivated.' }), fragment.createEl('div', { text: 'Requieres reload for changes to take effect!', cls: 'mod-warning' }))
			}))
			.addToggle(toggle => toggle
				.setValue(this.plugin.getUiUpdate())
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.getUiUpdate()) {
							// Set ui update to value
							this.plugin.setUiUpdate(value);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
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
				.setDesc(createFragment((fragment) => {
					fragment.append(fragment.createEl('div', { text: 'The time in ms in which ui is updated' }), fragment.createEl('div', { text: 'Requieres reload for changes to take effect!', cls: 'mod-warning' }))
				}))
				.addExtraButton(button => button
					.setIcon(ICON_RESET)
					.setTooltip('Reset')
					.onClick(() => {
						try {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#ui-interval');
							if (!sliderEl) {
								throw Error("Input element not found! #ui-interval");
							}

							sliderEl.valueAsNumber = DEFAULT_VAULT_SETTINGS.uiUpdateInterval;

							// Set interval to slider value
							this.plugin.setUiRefreshInterval(sliderEl.valueAsNumber);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
						} catch (e) {
							(e as Error).message = 'Failed to reset ui update interval! ' + (e as Error).message;
							console.error(e);
						}
					}))
				.addSlider(slider => slider
					.setLimits(100, 5000, 100)
					.setValue(this.plugin.getUiRefreshInterval())
					.setDynamicTooltip()
					.onChange(value => {
						debounce((value: number) => {
							try {
								// Value is changed 
								if (value !== this.plugin.getUiRefreshInterval()) {
									// Set interval to slider value
									this.plugin.setUiRefreshInterval(value);

									// Save settins
									this.plugin.saveSettings()
										.then(() => {
											this.display();
										});
								}
							} catch (e) {
								(e as Error).message = 'Failed to change ui update interval! ' + (e as Error).message;
								console.error(e);
							}
						}, 500, true).call(this, value);
					})
					.sliderEl.setAttr('id', 'ui-interval'))
		}

		new Setting(containerEl)
			.setName('Profile update')
			.setDesc(createFragment((fragment) => {
				fragment.append(fragment.createEl('div', { text: 'Controls profile update, when disabled, fewer file reads/writes are performed. Changed settings are not saved automatically.' }), fragment.createEl('div', { text: 'Requieres reload for changes to take effect!', cls: 'mod-warning' }))
			}))
			.addToggle(toggle => toggle
				.setValue(this.plugin.getProfileUpdate())
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.getProfileUpdate()) {
							// Set profile update to value
							this.plugin.setProfileUpdate(value);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
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
				.setDesc(createFragment((fragment) => {
					fragment.append(fragment.createEl('div', { text: 'The time in ms that must pass before the profile can be updated again' }), fragment.createEl('div', { text: 'Requieres reload for changes to take effect!', cls: 'mod-warning' }))
				}))
				.addExtraButton(button => button
					.setIcon(ICON_RESET)
					.setTooltip('Reset')
					.onClick(() => {
						try {
							// Get slider component
							const sliderEl: HTMLInputElement | null = this.containerEl.querySelector('#update-delay');
							if (!sliderEl) {
								throw Error("Input element not found! #update-delay");
							}

							sliderEl.valueAsNumber = DEFAULT_VAULT_SETTINGS.profileUpdateDelay;

							// Set interval to slider value
							this.plugin.setProfileUpdateDelay(sliderEl.valueAsNumber);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
						} catch (e) {
							(e as Error).message = 'Failed to reset profile update interval! ' + (e as Error).message;
							console.error(e);
						}
					}))
				.addSlider(slider => slider
					.setLimits(100, 5000, 100)
					.setValue(this.plugin.getProfileUpdateDelay())
					.setDynamicTooltip()
					.onChange(value => {
						debounce((value: number) => {
							try {
								// Value is changed 
								if (value !== this.plugin.getProfileUpdateDelay()) {
									// Set interval to slider value
									this.plugin.setProfileUpdateDelay(value);

									// Save settins
									this.plugin.saveSettings()
										.then(() => {
											this.display();
										});
								}
							} catch (e) {
								(e as Error).message = 'Failed to change profile update interval! ' + (e as Error).message;
								console.error(e);
							}
						}, 500, true).call(this, value);
					})
					.sliderEl.setAttr('id', 'update-delay'))
		}

		new Setting(containerEl)
			.setName('Profile save dialog')
			.setDesc('Hides the dialog message if enabeled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.getHideProfileSaveDialog())
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.getHideProfileSaveDialog()) {
							this.plugin.setHideProfileSaveDialog(value);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profile save dialog! ' + (e as Error).message;
						console.error(e);
					}
				}));

		new Setting(containerEl)
			.setName('Profile remove dialog')
			.setDesc('Hides the dialog message if enabeled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.getHideProfileRemoveDialog())
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.getHideProfileRemoveDialog()) {
							this.plugin.setHideProfileRemoveDialog(value);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
						}
					} catch (e) {
						(e as Error).message = 'Failed to change profile remove dialog! ' + (e as Error).message;
						console.error(e);
					}
				}));

		new Setting(containerEl)
			.setName('Reload dialog')
			.setDesc('Hides the dialog message if enabeled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.getHideReloadDialog())
				.onChange(value => {
					try {
						// Value is changed 
						if (value !== this.plugin.getHideReloadDialog()) {
							this.plugin.setHideReloadDialog(value);

							// Save settins
							this.plugin.saveSettings()
								.then(() => {
									this.display();
								});
						}
					} catch (e) {
						(e as Error).message = 'Failed to change reload dialog! ' + (e as Error).message;
						console.error(e);
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
					new ProfileSettingsModal(this.plugin, DEFAULT_PROFILE_SETTINGS, async (result) => {
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
					.setIcon(ICON_PROFILE_SETTINGS)
					.setTooltip('Profile settings')
					.onClick(() => {
						this.plugin.refreshProfilesList();
						const prevName = profile.name;
						new ProfileSettingsModal(this.plugin, profile, async (result) => {
							this.plugin.editProfile(prevName, result)
								.then(() => {
									this.display();
								});
						}).open();
					}))
				.addExtraButton(button => button
					.setIcon(this.plugin.getDefaultProfile()?.name === profile.name ? ICON_PROFILE_DEFAULT_SELECTED : ICON_PROFILE_DEFAULT)
					.setTooltip(this.plugin.getDefaultProfile()?.name === profile.name ? 'Unselect profile as default' : 'Select profile as default')
					.onClick(() => {
						if (this.plugin.getDefaultProfile()?.name !== profile.name) {
							this.plugin.setDefaultProfile(profile);
						}
						else {
							this.plugin.setDefaultProfile(undefined);
						}

						// Save settins
						this.plugin.saveSettings()
							.then(() => {
								this.display();
							});
					})
				)
				// .addExtraButton(button => button
				// 	.setIcon(ICON_PROFILE_ADD_HOTKEY)
				// 	.setTooltip('Hotkeys')
				// 	.onClick(() => {

				// 	}))
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_REMOVE)
					.setTooltip('Remove')
					.onClick(async () => {
						new ProfileRemoveDialogModal(this.plugin, profile, {
							onRemoved: () => {
								this.display();
							}
						}).open();
					}))
				.addExtraButton(button => button
					.setIcon(ICON_PROFILE_SAVE)
					.setTooltip('Save settings to profile')
					// .setDisabled(!this.plugin.areSettingsChanged(profile) || this.plugin.areSettingsSaved(profile))
					.onClick(() => {
						new ProfileSaveDialogModal(this.plugin, profile, {
							onSaved: () => {
								this.display();
							}
						}).open();
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
