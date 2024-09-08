import SettingsProfilesPlugin from "src/main";
import { DialogModal } from "./DialogModal";
import { ProfileSettings } from "src/settings/SettingsInterface";
import { Notice } from "obsidian";

export class ProfileOverrideDialogModal extends DialogModal {
	constructor(plugin: SettingsProfilesPlugin, profile: ProfileSettings, onSubmit?: () => void, onDeny?: () => void, onSaved?: () => void) {
		super(plugin.app, 'Save current settings to profile?', 'You are about to overwrite the current settings of this profile. This cannot be undone.', () => {
			if (onSubmit) {
				onSubmit();
			}
			plugin.saveProfileSettings(profile)
				.then(() => {
					new Notice('Saved profile successfully');
					if (onSaved) {
						onSaved();
					}
				});
		}, () => {
			new Notice('Canceled override profile');
			if (onDeny) {
				onDeny();
			}
		}, "Override", true, "Cancel", false)
	}
}