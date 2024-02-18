import { App, Modal, Notice, Setting } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { ProfileSetting, PROFILE_SETTINGS_MAP } from "../settings/SettingsInterface";

export class ProfileSettingsModal extends Modal {
    plugin: SettingsProfilesPlugin;
    profile: ProfileSetting;
    initialProfile: ProfileSetting;
    onSubmit: (result: ProfileSetting) => void;


    constructor(app: App, plugin: SettingsProfilesPlugin, profile: ProfileSetting, onSubmit: (result: ProfileSetting) => void) {
        super(app);

        this.titleEl.setText('Profile settings');

        this.plugin = plugin;
        this.profile = structuredClone(profile);
        this.initialProfile = structuredClone(profile);
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;

        // Add All existing options
        for (const key in this.profile) {
            if (this.profile.hasOwnProperty(key)) {
                const value = this.profile[key as keyof ProfileSetting];

                // Only toggle exclude enabled
                if (typeof value === 'boolean' && key !== 'enabled') {
                    new Setting(contentEl)
                        .setName(PROFILE_SETTINGS_MAP[key as keyof ProfileSetting].name)
                        .setDesc(PROFILE_SETTINGS_MAP[key as keyof ProfileSetting].description)
                        .addToggle(toggle => toggle
                            .setValue(value)
                            .onChange(async (value) => {
                                // Assign value of this Setting an save it
                                (this.profile[key as keyof ProfileSetting] as boolean) = value;
                            }));
                }
                if (typeof value === 'string') {
                    new Setting(contentEl)
                        .setName(PROFILE_SETTINGS_MAP[key as keyof ProfileSetting].name)
                        .setDesc(PROFILE_SETTINGS_MAP[key as keyof ProfileSetting].description)
                        .addText(text => text
                            .setPlaceholder(PROFILE_SETTINGS_MAP[key as keyof ProfileSetting].name)
                            .setValue(value)
                            .onChange(value => {
                                // Assign value of this Setting an save it
                                (this.profile[key as keyof ProfileSetting] as string) = value;
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
                    } else if (this.initialProfile.name !== this.profile.name && this.plugin.globalSettings.profilesList.find(profile => profile.name === this.profile.name)) {
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