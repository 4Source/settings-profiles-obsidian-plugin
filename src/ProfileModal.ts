import { App, SuggestModal } from "obsidian";
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
        let profiles = this.plugin.settings.profilesList.filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
        // Expand SettingsProfile to SettingsProfileSuggestion
        let suggestions: SettingsProfileSuggestion[] = [];
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
                state: ProfileState.NEW
            })
        }
        return suggestions
    }

    // Renders each suggestion item.
    renderSuggestion(suggestion: SettingsProfileSuggestion, el: HTMLElement) {
        // Create Item 
        el.addClass("mod-complex");
        let content = el.createEl("div", { cls: "suggestion-content" });
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
        const { state: state, ...rest } = suggestion;
        const profile: SettingsProfile = { ...rest };
        // Submit profile
        this.onSubmit(profile, state);
    }
}