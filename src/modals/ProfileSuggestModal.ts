import { SuggestModal } from "obsidian";
import SettingsProfilesPlugin from "../main";
import { ProfileSettings } from "../settings/SettingsInterface";

enum ProfileState {
	EXIST,
	CURRENT,
}

interface ProfileSettingsSuggestion extends ProfileSettings {
	state: ProfileState;
}

export class ProfileSuggestModal extends SuggestModal<ProfileSettingsSuggestion> {
	plugin: SettingsProfilesPlugin;
	onSubmit: (result: ProfileSettings) => void;

	constructor(plugin: SettingsProfilesPlugin, placeholder: string, onSubmit: (result: ProfileSettings) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.inputEl.placeholder = placeholder;
	}

	// Returns all available suggestions.
	getSuggestions(query: string): ProfileSettingsSuggestion[] {
		// Get all matching SettingsProfiles
		const profiles = this.plugin.getProfilesList().filter((profile) =>
			profile.name.toLowerCase().includes(query.toLowerCase())
		);
		// Expand SettingsProfile to SettingsProfileSuggestion
		const suggestions: ProfileSettingsSuggestion[] = [];
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
		// Profile is current
		if (suggestion.state === ProfileState.CURRENT) {
			content.parentElement?.createEl("div", { cls: "suggestion-aux" })
				.createEl("span", { text: "Current profile", cls: "suggestion-hotkey" })
		}
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(suggestion: ProfileSettingsSuggestion, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(suggestion as ProfileSettings);
	}
}