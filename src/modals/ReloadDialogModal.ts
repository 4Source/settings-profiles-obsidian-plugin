import { Notice } from "obsidian";
import { DialogModal } from "./DialogModal";
import SettingsProfilesPlugin from "src/main";

export class ReloadDialogModal extends DialogModal {
	constructor(plugin: SettingsProfilesPlugin, handler?: { onSubmit?: () => void, onDeny?: () => void }) {
		super(plugin.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', {
			onSubmit: () => {
				if (handler && handler.onSubmit) {
					handler.onSubmit();
				}
				// @ts-ignore
				this.app.commands.executeCommandById("app:reload");
			},
			onDeny: () => {
				new Notice('Need to reload obsidian!');
				if (handler && handler.onDeny) {
					handler.onDeny();
				}
			},
			onDontShowAgain: () => {
				plugin.setHideReloadDialog(true);
				plugin.saveSettings();
			}
		}, { submit: 'Reload', dontShowAgain: plugin.getHideReloadDialog() });
	}
}