import { copyFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { FileSystemAdapter, Notice } from "obsidian";
import { dirname, join } from "path";

/**
 * Retruns all files in this direcory. Could be used with placeholder /*\/ for all directorys that match the pattern.
 * @param path Path to check for files
 * @returns an array of file names
 */
export function getAllFiles(path: string[]): string[] {
	let pathSections: string[] = [];
	let files: string[] = [];

	// Check path contains placeholder
	if (join(...path).includes('\\*\\')) {
		pathSections = join(...path).split('\\*\\');

		if (pathSections.length > 0) {
			let pathContent = readdirSync(pathSections[0]);

			pathContent.forEach(value => {
				const joinedPath = join(pathSections[0], value, ...pathSections.filter((value, index) => index > 0));
				files = files.concat(getAllFiles([joinedPath]));
			});
		}
	}
	// Path doesn't exist
	else if (!existsSync(join(...path))) {
		return [];
	}
	// Path is file
	else if (!statSync(join(...path)).isDirectory()) {
		return path;
	}
	// Get files in path
	else {
		let pathContent = readdirSync(join(...path)).map(value => join(...path, value));
		files = pathContent.filter((value) => {
			return !statSync(value).isDirectory();
		});
	}
	return files;
}

/**
 * Compares to files and make them in both direcories equal.
 * @param sourcePath The source file
 * @param targetPath The target file
 */
export function keepNewestFile(sourcePath: string[], targetPath: string[]) {
	const sourceFile = join(...sourcePath);
	const targetFile = join(...targetPath);

	// Check target dir exist
	if (!ensurePathExist([dirname(join(...targetPath))])) {
		return;
	}

	// Keep newest file
	if (existsSync(sourceFile) && (!existsSync(targetFile) || statSync(sourceFile).mtime > statSync(targetFile).mtime)) {
		copyFileSync(sourceFile, targetFile);
	}
	else if (existsSync(targetFile)) {
		copyFileSync(targetFile, sourceFile);
	}
}

/**
 * Copies a file from a source path to a target path
 * @param sourcePath The source path
 * @param targetPath The target path
 * @param fileName The name of the file
 * @param fileNameTarget [fileName] The name of the file at target
 * @returns Copy was successfull
 */
export function copyFile(sourcePath: string[], targetPath: string[], fileName: string, fileNameTarget: string = fileName): boolean {
	const sourceFile = join(...sourcePath, fileName);
	const targetFile = join(...targetPath, fileNameTarget);

	if (!existsSync(sourceFile)) {
		return false;
	}
	if (!ensurePathExist(targetPath)) {
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

	if (!isValidPath([source]) || !isValidPath([target]) || !existsSync(source)) {
		return false;
	}
	if (!ensurePathExist([target])) {
		new Notice(`Failed to copy folder!`);
		return;
	}

	const files = readdirSync(source);

	files.forEach(file => {
		const sourceFile = join(source, file);
		const targetFile = join(target, file);

		if (statSync(sourceFile).isDirectory()) {
			copyFolderRecursiveSync([sourceFile], [targetFile]);
		} else {
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