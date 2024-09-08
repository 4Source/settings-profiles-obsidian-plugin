import { Command, Notice } from "obsidian";
import SettingsProfilesPlugin from "./main";
import { ProfileSwitcherModal } from "./modals/ProfileSwitcherModal";
import { DialogModal } from "./modals/DialogModal";
import { ProfileOptionsFuzzySuggestModal } from "./modals/ProfileOptionsFuzzySuggestModal";
import { DEFAULT_PROFILE_SETTINGS, NONE_PROFILE_OPTIONS, ProfileOptions, ProfileSettings } from "./settings/SettingsInterface";
import { ProfileSuggestModal } from "./modals/ProfileSuggestModal";
import { ProfileOverrideDialogModal } from "./modals/ProfileOverrideDialogModal";

export function registerCommands(plugin: SettingsProfilesPlugin) {
	const commands: Command[] = [
		{
			id: "open-profile-switcher",
			name: "Open profile switcher",
			callback: () => {
				// Open new profile switcher modal to switch or create a new profile
				new ProfileSwitcherModal(plugin.app, plugin).open();
			}
		},
		{
			id: "current-profile",
			name: "Show current profile",
			callback: () => {
				new Notice(`Current profile: ${plugin.getCurrentProfile()?.name}`);
			}
		},
		{
			id: "save-current-profile",
			name: "Save current profile",
			callback: () => {
				plugin.refreshProfilesList();
				const profile = plugin.getCurrentProfile();
				if (profile) {
					plugin.saveProfileSettings(profile)
						.then(() => {
							new Notice('Saved profile successfully.');
						})
						.catch((e) => {
							new Notice('Failed to save profile!');
							(e as Error).message = `Failed to handle command! CommandId: save-current-profile Profile: ${profile}` + (e as Error).message;
							console.error(e);
						});
				}
			}
		},
		{
			id: "save-current-profile-partially",
			name: "Save current profile partially",
			callback: () => {
				plugin.refreshProfilesList();
				const profile: ProfileSettings = { ...DEFAULT_PROFILE_SETTINGS, ...plugin.getCurrentProfile(), ...NONE_PROFILE_OPTIONS };
				if (profile) {
					new ProfileOptionsFuzzySuggestModal(plugin.app, "Select which option to save...", (result: (keyof ProfileOptions)[]) => {
						result.forEach(key => {
							(profile[key as keyof ProfileSettings] as boolean) = true;
						});
						plugin.saveProfileSettings(profile)
							.then(() => {
								new Notice('Saved profile successfully.');
							})
							.catch((e) => {
								new Notice('Failed to save profile!');
								(e as Error).message = `Failed to handle command! CommandId: save-current-profile Profile: ${profile}` + (e as Error).message;
								console.error(e);
							});
					}).open();
				}
			}
		},
		{
			id: "save-to-profile-partially",
			name: "Save to profile partially",
			callback: () => {
				new ProfileSuggestModal(plugin, "Select profile to save to...", (result: ProfileSettings) => {
					const profile: ProfileSettings = { ...DEFAULT_PROFILE_SETTINGS, ...result, ...NONE_PROFILE_OPTIONS };
					profile.name = plugin.getCurrentProfile()?.name || "";
					if (profile) {
						new ProfileOptionsFuzzySuggestModal(plugin.app, "Select which option to save...", (result: (keyof ProfileOptions)[]) => {
							result.forEach(key => {
								(profile[key as keyof ProfileSettings] as boolean) = true;
							});
							plugin.saveProfileSettings(profile)
								.then(() => {
									new Notice('Saved profile successfully.');
								})
								.catch((e) => {
									new Notice('Failed to save profile!');
									(e as Error).message = `Failed to handle command! CommandId: save-current-profile Profile: ${profile}` + (e as Error).message;
									console.error(e);
								});
						}).open();
					}
				}).open();
			}
		},
		{
			id: "save-to-profile",
			name: "Save to profile",
			callback: () => {
				new ProfileSuggestModal(plugin, "Select profile to save to...", (result: ProfileSettings) => {
					const profile: ProfileSettings = plugin.getProfile(result.name);
					if (profile) {
						new ProfileOverrideDialogModal(plugin, profile).open();
					}
				}).open();
			}
		},
		{
			id: "reload-current-profile",
			name: "Reload current profile",
			callback: () => {
				plugin.refreshProfilesList();
				const profile = plugin.getCurrentProfile();
				if (profile) {
					plugin.loadProfileSettings(profile)
						.then((profile) => {
							plugin.updateCurrentProfile(profile);
							// Reload obsidian so changed settings can take effect
							new DialogModal(plugin.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
								// Save Settings
								plugin.saveSettings().then(() => {
									// @ts-ignore
									plugin.app.commands.executeCommandById("app:reload");
								});
							}, () => {
								new Notice('Need to reload obsidian!', 5000);
							}, 'Reload')
								.open();
						});

				}
			}
		},
		{
			id: "load-from-profile-partially",
			name: "Load from profile partially",
			callback: () => {
				new ProfileSuggestModal(plugin, "Select the profile to load from...", (result: ProfileSettings) => {
					const profile: ProfileSettings = { ...DEFAULT_PROFILE_SETTINGS, ...result, ...NONE_PROFILE_OPTIONS };
					if (profile) {
						new ProfileOptionsFuzzySuggestModal(plugin.app, "Select which option to load...", (result: (keyof ProfileOptions)[]) => {
							plugin.loadPartiallyProfileSettings(profile, result)
								.then((profile) => {
									// Reload obsidian so changed settings can take effect
									new DialogModal(plugin.app, 'Reload Obsidian now?', 'This is required for changes to take effect.', () => {
										// Save Settings
										plugin.saveSettings().then(() => {
											// @ts-ignore
											plugin.app.commands.executeCommandById("app:reload");
										});
									}, () => {
										new Notice('Need to reload obsidian!', 5000);
									}, 'Reload')
										.open();
								});
						}).open();
					}
				}).open();
			}
		},
		{
			id: "update-profile-status",
			name: "Update profile status",
			callback: () => {
				plugin.updateUI();
			}
		}
	];

	commands.forEach(command => {
		plugin.addCommand(command);
	});
}