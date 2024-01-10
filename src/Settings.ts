import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import SettingsProfilesPlugin from './main';
import { ProfileSwitcherModal, ProfileState } from './ProfileSwitcherModal';
import { ProfileConfigModal } from './ProfileConfigModal';




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
					new ProfileSwitcherModal(this.app, this.plugin, (result, state) => {
						switch (state) {
							case ProfileState.CURRENT:
								return;
							case ProfileState.NEW:
								// Create new Profile
								this.plugin.createProfile(result.name);
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
