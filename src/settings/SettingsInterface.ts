import { homedir } from 'os';
import { join } from 'path';

export interface GlobalSettings {
	profilesList: ProfileSetting[];
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
	profilesList: []
}

export interface VaultSettings {
	profilesPath: string;
	activeProfile?: string;
}

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
	profilesPath: join(homedir(), 'Documents', 'Obsidian', 'Profiles'),
}

export interface ProfileSetting {
	name: string;
	autoSync: boolean;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean; //include core-plugins and core-plugins-migration
	corePlugins: boolean;
	graph: boolean;
	hotkeys: boolean;
}

export const DEFAULT_PROFILE_SETTINGS: ProfileSetting = {
	name: '',
	autoSync: true,
	appearance: true,
	app: true,
	bookmarks: true,
	communityPlugins: true,
	corePlugins: true,
	graph: true,
	hotkeys: true,
}

type ProfileSettingMap = {
	[key in keyof ProfileSetting]: {
		name: string;
		description: string;
		file?: string | string[];
		ignore?: string | string[];
	};
};


export const PROFILE_SETTINGS_MAP: ProfileSettingMap = {
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
	}
}