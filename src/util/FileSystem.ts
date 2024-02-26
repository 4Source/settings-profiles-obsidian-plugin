import { copyFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { FileSystemAdapter } from "obsidian";
import { dirname, join, normalize, sep } from "path";

/**
 * Retruns all files in this direcory. Could be used with placeholder /*\/ for all paths or /* for all files that match the pattern.
 * @param path Path to check for files
 * @returns an array of file names
 */
export function getAllFiles(path: string[]): string[] {
	let pathSections: string[] = [];
	let files: string[] = [];

	try {
		// Check path contains path placeholder
		if (join(...path).includes(`${sep}*${sep}`)) {
			pathSections = join(...path).split(`${sep}*${sep}`);

			if (pathSections.length > 0 && existsSync(pathSections[0])) {
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
		else if (join(...path).endsWith(`${sep}*`)) {
			pathSections = join(...path).split(`${sep}*`);

			if (pathSections.length > 0 && existsSync(pathSections[0])) {
				let pathContent = readdirSync(pathSections[0]).map(value => join(pathSections[0], value));
				files = files.concat(...pathContent.filter((value) => {
					return statSync(value).isFile();
				}));
			}
		}
		// Path is file
		else if (existsSync(join(...path)) && statSync(join(...path)).isFile()) {
			files.push(...path);
		}
		return files;
	} catch (e) {
		throw e;
	}
}

/**
 * Returns all subpaths in this directory. Could be used with placeholder /*\/ for all paths that match the pattern. 
 * @param path Path to check for subpaths
 * @returns an array of path names
 */
export function getAllSubPaths(path: string[]): string[] {
	let pathSections: string[] = [];
	let paths: string[] = [];

	try {
		// Check path contains placeholder
		if (join(...path).includes(`${sep}*${sep}`)) {
			pathSections = join(...path).split(`${sep}*${sep}`);

			if (pathSections.length > 0 && existsSync(pathSections[0])) {
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
	} catch (e) {
		throw e;
	}
}

/**
 * Compares to files and make them in both direcories equal.
 * @param sourcePath The source file
 * @param targetPath The target file
 */
export function keepNewestFile(sourcePath: string[], targetPath: string[]) {
	try {
		const sourceFile = join(...sourcePath);
		const targetFile = join(...targetPath);

		// Keep newest file
		if (existsSync(sourceFile) && (!existsSync(targetFile) || statSync(sourceFile).mtime > statSync(targetFile).mtime)) {
			// Check target path exist
			ensurePathExist([dirname(targetFile)])
			copyFileSync(sourceFile, targetFile);
		}
		else if (existsSync(targetFile)) {
			// Check target path exist
			ensurePathExist([dirname(sourceFile)])
			copyFileSync(targetFile, sourceFile);
		}
	} catch (e) {
		throw e;
	}
}

/**
 * Copies a file from a source path to a target path
 * @param sourcePath The source file
 * @param targetPath The target file
 * @returns Copy was successfull
 */
export function copyFile(sourcePath: string[], targetPath: string[]) {
	try {
		const sourceFile = normalize(join(...sourcePath));
		const targetFile = normalize(join(...targetPath));

		// Check source exist
		if (!isValidPath([sourceFile]) || !existsSync(sourceFile)) {
			throw Error(`Source file does not exist! SourceFile: ${sourceFile}`);
		}
		// Check target path exist
		isValidPath([...targetPath])
		ensurePathExist([targetFile.slice(0, targetFile.lastIndexOf(sep))]);

		copyFileSync(sourceFile, targetFile);
	} catch (e) {
		throw e;
	}
}

/**
 * Copy recursive Folder Strucure
 * @param sourcePath The source path to copy the subfolders/files
 * @param targetPath The target path where to copy the subfolders/files to
 */
export function copyFolderRecursiveSync(sourcePath: string[], targetPath: string[]) {
	try {
		const source = join(...sourcePath);
		const target = join(...targetPath);

		// Check source is a valid path and exist
		if (!isValidPath([source]) || !existsSync(source)) {
			throw Error(`Source path does not exist! SourcePath: ${source}`);
		}
		// Check target is a valid path and ensure exist 
		isValidPath([target])
		ensurePathExist([target])

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
	} catch (e) {
		throw e;
	}
}

/**
 * Ensure the path exist if not try to create it.
 * @param path The path to ensure
 * @param recursive [true] Indicates whether parent folders should be created.
 * @returns Returns ``true`` if the path exists, ``false`` if failed to create the path.
 */
export function ensurePathExist(path: string[], recursive = true) {
	try {
		// If path not exist create it 
		if (!existsSync(join(...path))) {
			mkdirSync(join(...path), { recursive });
			if (!existsSync(join(...path))) {
				throw Error(`Could not create path! Path: ${path}`);
			}
		}
	} catch (e) {
		throw e;
	}
}

/**
 * Check Path is Valid.
 * @param path Path to Check
 * @returns True if is Valid
 */
export function isValidPath(path: string[]) {
	// Check is not an empty string
	if (join(...path) === "") {
		return false;
	}
	// accessSync(path, constants.F_OK);

	return true;
}

/**
 * Remove recursive Folder Strucure
 * @param path The folder to remove
 */
export function removeDirectoryRecursiveSync(path: string[]) {
	try {
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
	} catch (e) {
		throw e;
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

	return '';
}