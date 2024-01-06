import { App, SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { SettingsProfile } from "./Settings";

interface SettingsProfileSuggestion extends SettingsProfile {
    exist: boolean;
}

export class ProfileModal extends SuggestModal<SettingsProfileSuggestion> {
    plugin: SettingsProfilesPlugin;
    onSubmit: (result: SettingsProfile) => void;

	constructor(app: App, plugin: SettingsProfilesPlugin, onSubmit: (result: SettingsProfile) => void) {
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
                exist: true
            });
        });
        // If nothing Matches add createable
        if(suggestions.length <= 0) {
            suggestions.push({
                name: query,
                exist: false
            })
        }
        return suggestions
    }

    // Renders each suggestion item.
    renderSuggestion(suggestion: SettingsProfileSuggestion, el: HTMLElement) {
        // Create Item 
        el.addClass("mod-complex");
        let content = el.createEl("div", {cls: "suggestion-content"});
        content.createEl("div", {cls: "suggestion-title"})
        .createEl("span", {text: suggestion.name})
        // Profile not existing 
        if(!suggestion.exist) {
            content.parentElement?.createEl("div", {cls: "suggestion-aux"})
            .createEl("span", {text: "Enter to create", cls: "suggestion-hotkey"})
        }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(suggestion: SettingsProfileSuggestion, evt: MouseEvent | KeyboardEvent) {
        // Trim SettingsProfileSuggestion to SettingsProfile
        const {exist, ...rest} = suggestion;
        const profile: SettingsProfile = {...rest};
        // Submit profile
        this.onSubmit(profile);
    }
}