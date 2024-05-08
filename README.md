Allows you to create various global settings profiles. You can sync them between different vaults. To keep all your settings in sync, you'll never have to manually adjust them again for every vault you have or create in the future.

# Demo
![SettingsProfiles-VaultSwitchDemo_v5](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/5c68105f-6613-4ba6-ab6b-c581b4badab7)
The demo shows creating a new profile for an existing vault with a theme set and plugin installed. Then a new vault is created and settings profiles are installed. After installation, the previously created profile will be automatically recognized. This is selected and loads all settings including themes and plugins. The newly created vault will then have the same settings as the existing vault.


# Usage
After enabling the plugin in the settings menu, you need to create a new profile. 

You can do this in the settings tab. Just click on the "Add new Profile". Give it a name and select whitch options should be enabled. To switch between profiles click on "Switch to Profile" obsidian should reload.

# Features
- Multible profile settings
- Easy and fast switch settings
- Global settings

# Plugin Settings 
## Profile save path <!-- ![folder-open](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/3f5dbec0-2cd9-405e-80f2-8282b4b52690) -->
The path to store the global settings profiles. The data for the profiles is stored here. Inside there are folders for each profile there are named like the profile. In order for the profiles to be loaded, this path must point to a folder that contains profiles. This must be configured separately for each vault and device. You can also use a relative path. You must click the Change button for the changes to take effect. This will appear when you change the path.

**Default:** Based on [XDG specification](https://xdgbasedirectoryspecification.com/) ``$XDG_DATA_HOME/ObsidianPlugins/Profiles``
## UI update
This controls whether the UI elements are activated. You must click the Change button for the changes to take effect. This will appear when you change the setting.

**Default:** ```true```
## UI update interval
This controls how often the UI of this plugin should be updated. You must click the Change button for the changes to take effect. This will appear when you change the setting. This could affect Obsidian's performance.

Only visible if [UI update](#UI_update) enabled.

**Min:** ``100ms``
**Max:** ``5000ms``

**Default:** ``1000ms``
## Profile update
This setting controls whether changes in the settings should be monitored. You must click the Change button for the changes to take effect. This will appear when you change the setting.

**Default:** ```true```
## Profile update delay
This setting controls how much time must pass after a change before checking whether the changes affect the profile. If changes relevant to the profile have been made and [Auto-Sync](#Auto-Sync) is enabled, the changes are updated. You must click the Change button for the changes to take effect. This will appear when you change the setting. This could affect Obsidian's performance.

Only visible if [Profile update](#Profile_update) enabled.

**Min:** ``500ms``
**Max:** ``10000ms``

**Default:** ``800ms``
## Profiles ![plus](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/ec66911b-69dc-436a-9860-f9cdde4b27ac) *Button*
Let you create a new profile with the current settings. Pressing on it will open a new window [Profile options](#Profile-options) here you can configure the profile. 
## Profiles ![refresh-cw](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/e3a66b68-d30d-4990-8938-20db7b5e7cdd) *Button*
The [profiles list](#Profiles-list) below will be reloaded from the files.
## Profiles list
As soon as you have created a profile, all profiles stored in the [Profile save path](#Profile-save-path-) will be listed here.
### Profile ![settings](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/88596802-e7b7-4bba-986d-6972758fce99) *Button*
Let you cange the [Profile options](#Profile-options) for the profile. 
### Profile ![trash-2](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/ec7767a9-1b49-4cc1-874e-7ee85aec907f) *Button*
Deletes this profile and all settings. **Attention!** This will delete this profile globally. You can no longer access it in any vault.
<!-- ### Profile ![plus-circle](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/228a9cd7-1904-48d2-9c9c-5c1b5f2691c9) *Button*
Let you attach a hotkey to this profile.
-->
### Profile ![save](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/e2b57e9f-be4f-44b8-b5ba-8783909f72e3) *Button*
Lets you save the current settings to the profile. **Attention!** This will overwrite the current settings in this profile and cannot be undone. Is disabled if the profile settings match the current setting.
### Profile Status ![user-check](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/a6a685c1-3af0-45f5-a53a-f6664abfa637) *Button*
This shows which profile is currently active. Pressing will deselect the current profile.
### Profile Status ![user](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/6aa7fa2e-9ff5-45b7-8865-4de3c459b117) *Button*
Indicates that this profile is not selected. By pressing this button you can switch to this profile. In order for the settings to be adopted, Obsidian must be reloaded.

# Profile options
### Name
Containes the name of the profile.
### Auto-Sync
If activated, changes in the settings are automatically saved as long as the profile is active and [Profile update](#Profile_update) is enabled.
### Apperance
Controls whether the appearance settings should be saved in this profile. This includes CSS snippets and themes.
### App
Controls whether the app settings should be saved in this profile. The app settings includes the "Editor"-tab and "Files and links"-tab.
### Bookmarks
Controls whether the bookmarks should be saved in this profile.
### Community plugins
Controls the community plugins should be saved in this profile. This includes which plugins are activated, the source code and the settings that were made for the plugin.
### Core plugins
Controls wheter the core plugins settings should be saved in this profile.
### Graph
Controls wheter the graph settings should be saved in this profile.
### Hotkeys
Controls wheter the hotkeys settings should be saved in this profile.

# Status-Bar
### Status-Bar ![users](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/d3bee41e-57be-478d-bbf0-a691f165a02e)
Will be displayed if no profile is selected. Clicking on it will open the Profile Switcher.
### Status-Bar ![user-check](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/15e5f1b4-7c36-4dd9-b7a7-340c9884c0ab) 
Will be displayed if profile is selected with no unsaved or unloaded changes to this profile. The name of the current profile is displayed to the right. Clicking on it will open the Profile Switcher.
### Status-Bar ![user-x](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/619530a4-50f6-455d-a0f0-987487881a76)
Will be displayed if profile has unsaved changes. The name of the current profile is displayed to the right. If you click on it, the unsaved settings will be saved.
### Status-Bar ![user-cog](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/711085ae-26c1-445b-8a21-5d3783809b0b)
Will be displayed if profile has unloaded changes. The name of the current profile is displayed to the right. If you click on it, the unloaded settings will be loaded. In order for the settings to be adopted, Obsidian must be reloaded.

# Commands
## Settings profiles: Open profile switcher
To switch to other settings profile or create a new one.
## Settings profiles: Show current profile
Displays the current settings profile.
## Settings profiles: Save current profile
Save the settings of current profile.
## Settings profiles: Reload current profile
Load the settings of current profile from files.
## Settings profiles: Update profile status
Updates the UI elements.

# Admittance
### Access file outside vault
Is requiered to save setting profiles at a global space so they could be accessed from different vaults.

# Contribution
Feel free to contribute.

You can create an [issue](https://github.com/4Source/SettingsProfiles-Obsidian-Plugin/issues) if you found a bug, have an idea to improve this plugin or ask a question. Please make sure beforehand that your issue does not already exist.

Or instead create a [pull request](https://github.com/4Source/SettingsProfiles-Obsidian-Plugin/pulls) to contribute a bug fix or improvement for this plugin.

*Not a developer* but still want to help? You can help with testing. Either you test the current version for possible problems or, if there are currently any, you can also test [pre-releases (alpha/beta)](https://github.com/4Source/settings-profiles-obsidian-plugin/releases). This can be easily accomplished if you install [VARE](https://obsidian.md/plugins?id=vare). Any version of this plugin must be installed. Then simply go to VARE's Settings tab and select the version you want to test from the drop-down menu. You could also add this plugin manually just ![plus](https://github.com/4Source/settings-profiles-obsidian-plugin/assets/38220764/663a0bd6-53f9-4da3-b0ab-33e30eae3029)``Add unlisted plugin`` and enter ``4Source`` and ``settings-profiles-obsidian-plugin``. If you found a bug or unexpected behavior create an [issue](https://github.com/4Source/SettingsProfiles-Obsidian-Plugin/issues) with the version you have tested. Before creating an issue, make sure you know how to reproduce the bug. If there is already an issue for the bug you found that is still open but you have additional information, add it to the issue.

For more info see [CONTRIBUTING](https://github.com/4Source/settings-profiles-obsidian-plugin/blob/master/.github/CONTRIBUTING.md)

# Support
If you want to support me and my work.

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/4Source)
