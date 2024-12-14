import SettingsProfilesPlugin from "src/main";
import { DialogModal } from "./DialogModal";
import { ProfileSettings } from "src/settings/SettingsInterface";
import { Notice } from "obsidian";

export class ProfileSaveBeforeDialogModal extends DialogModal {
	constructor(plugin: SettingsProfilesPlugin, profile: ProfileSettings, handler?: { onSubmit?: () => void, onDeny?: () => void, onSaved?: () => void }) {
		super(plugin.app, 'Do you want to save the profile beforehand?', 'Otherwise, unsaved changes will be lost.', {
			onSubmit: async () => {
				if (handler && handler.onSubmit) {
					handler.onSubmit();
				}
				plugin.saveProfileSettings(profile)
					.then(() => {
						new Notice('Saved profile successfully');
						if (handler && handler.onSaved) {
							handler.onSaved();
						}
					});
			},
			onDeny: () => {
				new Notice('Cancelled save profile');
				if (handler && handler.onDeny) {
					handler.onDeny();
				}
			},
		}, { submit: 'Save', deny: 'Do not Save' })
	}
}