import { App, SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { DEFAULT_PROFILE_SETTINGS, ProfileSetting } from "../interface";

export enum ProfileState {
    EXIST,
    CURRENT,
    NEW
}

interface SettingsProfileSuggestion extends ProfileSetting {
    state: ProfileState;
}

export class ProfileSwitcherModal extends SuggestModal<SettingsProfileSuggestion> {
    plugin: SettingsProfilesPlugin;
    onSubmit: (result: ProfileSetting, state: ProfileState) => void;

    constructor(app: App, plugin: SettingsProfilesPlugin, onSubmit: (result: ProfileSetting, state: ProfileState) => void) {
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
        const profiles = this.plugin.globalSettings.profilesList.filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
        // Expand SettingsProfile to SettingsProfileSuggestion
        const suggestions: SettingsProfileSuggestion[] = [];
        profiles.forEach(profile => {
            suggestions.push({
                ...profile,
                state: this.plugin.isEnabled(profile) ? ProfileState.CURRENT : ProfileState.EXIST
            });
        });
        // If nothing Matches add createable
        if (suggestions.length <= 0) {
            suggestions.push({
                ...DEFAULT_PROFILE_SETTINGS,
                name: query,
                state: ProfileState.NEW
            });
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
                .createEl("span", { text: "Current profile", cls: "suggestion-hotkey" })
        }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(suggestion: SettingsProfileSuggestion, evt: MouseEvent | KeyboardEvent) {
        // Trim SettingsProfileSuggestion to SettingsProfile
        const { state, ...rest } = suggestion;
        const profile: ProfileSetting = { ...rest };
        // Submit profile
        this.onSubmit(profile, state);
    }
}