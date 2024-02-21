# Welcome to Settings profiles contributing guide
Thank you for investing your time in contributing to this plugin! 

In this guide you will get an overview of the contribution workflow from opening an issue, creating a pull request, and testing the plugin.

## Getting started
### Issues
#### Create a new issue
If you spot a problem with the plugin, [search if an issue already exists](https://github.com/4Source/settings-profiles-obsidian-plugin/issues). If a related issue doesn't exist, you can open a new issue using a relevant [issue form](https://github.com/4Source/settings-profiles-obsidian-plugin/issues/new/choose).

#### Solve an issue
Scan through the [existing issues](https://github.com/4Source/settings-profiles-obsidian-plugin/issues) to find one that interests you. If you find an issue to work on, you are welcome to [open a PR](#pull-request) with a fix.

### Make changes 
1. Fork the repository.
2. Install [**Git**](https://git-scm.com/) on your local machine.
3. Install or update [**Node.js**](https://nodejs.org/en) version  at least `18.x`. 
4. You will need a code editor, such as [Visual Studio Code](https://code.visualstudio.com/)
5. Clone repository to your local machine.
    - Create a new vault 
    - ``cd path/to/vault``
    - ``mkdir .obsidian/plugins``
    - ``cd .obsidian/plugins``
    - ``git clone https://github.com/4Source/settings-profiles-obsidian-plugin.git settings-profiles``
6. Install dependencies
    - ``cd settings-profiles``
    - ``npm install``
7. Create a working branch and start with your changes!
    - ``git branch <working-branch> master``
    - ``git checkout <working-branch>``
8. Compile the source code. The following command keeps running in the terminal and rebuilds the plugin when you modify the source code.
    - ``npm run dev``
9. Enable the plugin in Obsidian settings
> [!Hot reloading]  
> Install the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin to automatically reload your plugin while developing.

### Commit your update
Commit the changes once you are happy with them. 

### Pull Request
When you're finished with the changes, push them to your fork and create a pull request. Make sure you fill the pull request template. 

### Test plugin
**Not a developer** but still want to help? You can help with testing. Either you test the current version for possible problems or, if there are currently any, you can also test [pre-releases](https://github.com/4Source/settings-profiles-obsidian-plugin/releases). To do this, you need to install the BRAT plugin, then select “Add Beta plugin with forzen version” under the Beta plugin list. Put in the URL ``https://github.com/4Source/settings-profiles-obsidian-plugin`` and the name of the version you want to test. If you found a bug or unexpected behavior create an [issue](#create-a-new-issue) with the current version you have tested. Before creating an issue, make sure you know how to reproduce the bug. If there is already an issue for the bug you found that is still open but you have additional information, add it to the issue.