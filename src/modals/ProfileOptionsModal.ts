import { App, Modal, Notice, Setting } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { ProfileOptions, PROFILE_OPTIONS_MAP } from "../settings/SettingsInterface";

export class ProfileOptionsModal extends Modal {
    plugin: SettingsProfilesPlugin;
    profile: ProfileOptions;
    initialProfile: ProfileOptions;
    onSubmit: (result: ProfileOptions) => void;


    constructor(app: App, plugin: SettingsProfilesPlugin, profile: ProfileOptions, onSubmit: (result: ProfileOptions) => void) {
        super(app);

        this.plugin = plugin;
        this.profile = structuredClone(profile);
        this.initialProfile = structuredClone(profile);
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;

        // Heading for Edit profile
        contentEl.createEl('h1', { text: `Profile options` });

        // Add All existing options
        for (const key in this.profile) {
            if (this.profile.hasOwnProperty(key)) {
                const value = this.profile[key as keyof ProfileOptions];

                if (key === 'modifiedAt') {
                    break;
                }
                // Only toggle exclude enabled
                if (typeof value === 'boolean' && key !== 'enabled') {
                    new Setting(contentEl)
                        .setName(PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].name)
                        .setDesc(PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].description)
                        .addToggle(toggle => toggle
                            .setValue(value)
                            .onChange(async (value) => {
                                // Assign value of this Setting an save it
                                (this.profile[key as keyof ProfileOptions] as boolean) = value;
                            }));
                }
                if (typeof value === 'string') {
                    new Setting(contentEl)
                        .setName(PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].name)
                        .setDesc(PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].description)
                        .addText(text => text
                            .setPlaceholder(PROFILE_OPTIONS_MAP[key as keyof ProfileOptions].name)
                            .setValue(value)
                            .onChange(value => {
                                // Assign value of this Setting an save it
                                (this.profile[key as keyof ProfileOptions] as string) = value;
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
                    } else if (this.initialProfile.name !== this.profile.name && this.plugin.getProfilesList().find(profile => profile.name === this.profile.name)) {
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