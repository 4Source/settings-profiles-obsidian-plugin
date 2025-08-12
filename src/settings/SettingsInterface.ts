import { join, normalize, sep as slash } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xdg = require('@folder/xdg');

export interface GlobalSettings {
	profilesList: ProfileOptions[];
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
	profilesList: [],
};

export type Device = Record<string, string>;

export type StatusbarClickAction = 'auto' | 'load' | 'switch' | 'save' | 'none';
export const STATUSBAR_CLICK_ACTIONS: Record<StatusbarClickAction, string> = {
	'auto': 'Auto',
	'load': 'Load',
	'switch': 'Switch',
	'save': 'Save',
	'none': 'Disabled',
};

export interface VaultSettings {

	/** @deprecated since v0.6.0 now stored in devices with unique ID*/
	profilesPath?: string;
	activeProfile: Partial<ProfileOptions>;
	profileUpdate: boolean;
	profileUpdateDelay: number;
	uiUpdate: boolean;
	uiUpdateInterval: number;
	devices: Device;
	statusbarInteraction: {
		click: StatusbarClickAction,
		ctrl_click: StatusbarClickAction,
		shift_click: StatusbarClickAction,
		alt_click: StatusbarClickAction,
	}
}

export const DEFAULT_PROFILE_PATH = normalize(join(xdg({ subdir: 'ObsidianPlugins' }).data, 'Profiles'));

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
	activeProfile: {},
	profileUpdate: true,
	profileUpdateDelay: 800,
	uiUpdate: true,
	uiUpdateInterval: 1000,
	devices: {},
	statusbarInteraction: {
		click: 'auto',
		ctrl_click: 'none',
		shift_click: 'none',
		alt_click: 'none',
	},
};

export interface ProfileOptions {
	name: string;
	autoSync: boolean;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean;

	// communityPluginsAdvanced: {}
	corePlugins: boolean;
	graph: boolean;
	hotkeys: boolean;
	modifiedAt: Date;
}

export const DEFAULT_PROFILE_OPTIONS: ProfileOptions = {
	name: '',
	autoSync: true,
	appearance: true,
	app: true,
	bookmarks: true,
	communityPlugins: true,

	// communityPluginsAdvanced: {},
	corePlugins: true,
	graph: true,
	hotkeys: true,
	modifiedAt: new Date(),
};

type ProfileOptionsMap = {
	[key in keyof ProfileOptions]: {

		// Display name of the setting
		name: string;

		// Description text of the setting
		description: string;

		// The setting this is the Advanced option.
		advanced?: keyof ProfileOptions;

		// Files/Paths there get synced with this option.
		file?: string | string[];

		// Files/Paths there are ignored for sync
		ignore?: string | string[];
	};
};

export const PROFILE_OPTIONS_MAP: ProfileOptionsMap = {
	name: {
		name: 'Name',
		description: 'Name of this profile.',
	},
	autoSync: {
		name: 'Auto-Sync',
		description: 'Auto Sync this profile on startup.',
	},
	appearance: {
		name: 'Appearance',
		description: 'Says whether the obsidian appearance settings will sync.',
		file: ['appearance.json', `snippets${slash}*`, `themes${slash}*${slash}*`],
	},
	app: {
		name: 'App',
		description: 'Says whether the obsidian app settings will sync.',
		file: 'app.json',
	},
	bookmarks: {
		name: 'Bookmarks',
		description: 'Says whether the obsidian bookmarks will sync.',
		file: 'bookmarks.json',
	},
	communityPlugins: {
		name: 'Community plugins',
		description: 'Says whether the community plugins and there settings will sync.',
		file: ['community-plugins.json', `plugins${slash}*${slash}*`],
		ignore: `plugins${slash}settings-profiles${slash}data.json`,
	},

	/*
	 * communityPluginsAdvanced: {
	 * 	name: 'Community plugins advanced',
	 * 	description: 'Advanced settings for the community plugins.',
	 * 	advanced: 'communityPlugins'
	 * },
	 */
	corePlugins: {
		name: 'Core plugins',
		description: 'Says whether the obsidian core plugin settings will sync.',
		file: ['core-plugins.json', 'core-plugins-migration.json', 'backlink.json', 'canvas.json', 'command-palette.json', 'daily-notes.json', 'file-recovery.json', 'note-composer.json', 'page-preview.json', 'switcher.json', 'templates.json', 'workspace.json', 'workspaces.json', 'zk-prefixer.json'],
	},
	graph: {
		name: 'Graph',
		description: 'Says whether the obsidian graph settings will sync.',
		file: 'graph.json',
	},
	hotkeys: {
		name: 'Hotkeys',
		description: 'Says whether the obsidian hotkey settings will sync.',
		file: 'hotkeys.json',
	},
	modifiedAt: {
		name: 'Modified at',
		description: 'Date time of last modification.',
	},
};
