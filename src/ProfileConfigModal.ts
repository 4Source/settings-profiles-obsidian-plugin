import { App, Modal, Setting } from "obsidian";
import { SETTINGS_PROFILE_MAP, PerProfileSetting } from "./interface";

export class ProfileConfigModal extends Modal {
	profile: PerProfileSetting;
	onSubmit: (result: PerProfileSetting) => void;

	constructor(app: App, profile: PerProfileSetting, onSubmit: (result: PerProfileSetting) => void) {
		super(app);

		this.profile = profile;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		// Heading for General Settings
		new Setting(contentEl)
			.setHeading()
			.setName("Edit " + this.profile.name + " profile");

		for (const key in this.profile) {
			if (this.profile.hasOwnProperty(key)) {
				const value = this.profile[key as keyof PerProfileSetting];

				if (typeof value === 'boolean' && key !== 'enabled') {
					new Setting(contentEl)
						.setName(SETTINGS_PROFILE_MAP[key as keyof PerProfileSetting].name)
						.setDesc(SETTINGS_PROFILE_MAP[key as keyof PerProfileSetting].description)
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