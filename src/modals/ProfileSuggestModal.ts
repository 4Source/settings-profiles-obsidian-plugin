import { SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { ProfileSettings } from "../settings/SettingsInterface";

export class ProfileSuggestModal extends SuggestModal<ProfileSettings> {
    plugin: SettingsProfilesPlugin;
	onSubmit: (result: ProfileSettings) => void;

    constructor(plugin: SettingsProfilesPlugin, placeholder: string, onSubmit: (result: ProfileSettings) => void) {
        super(plugin.app);
        this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.inputEl.placeholder = placeholder;
    }

    // Returns all available suggestions.
    getSuggestions(query: string): ProfileSettings[] {
        // Get all matching SettingsProfiles
        const profiles = this.plugin.getProfilesList().filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
        // Expand SettingsProfile to SettingsProfileSuggestion
        const suggestions: ProfileSettings[] = [];
        // Attach profiles to suggestions
        profiles.forEach(profile => {
            suggestions.push({
                ...profile,
            });
        });
        return suggestions;
    }

    // Renders each suggestion item.
    renderSuggestion(suggestion: ProfileSettings, el: HTMLElement) {
		el.createEl("div", { text: suggestion.name });
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(suggestion: ProfileSettings, evt: MouseEvent | KeyboardEvent) {
        this.onSubmit(suggestion);
    }
}