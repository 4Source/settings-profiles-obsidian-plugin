import { App, SuggestModal } from 'obsidian';
import SettingsProfilesPlugin from '../main';
import { DEFAULT_PROFILE_OPTIONS, ProfileOptions } from '../settings/SettingsInterface';
import { ProfileOptionsModal } from './ProfileOptionsModal';

enum ProfileState {
	EXIST,
	CURRENT,
	NEW,
	NEW_OPTIONS,
}

interface SettingsProfileSuggestion extends ProfileOptions {
	state: ProfileState;
}

export class ProfileSwitcherModal extends SuggestModal<SettingsProfileSuggestion> {
	plugin: SettingsProfilesPlugin;

	constructor(app: App, plugin: SettingsProfilesPlugin) {
		super(app);
		this.plugin = plugin;

		// Register key combination shift + enter
		this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
			if (!evt.isComposing && this.chooser.useSelectedItem(evt)) {
				return false;
			}
		});

		this.setPlaceholder('Find or create a profile...');

		this.setInstructions([{
			command: '↑↓',
			purpose: 'to navigate',
		},
		{
			command: '↵',
			purpose: 'to switch',
		},
		{
			command: 'shift ↵',
			purpose: 'to create with options',
		},
		{
			command: 'esc',
			purpose: 'to dismiss',
		}]);
	}

	// Returns all available suggestions.
	getSuggestions(query: string): SettingsProfileSuggestion[] {
	// Get all matching SettingsProfiles
		const profiles = this.plugin.getProfilesList().filter((profile) => profile.name.toLowerCase().includes(query.toLowerCase())
		);

		// Expand SettingsProfile to SettingsProfileSuggestion
		const suggestions: SettingsProfileSuggestion[] = [];

		// Attach query string to suggestion
		if (profiles.every((value) => value.name.toLowerCase() !== query.toLowerCase()) && query.length > 0) {
			suggestions.push({
				...DEFAULT_PROFILE_OPTIONS,
				name: query,
				state: ProfileState.NEW,
			});
		}

		// Attach profiles to suggestions
		profiles.forEach(profile => {
			suggestions.push({
				...profile,
				state: this.plugin.isEnabled(profile) ? ProfileState.CURRENT : ProfileState.EXIST,
			});
		});
		return suggestions;
	}

	// Renders each suggestion item.
	renderSuggestion(suggestion: SettingsProfileSuggestion, el: HTMLElement) {
	// Create Item
		el.addClass('mod-complex');
		const content = el.createEl('div', { cls: 'suggestion-content' });
		content.createEl('div', { cls: 'suggestion-title' })
			.createEl('span', { text: suggestion.name });

		// Profile not existing
		if (suggestion.state === ProfileState.NEW) {
			content.parentElement?.createEl('div', { cls: 'suggestion-aux' })
				.createEl('span', { text: 'Enter to create', cls: 'suggestion-hotkey' });
		}

		// Profile is current
		if (suggestion.state === ProfileState.CURRENT) {
			content.parentElement?.createEl('div', { cls: 'suggestion-aux' })
				.createEl('span', { text: 'Current profile', cls: 'suggestion-hotkey' });
		}
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(suggestion: SettingsProfileSuggestion, evt: MouseEvent | KeyboardEvent) {
	// Trim SettingsProfileSuggestion to SettingsProfile
		const { state, ...rest } = suggestion;
		const profile: ProfileOptions = { ...rest };

		let chosenState = state;
		if (evt.shiftKey && state !== ProfileState.EXIST && state !== ProfileState.CURRENT) {
			chosenState = ProfileState.NEW_OPTIONS;
		}

		// Handle choice depending on chosenState
		switch (chosenState) {
			case ProfileState.NEW:
				// Create new Profile
				this.plugin.createProfile(profile).then(() => {
					this.plugin.switchProfile(profile.name);
				});
				break;
			case ProfileState.NEW_OPTIONS:
				new ProfileOptionsModal(this.app, this.plugin, profile, async (result) => {
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
		this.close();
	}
}