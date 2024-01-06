import { App, SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { SettingsProfile } from "./Settings";



export class ProfileSwitcherModal extends SuggestModal<SettingsProfile> {
    plugin: SettingsProfilesPlugin;
    onSubmit: (result: SettingsProfile) => void;

	constructor(app: App, plugin: SettingsProfilesPlugin, onSubmit: (result: SettingsProfile) => void) {
		super(app);
		this.plugin = plugin;
        this.onSubmit = onSubmit;
	}

    // Returns all available suggestions.
    getSuggestions(query: string): SettingsProfile[] {
        return this.plugin.settings.profilesList.filter((profile) =>
            profile.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Renders each suggestion item.
    renderSuggestion(profile: SettingsProfile, el: HTMLElement) {
        el.createEl("div", { text: profile.name });
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(profile: SettingsProfile, evt: MouseEvent | KeyboardEvent) {
        this.onSubmit(profile);
    }
}