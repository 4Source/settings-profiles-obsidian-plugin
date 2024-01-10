import { App, Modal, Setting } from "obsidian";
import { PER_PROFILE_SETTINGS_MAP, PerProfileSetting } from "./interface";
import SettingsProfilesPlugin from "./main";

export class ProfileEditModal extends Modal {
	plugin: SettingsProfilesPlugin;
	profile: PerProfileSetting;
	onSubmit: (result: PerProfileSetting) => void;

	constructor(app: App, plugin: SettingsProfilesPlugin, profile: PerProfileSetting, onSubmit: (result: PerProfileSetting) => void) {
		super(app);

		this.plugin = plugin;
		this.profile = structuredClone(profile);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		// Heading for Edit profile
		contentEl.createEl('h1', {text: `Edit ${this.profile.name} profile`});

		// Add All existing options
		for (const key in this.profile) {
			if (this.profile.hasOwnProperty(key)) {
				const value = this.profile[key as keyof PerProfileSetting];

				// Only toggle exclude enabled
				if (typeof value === 'boolean' && key !== 'enabled') {
					new Setting(contentEl)
						.setName(PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].name)
						.setDesc(PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].description)
						.addToggle(toggle => toggle
							.setValue(value)
							.onChange(async (value) => {
								// Assign value of this Setting an save it
								(this.profile[key as keyof PerProfileSetting] as boolean) = value;
							}));
				}
			}
		}

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Save')
				.onClick(() => {
					this.close();
					this.onSubmit(this.profile);
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.setWarning()
				.onClick(() => {
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}