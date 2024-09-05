import { App, SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { DEFAULT_PROFILE_SETTINGS, ProfileSettings } from "../settings/SettingsInterface";
import { ProfileSettingsModal } from "./ProfileSettingsModal";

enum ProfileState {
    EXIST,
    CURRENT,
    NEW,
    NEW_OPTIONS,
}

interface ProfileSettingsSuggestion extends ProfileSettings {
    state: ProfileState;
}

export class ProfileSwitcherModal extends SuggestModal<ProfileSettingsSuggestion> {
    plugin: SettingsProfilesPlugin;

    constructor(app: App, plugin: SettingsProfilesPlugin) {
        super(app);
        this.plugin = plugin;

        // Register key combination shift + enter
        this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
            // @ts-ignore
            if (!evt.isComposing && this.chooser.useSelectedItem(evt)) {
                return false;
            }
        });

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
            command: "shift ↵",
            purpose: "to create with settings"
        },
        {
            command: "esc",
            purpose: "to dismiss"
        }]);

    }

    // Returns all available suggestions.
    getSuggestions(query: string): ProfileSettingsSuggestion[] {
        // Get all matching SettingsProfiles
        const profiles = this.plugin.getProfilesList().filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
        // Expand SettingsProfile to SettingsProfileSuggestion
        const suggestions: ProfileSettingsSuggestion[] = [];
        // Attach query string to suggestion
        if (profiles.every((value) => value.name.toLowerCase() !== query.toLowerCase()) && query.length > 0) {
            suggestions.push({
                ...DEFAULT_PROFILE_SETTINGS,
                name: query,
                state: ProfileState.NEW
            });
        }
        // Attach profiles to suggestions
        profiles.forEach(profile => {
            suggestions.push({
                ...profile,
                state: this.plugin.isEnabled(profile) ? ProfileState.CURRENT : ProfileState.EXIST
            });
        });
        return suggestions;
    }

    // Renders each suggestion item.
    renderSuggestion(suggestion: ProfileSettingsSuggestion, el: HTMLElement) {
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
                .createEl("span", { text: "Current profile", cls: "suggestion-hotkey" })
        }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(suggestion: ProfileSettingsSuggestion, evt: MouseEvent | KeyboardEvent) {
        // Trim SettingsProfileSuggestion to SettingsProfile
        let { state, ...rest } = suggestion;
        const profile: ProfileSettings = { ...rest };

        if (evt.shiftKey && state !== ProfileState.EXIST && state !== ProfileState.CURRENT) {
            state = ProfileState.NEW_OPTIONS;
        }

        // Handle choice depending on state
        switch (state) {
            case ProfileState.NEW:
                // Create new Profile
                this.plugin.createProfile(profile).then(() => {
                    this.plugin.switchProfile(profile.name);
                });
                break;
            case ProfileState.NEW_OPTIONS:
                new ProfileSettingsModal(this.plugin, profile, async (result) => {
                    this.plugin.createProfile(result)
                        .then(() => {
                            this.plugin.switchProfile(result.name);
                        });
                }).open();
                break;
            case ProfileState.EXIST:
                this.plugin.switchProfile(profile.name);
                break;
        }
        this.close()
    }
}