import { homedir } from 'os';
import { join } from 'path';

export interface GlobalSettings {
	profilesList: ProfileOptions[];
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
	profilesList: []
}

export interface VaultSettings {
	profilesPath: string;
	activeProfile: Partial<ProfileOptions>;
}

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
	profilesPath: join(homedir(), 'Documents', 'Obsidian', 'Profiles'),
	activeProfile: {}
}

export interface ProfileOptions {
	name: string;
	autoSync: boolean;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean;
	communityPluginsAdvanced: {}
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
	communityPluginsAdvanced: {},
	corePlugins: true,
	graph: true,
	hotkeys: true,
	modifiedAt: new Date(),
}

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
		name: 'Auto Sync',
		description: 'Auto Sync this profile on startup.',
	},
	appearance: {
		name: 'Appearance',
		description: 'Says whether the obsidian appearance settings will sync.',
		file: ['appearance.json', 'snippets/*', 'themes/*/*'],
	},
	app: {
		name: 'App',
		description: 'Says whether the obsidian app settings will sync.',
		file: 'app.json'
	},
	bookmarks: {
		name: 'Bookmarks',
		description: 'Says whether the obsidian bookmarks will sync.',
		file: 'bookmarks.json'
	},
	communityPlugins: {
		name: 'Community Plugins',
		description: 'Says whether the community plugins and there settings will sync.',
		file: ['community-plugins.json', 'plugins/*/*'],
		ignore: 'plugins/settings-profiles/data.json'
	},
	communityPluginsAdvanced: {
		name: 'Community Plugins Advanced',
		description: 'Advanced settings for the community plugins.',
		advanced: 'communityPlugins'
	},
	corePlugins: {
		name: 'Core Plugins',
		description: 'Says whether the obsidian core plugin settings will sync.',
		file: ['core-plugins.json', 'core-plugins-migration.json']
	},
	graph: {
		name: 'Graph',
		description: 'Says whether the obsidian graph settings will sync.',
		file: 'graph.json'
	},
	hotkeys: {
		name: 'Hotkeys',
		description: 'Says whether the obsidian hotkey settings will sync.',
		file: 'hotkeys.json'
	},
	modifiedAt: {
		name: 'Modified at',
		description: 'Date time of last modification.'
	}
}