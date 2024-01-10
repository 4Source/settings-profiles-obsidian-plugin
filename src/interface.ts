import { homedir } from 'os';
import { join } from 'path';

export interface PerProfileSetting {
	name: string;
	enabled: boolean;
	autoSync: boolean;
	appearance: boolean;
	app: boolean;
	bookmarks: boolean;
	communityPlugins: boolean; //include core-plugins and core-plugins-migration
	corePlugins: boolean;
	graph: boolean;
	hotkeys: boolean;
	snippets: boolean;
}

type PerProfileSettingMap = {
	[key in keyof PerProfileSetting]: {
		name: string;
		description: string;
		file?: string | string[];
	};
};

export const PER_PROFILE_SETTINGS_MAP: PerProfileSettingMap = {
	name: {
		name: 'Name',
		description: 'Naming of this Profile.',
	},
	enabled: {
		name: 'Enabled',
		description: 'Says whether this profile is selected.',
	},
	autoSync: {
		name: 'Auto Sync',
		description: 'Auto Sync this profile on startup.',
	},
	appearance: {
		name: 'Appearance',
		description: 'Says whether the obsidian appearance settings will sync.',
		file: 'appearance.json'
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
		file: 'community-plugins.json',
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
	snippets: {
		name: 'CSS snippets',
		description: 'Says whether the CSS snippets will sync.',
	},
}

export const DEFAULT_PROFILE: PerProfileSetting = {
	name: 'Default',
	enabled: true,
	autoSync: true,
	appearance: true,
	app: true,
	bookmarks: true,
	communityPlugins: false,
	corePlugins: true,
	graph: true,
	hotkeys: true,
	snippets: false,
}

export interface Settings {
	profilesPath: string;
	profilesList: PerProfileSetting[]
}

export const DEFAULT_SETTINGS: Settings = {
	profilesPath: join(homedir(), 'Documents', 'Obsidian', 'Profiles'),
	profilesList: [DEFAULT_PROFILE]
}