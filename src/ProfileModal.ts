import { App, Modal, Notice, Setting, SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { SettingsProfile } from "./Settings";

export enum ProfileState {
    EXIST,
    CURRENT,
    NEW
}

interface SettingsProfileSuggestion extends SettingsProfile {
    state: ProfileState;
}

export class ProfileModal extends SuggestModal<SettingsProfileSuggestion> {
    plugin: SettingsProfilesPlugin;
    onSubmit: (result: SettingsProfile, state: ProfileState) => void;

    constructor(app: App, plugin: SettingsProfilesPlugin, onSubmit: (result: SettingsProfile, state: ProfileState) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;

        this.setPlaceholder("Find or create a profile...")

        this.setInstructions([{
            command: "↑↓",
            purpose: "to navigate"
        },
        {
            command: "↵",
            purpose: "to switch"
        },
        {
            command: "esc",
            purpose: "to dismiss"
        }]);

    }

    // Returns all available suggestions.
    getSuggestions(query: string): SettingsProfileSuggestion[] {
        // Get all matching SettingsProfiles
        const profiles = this.plugin.settings.profilesList.filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
        // Expand SettingsProfile to SettingsProfileSuggestion
        const suggestions: SettingsProfileSuggestion[] = [];
        profiles.forEach(profile => {
            suggestions.push({
                ...profile,
                state: profile.name === this.plugin.settings.profile ? ProfileState.CURRENT : ProfileState.EXIST
            });
        });
        // If nothing Matches add createable
        if (suggestions.length <= 0) {
            suggestions.push({
                name: query,
                state: ProfileState.NEW,
                appearance: true,
                app: true,
                bookmarks: true,
                communityPlugins: true,
                corePlugins: true,
                graph: true,
                hotkeys: true,
            })
        }
        return suggestions
    }

    // Renders each suggestion item.
    renderSuggestion(suggestion: SettingsProfileSuggestion, el: HTMLElement) {
        // Create Item
        el.addClass("mod-complex");
        const content = el.createEl("div", { cls: "suggestion-content" });
        content.createEl("div", { cls: "suggestion-title" })
            .createEl("span", { text: suggestion.name })
        // Profile not existing
        if (suggestion.state === ProfileState.NEW) {
            content.parentElement?.createEl("div", { cls: "suggestion-aux" })
                .createEl("span", { text: "Enter to create", cls: "suggestion-hotkey" })
        }
        // Profile is current
        if (suggestion.state === ProfileState.CURRENT) {
            content.parentElement?.createEl("div", { cls: "suggestion-aux" })
                .createEl("span", { text: "Current Profile", cls: "suggestion-hotkey" })
        }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(suggestion: SettingsProfileSuggestion, evt: MouseEvent | KeyboardEvent) {
        // Trim SettingsProfileSuggestion to SettingsProfile
        const { state, ...rest } = suggestion;
        const profile: SettingsProfile = { ...rest };
        // Submit profile
        this.onSubmit(profile, state);
    }
}

export class AddProfileModal extends Modal {
    name: string;
    plugin: SettingsProfilesPlugin;
    onSubmit: (name: string) => void;

    constructor(app: App, plugin: SettingsProfilesPlugin, onSubmit: (name: string) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const {contentEl} = this;
        contentEl.createEl("h2", {text: "Profile Name"});

        new Setting(contentEl)
            .setClass("settings-profiles-modal")
            .addText(text => text
                .setPlaceholder("Default")
                .onChange((value) => {
                    this.name = value;
                }));

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Create Profile")
                .onClick(() => {
                    if (!this.name) {
                        new Notice("Please enter a name!");
                        return;
                    } else if (this.plugin.settings.profilesList.find(value => value.name === this.name)) {
                        new Notice("Profile already exists!");
                        return;
                    }
                    this.onSubmit(this.name);
                    this.close();
                }));
    }
    onClose(): void {
        const {contentEl} = this;
        contentEl.empty();
    }
}

export class ChooseSettingsToSync extends Modal {
    profile: SettingsProfile;
    plugin: SettingsProfilesPlugin;
    onSubmit: (profile: SettingsProfile) => void;

    constructor(app: App, plugin: SettingsProfilesPlugin, profile: SettingsProfile, onSubmit: (profile: SettingsProfile) => void) {
        super(app);
        this.plugin = plugin;
        this.profile = profile;
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const {contentEl} = this;
        contentEl.createEl("h2", {text: "Settings to enable"});
        contentEl.createEl("p", {text: "Choose which settings to enable when switching to this profile. Obsidian will keep the actual settings when switching if they are disabled. Enable allow configure different settings per profile."});

        new Setting(contentEl)
            .setName("Appareance")
            .addToggle(toggle => toggle
                .setValue(this.profile.appearance ?? true)
                .onChange((value) => {
                    this.profile.appearance = value;
                }));


        new Setting(contentEl)
            .setName("App")
            .addToggle(toggle => toggle
                .setValue(this.profile.app ?? true)
                .onChange((value) => {
                    this.profile.app = value;
                }));

        new Setting(contentEl)
            .setName("Bookmarks")
            .addToggle(toggle => toggle
                .setValue(this.profile.bookmarks ?? true)
                .onChange((value) => {
                    this.profile.bookmarks = value;
                }));

        new Setting(contentEl)
            .setName("Community Plugins")
            .setDesc("Sync the plugin community list")
            .addToggle(toggle => toggle
                .setValue(this.profile.communityPlugins ?? true)
                .onChange((value) => {
                    this.profile.communityPlugins = value;
                }));

        new Setting(contentEl)
            .setName("Core Plugins")
            .setDesc("Sync enabled core plugins")
            .addToggle(toggle => toggle
                .setValue(this.profile.corePlugins ?? true)
                .onChange((value) => {
                    this.profile.corePlugins = value;
                }));

        new Setting(contentEl)
            .setName("Graph")
            .setDesc("Sync the graph view settings")
            .addToggle(toggle => toggle
                .setValue(this.profile.graph ?? true)
                .onChange((value) => {
                    this.profile.graph = value;
                }));

        new Setting(contentEl)
            .setName("Hotkeys")
            .addToggle(toggle => toggle
                .setValue(this.profile.hotkeys ?? true)
                .onChange((value) => {
                    this.profile.hotkeys = value;
                }));

        new Setting(contentEl)
            .setName("Submit")
            .addButton(button => button
                .setButtonText("Submit")
                .onClick(() => {
                    this.onSubmit(this.profile);
                    this.close();
                }));
    }
    onClose(): void {
        const {contentEl} = this;
        contentEl.empty();
    }
}