import { copyFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { FileSystemAdapter, Notice } from "obsidian";
import { dirname, join } from "path";

/**
 * Retruns all files in this direcory. Could be used with placeholder /*\/ for all paths or /* for all files that match the pattern.
 * @param path Path to check for files
 * @returns an array of file names
 */
export function getAllFiles(path: string[]): string[] {
	let pathSections: string[] = [];
	let files: string[] = [];

	// Check path contains path placeholder
	if (join(...path).includes('\\*\\')) {
		pathSections = join(...path).split('\\*\\');

		if (pathSections.length > 0) {
			// Get existing paths for placeholders
			let pathContent = readdirSync(pathSections[0]);

			// Add all combined files
			pathContent.forEach(value => {
				const joinedPath = join(pathSections[0], value, ...pathSections.filter((value, index) => index > 0));
				files = files.concat(getAllFiles([joinedPath]));
			});
		}
	}
	// Check path contains file placeholder
	else if (join(...path).endsWith('\\*')) {
		pathSections = join(...path).split('\\*');

		let pathContent = readdirSync(pathSections[0]).map(value => join(pathSections[0], value));
		files = pathContent.filter((value) => {
			return !statSync(value).isDirectory();
		});
	}
	// Path doesn't exist
	else if (!existsSync(join(...path))) {
		return [];
	}
	// Path is file
	else if (!statSync(join(...path)).isDirectory()) {
		return [];
	}
	return files;
}

/**
 * Returns all subpaths in this directory. Could be used with placeholder /*\/ for all paths that match the pattern. 
 * @param path Path to check for subpaths
 * @returns an array of path names
 */
export function getAllSubPaths(path: string[]): string[] {
	let pathSections: string[] = [];
	let paths: string[] = [];

	// Check path contains placeholder
	if (join(...path).includes('\\*\\')) {
		pathSections = join(...path).split('\\*\\');

		if (pathSections.length > 0) {
			// Get existing paths for placeholder
			let pathContent = readdirSync(pathSections[0]);

			// Add all combined paths
			pathContent.forEach(value => {
				const joinedPath = join(pathSections[0], value, ...pathSections.filter((value, index) => index > 0));
				paths = paths.concat(getAllSubPaths([joinedPath]));
			});
		}
	}
	// Path doesn't exist
	else if (!existsSync(join(...path))) {
		return [];
	}
	// Get subpath in path
	else {
		let pathContent = readdirSync(join(...path)).map(value => join(...path, value));
		paths = pathContent.filter((value) => {
			return statSync(value).isDirectory();
		});
	}
	return paths;
}

/**
 * Compares to files and make them in both direcories equal.
 * @param sourcePath The source file
 * @param targetPath The target file
 */
export function keepNewestFile(sourcePath: string[], targetPath: string[]) {
	const sourceFile = join(...sourcePath);
	const targetFile = join(...targetPath);

	// Keep newest file
	if (existsSync(sourceFile) && (!existsSync(targetFile) || statSync(sourceFile).mtime > statSync(targetFile).mtime)) {
		// Check target path exist
		if (!ensurePathExist([dirname(targetFile)])) {
			return;
		}
		copyFileSync(sourceFile, targetFile);
	}
	else if (existsSync(targetFile)) {
		// Check target path exist
		if (!ensurePathExist([dirname(sourceFile)])) {
			return;
		}
		copyFileSync(targetFile, sourceFile);
	}
}

/**
 * Copies a file from a source path to a target path
 * @param sourcePath The source file
 * @param targetPath The target file
 * @returns Copy was successfull
 */
export function copyFile(sourcePath: string[], targetPath: string[]): boolean {
	const sourceFile = join(...sourcePath);
	const targetFile = join(...targetPath);

	// Check source exist
	if (!existsSync(sourceFile)) {
		return false;
	}
	// Check target path exist
	if (!ensurePathExist(targetPath.slice(0, targetPath.length - 1))) {
		return false;
	}

	copyFileSync(sourceFile, targetFile);
	return true;
}

/**
 * Copy recursive Folder Strucure
 * @param sourcePath The source path to copy the subfolders/files
 * @param targetPath The target path where to copy the subfolders/files to
 */
export function copyFolderRecursiveSync(sourcePath: string[], targetPath: string[]) {
	const source = join(...sourcePath);
	const target = join(...targetPath);

	// Check source is a valid path and exist
	if (!isValidPath([source]) || !existsSync(source)) {
		return false;
	}
	// Check target is a valid path and ensure exist 
	if (!isValidPath([target]) || !ensurePathExist([target])) {
		new Notice(`Failed to copy folder!`);
		return false;
	}

	// Files in source
	const files = readdirSync(source);

	files.forEach(file => {
		const sourceFile = join(source, file);
		const targetFile = join(target, file);

		if (statSync(sourceFile).isDirectory()) {
			// Copy files in subpath
			copyFolderRecursiveSync([sourceFile], [targetFile]);
		} else {
			// Copy file
			copyFileSync(sourceFile, targetFile);
		}
	});

	return true;
}

/**
 * Ensure the path exist if not try to create it.
 * @param path The path to ensure
 * @param recursive [true] Indicates whether parent folders should be created.
 * @returns Returns ``true`` if the path exists, ``false`` if failed to create the path.
 */
export function ensurePathExist(path: string[], recursive = true): boolean {
	// If path not exist create it 
	if (!existsSync(join(...path))) {
		mkdirSync(join(...path), { recursive });
	}
	return existsSync(join(...path));
}

/**
 * Check Path is Valid.
 * @param path Path to Check
 * @returns True if is Valid
 */
export function isValidPath(path: string[]) {
	try {
		// Check is not an empty string
		if (join(...path) === "") {
			return false;
		}
		// accessSync(path, constants.F_OK);
	} catch (err) {
		return false;
	}
	return true;
}

/**
 * Remove recursive Folder Strucure
 * @param path The folder to remove
 */
export function removeDirectoryRecursiveSync(path: string[]) {
	const pathS = join(...path);

	if (existsSync(pathS)) {
		readdirSync(pathS).forEach(file => {
			const filePath = join(pathS, file);

			if (statSync(filePath).isDirectory()) {
				// Recursively remove subdirectories
				removeDirectoryRecursiveSync([filePath]);
			} else {
				// Remove files
				unlinkSync(filePath);
			}
		});

		// Remove the empty directory
		rmdirSync(pathS);
	}
}

/**
 * Get the absolute path of this vault
 * @returns Returns the Absolut path
 */
export function getVaultPath() {
	const adapter = this.app.vault.adapter;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath();
	}
	return "";
}