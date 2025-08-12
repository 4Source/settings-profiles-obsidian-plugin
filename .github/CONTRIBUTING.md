Thank you for taking the time to contribute to this plugin! 

This guide will walk you through the contribution workflow - from [reporting issues](#reporting-issues) and [making changes](#making-changes), to [submitting a pull request](#pull-requests) and [testing the plugin](#testing-the-plugin).

# Getting started
## Reporting Issues
### 1. Check for existing issues
If you encounter a problem, first <a href="../../../issues">search the issue tracker</a> to see if it has already been reported. 
- If an there is an existing issue and you can provide additional information add a comment with your information. 
- If you just want to indicate that you are experiencing the same issue, add a :+1: reaction to the issue.
### 2. Create a new Issue
If not related issue exists, open a new one using the appropriate <a href="../../../issues/new/choose">issue form</a>.

## Working on an Issue
#### 1. Browse <a href="../../../issues">existing issues</a> to find something you'd like to work on.
#### 2. Comment on the issue to let others know you're working on it.
#### 3. Follow the [making changes](#making-changes) guide below.
#### 4. When ready, submit a [pull request](#pull-request).

## Making Changes
### What you need:
- [**Git**](https://git-scm.com/) on your local machine.
- [**Node.js**](https://nodejs.org/en) at least version `18.x`.
- Code editor, such as [Visual Studio Code](https://code.visualstudio.com/)
### Start working:
#### 1. Fork the repository.
#### 2. Create a new vault 
Just for testing the plugin so you **can't** exedentially destroy your real vault
#### 3. Clone repository to your local machine.
```shell
cd path/to/vault
mkdir .obsidian/plugins
cd .obsidian/plugins
git clone <your-fork-url> <plugin-id>
```
#### 4. Install dependencies
```shell
cd <plugin-id>
npm install
```
#### 5. Create a working branch
```shell
git checkout -b <working-branch>
```
#### 6. Compile the source code
The following command keeps running in the terminal and rebuilds the plugin when you modify the source code.
```shell
npm run dev
```
#### 7. Enable the plugin in Obsidian settings
> [!TIP]  
> Install the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin to automatically reload the plugin while developing.

## Committing Your Changes
#### 1. Check the formatting of your code
Before committing the following command will fix most of the formatting issues according to our ESLint configuration.
```shell
npm run lint-fix
```
If you see the following output without any errors the formatting matches the the requirements if any errors remain, fix them manually before proceeding. 
```output
> eslint . --fix --config .eslintrc.release
```
#### 2. Create commit
Than commit your changes with a clear, descriptive commit message.

## Pull Requests
#### 1. Run tests before submitting
```shell
npm run test
```
- Ensure all tests pass.
- If new tests are needed, add them or note what should be tested in your PR.
#### 2. Push your Branch to your fork
#### 3. Open a Pull Request using the provided template
#### 4. Reference any related issues

## Testing the Plugin
*Not a developer* but still want to help? You can help with testing:
- Test the latest <a href="../../../releases">release</a> for problems 
- Test <a href="../../../releases">pre-releases</a>
### How to test
#### 1. Do **not** test in your actual vault - create new vault just for testing
#### 2. Install the version you want to test in the vault
> [!TIP]  
> Install the [VARE](https://obsidian.md/plugins?id=vare) plugin to easily switch versions while testing.
#### 3. If you found a bug or unexpected behavior 
- Checkout [reporting issues](#reporting-issues) 
- Make sure you know how to reproduce the bug
- Mention the version you have tested
- Provide screenshots/videos or your testfiles to make it easier to reproduce 
