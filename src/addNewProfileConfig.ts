import { Modal, Notice, Setting } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { PerProfileSetting, ProfileSettings, SETTINGS_PROFILE_MAP } from "./interface";

export class AddNewProfileSettings extends Modal {
	plugin: SettingsProfilesPlugin;
	settings: ProfileSettings;
	profile: PerProfileSetting;
	onSubmit: (result: PerProfileSetting) => void;

	constructor(plugin: SettingsProfilesPlugin, profile: PerProfileSetting, onSubmit: (result: PerProfileSetting) => void) {
		super(plugin.app);

		this.plugin = plugin;
		this.settings = plugin.settings;
		this.profile = profile;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		// Heading for General Settings
		new Setting(contentEl)
			.setHeading()
			.setName("Add new Profile")
			.setDesc("Create a new profile based on the current profile.");

		new Setting(contentEl)
			.setName(SETTINGS_PROFILE_MAP.name.name)
			.setDesc(SETTINGS_PROFILE_MAP.name.description)
			.addText(text => text
				.setPlaceholder("New Profile")
				.onChange(value => {
					this.profile.name = value;
				}));
		new Setting(contentEl)
			.setName(SETTINGS_PROFILE_MAP.autoSync.name)
			.setDesc(SETTINGS_PROFILE_MAP.autoSync.description)
			.addToggle(toggle => toggle
				.setValue(this.profile.autoSync)
				.onChange(async (value) => {
					this.profile.autoSync = value;
				}));

		new Setting(contentEl)
			.setName(SETTINGS_PROFILE_MAP.snippets.name)
			.setDesc(SETTINGS_PROFILE_MAP.snippets.description)
			.addToggle(toggle => toggle
				.setValue(this.profile.snippets)
				.onChange(async (value) => {
					this.profile.snippets = value;
				}));

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Save')
				.onClick(() => {
					if (this.profile.name === "" || this.profile.name === undefined) {
						new Notice("Profile name cannot be empty!");
					} else if (this.settings.profilesList.find(profile => profile.name === this.profile.name)) {
						new Notice("Profile with this name already exists!");
					} else {
						this.onSubmit(this.profile);
						this.close();
					}
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.setWarning()
				.onClick(() => {
					this.close();
				}));
	}
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}


}