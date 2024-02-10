import { App, Modal, Notice, Setting } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { PerProfileSetting, PER_PROFILE_SETTINGS_MAP } from "./interface";

export class ProfileSettingsModal extends Modal {
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
        contentEl.createEl('h1', { text: `Profile settings` });

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
                if (typeof value === 'string') {
                    new Setting(contentEl)
                        .setName(PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].name)
                        .setDesc(PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].description)
                        .addText(text => text
                            .setPlaceholder(PER_PROFILE_SETTINGS_MAP[key as keyof PerProfileSetting].name)
                            .setValue(value)
                            .onChange(value => {
                                // Assign value of this Setting an save it
                                (this.profile[key as keyof PerProfileSetting] as string) = value;
                            }));
                }
            }
        }

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Save')
                .onClick(() => {
                    if (this.profile.name === "" || this.profile.name === undefined) {
                        new Notice("Profile name cannot be empty!");
                    } else if (this.plugin.settings.profilesList.find(profile => profile.name === this.profile.name)) {
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