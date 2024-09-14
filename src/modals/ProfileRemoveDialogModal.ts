import SettingsProfilesPlugin from "src/main";
import { DialogModal } from "./DialogModal";
import { ProfileSettings } from "src/settings/SettingsInterface";
import { Notice } from "obsidian";

export class ProfileRemoveDialogModal extends DialogModal {
	constructor(plugin: SettingsProfilesPlugin, profile: ProfileSettings, handler?: { onSubmit?: () => void, onDeny?: () => void, onRemoved?: () => void }) {
		super(plugin.app, 'Remove profile?', 'You are about to remove the profile. This cannot be undone.', {
			onSubmit: () => {
				if (handler && handler.onSubmit) {
					handler.onSubmit();
				}
				plugin.removeProfile(profile.name)
					.then(() => {
						new Notice('Removed profile successfully');
						if (handler && handler.onRemoved) {
							handler.onRemoved();
						}
					});
			},
			onDeny: () => {
				new Notice('Cancelled remove profile');
				if (handler && handler.onDeny) {
					handler.onDeny();
				}
			},
			onDontShowAgain: () => {
				plugin.setHideProfileRemoveDialog(true);
				plugin.saveSettings();
			},
		}, { submit: "Remove", submitWarning: true, deny: "Cancel", denyWarning: false, dontShowAgain: plugin.getHideProfileRemoveDialog() })
	}
}