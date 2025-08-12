import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, rmSync, rmdirSync, statSync, unlinkSync } from 'fs';
import { FileSystemAdapter } from 'obsidian';
import { basename, dirname, join, normalize, sep as slash } from 'path';
import { PassThrough, Readable } from 'stream';

/**
 * Retruns all files in this direcory. Could be used with placeholder /*\/ for all paths or /* for all files that match the pattern.
 * @param path Path to check for files
 * @returns an array of file names
 */
export function getAllFiles(path: string[]): string[] {
	let pathSections: string[] = [];
	let files: string[] = [];

	// Check path contains path placeholder
	if (join(...path).includes(`${slash}*${slash}`)) {
		pathSections = join(...path).split(`${slash}*${slash}`);

		if (pathSections.length > 0) {
			if (!existsSync(pathSections[0])) {
				console.debug(`The path section does not exist! PathSections: ${pathSections[0]}`);
				return files;
			}
			if (!statSync(pathSections[0]).isDirectory()) {
				console.debug(`The path section is a file and is not inserted, does not match the pattern (/*/)! PathSections: ${pathSections[0]}`);
				return files;
			}

			// Get existing paths for placeholders
			const pathContent = readdirSync(pathSections[0]);

			// Add all combined files
			pathContent.forEach(value => {
				const joinedPath = join(pathSections[0], value, ...pathSections.filter((value, index) => index > 0));
				files = files.concat(getAllFiles([joinedPath]));
			});
		}
	}

	// Check path contains file placeholder
	else if (join(...path).endsWith(`${slash}*`)) {
		pathSections = join(...path).split(`${slash}*`);

		if (pathSections.length > 0) {
			if (!existsSync(pathSections[0])) {
				console.debug(`The path section does not exist! PathSections: ${pathSections[0]}`);
				return files;
			}
			if (!statSync(pathSections[0]).isDirectory()) {
				console.debug(`The path section is a file and is not inserted, does not match the pattern (/*)! PathSections: ${pathSections[0]}`);
				return files;
			}
			const pathContent = readdirSync(pathSections[0]).map(value => join(pathSections[0], value));
			files = files.concat(...pathContent.filter((value) => {
				return statSync(value).isFile() && !FILE_IGNORE_LIST.contains(basename(value));
			}));
		}
	}

	// Path is file
	else if (existsSync(join(...path)) && statSync(join(...path)).isFile()) {
		if (!FILE_IGNORE_LIST.contains(basename(join(...path)))) {
			files.push(...path);
		}
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
	if (join(...path).includes(`${slash}*${slash}`)) {
		pathSections = join(...path).split(`${slash}*${slash}`);

		if (pathSections.length > 0) {
			if (!existsSync(pathSections[0])) {
				console.debug(`The path section does not exist! PathSections: ${pathSections[0]}`);
				return paths;
			}
			if (!statSync(pathSections[0]).isDirectory()) {
				console.debug(`The path section is a file and is not inserted, does not match the pattern (/*/)! PathSections: ${pathSections[0]}`);
				return paths;
			}

			// Get existing paths for placeholder
			const pathContent = readdirSync(pathSections[0]);

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
		const pathContent = readdirSync(join(...path)).map(value => join(...path, value));
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
		ensurePathExist([dirname(targetFile)]);
		copyFileSync(sourceFile, targetFile);
	}
	else if (existsSync(targetFile)) {
		// Check target path exist
		ensurePathExist([dirname(sourceFile)]);
		copyFileSync(targetFile, sourceFile);
	}
}

/**
 * Copies a file from a source path to a target path
 * @param sourcePath The source file
 * @param targetPath The target file
 * @returns Copy was successfull
 */
export function copyFile(sourcePath: string[], targetPath: string[]) {
	const sourceFile = normalize(join(...sourcePath));
	const targetFile = normalize(join(...targetPath));

	// Check source exist
	if (!isValidPath([sourceFile]) || !existsSync(sourceFile)) {
		throw Error(`Source file does not exist! SourceFile: ${sourceFile}`);
	}

	// Check target path exist
	isValidPath([...targetPath]);
	ensurePathExist([targetFile.slice(0, targetFile.lastIndexOf(slash))]);

	// Check source is on ignore list
	if (FILE_IGNORE_LIST.contains(basename(sourceFile))) {
		console.warn(`An attempt was made to copy a file that is on the ignore list. File: ${sourceFile}`);
		return;
	}

	// Copy file
	copyFileSync(sourceFile, targetFile);
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
		throw Error(`Source path does not exist! Path: ${source}`);
	}
	if (!statSync(source).isDirectory()) {
		throw Error(`Source path is not a path! Path: ${source}`);
	}

	// Check target is a valid path and ensure exist
	if (!isValidPath([target])) {
		throw Error(`Target path is not a vaild path! Path: ${target}`);
	}
	ensurePathExist([target]);
	if (!statSync(target).isDirectory()) {
		throw Error(`Target path is not a path! Path: ${source}`);
	}

	// Files in source
	const files = readdirSync(source);

	files.forEach(file => {
		const sourceFile = join(source, file);
		const targetFile = join(target, file);

		if (statSync(sourceFile).isDirectory()) {
			// Copy files in subpath
			copyFolderRecursiveSync([sourceFile], [targetFile]);
		}
		else {
			// Check source is on ignore list
			if (FILE_IGNORE_LIST.contains(basename(sourceFile))) {
				console.warn(`An attempt was made to copy a file that is on the ignore list. File: ${sourceFile}`);
				return;
			}

			// Copy file
			copyFileSync(sourceFile, targetFile);
		}
	});
}

/**
 * Ensure the path exist if not try to create it.
 * @param path The path to ensure
 * @param recursive [true] Indicates whether parent folders should be created.
 * @returns Returns ``true`` if the path exists, ``false`` if failed to create the path.
 */
export function ensurePathExist(path: string[], recursive = true) {
	// If path not exist create it
	if (!existsSync(join(...path))) {
		mkdirSync(join(...path), { recursive });
		if (!existsSync(join(...path))) {
			throw Error(`Could not create path! Path: ${path}`);
		}
	}
}

/**
 * Check Path is Valid.
 * @param path Path to Check
 * @returns True if is Valid
 */
export function isValidPath(path: string[]) {
	// Check is not an empty string
	if (join(...path) === '') {
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
	const pathS = join(...path);

	if (existsSync(pathS)) {
		if (statSync(pathS).isDirectory()) {
			readdirSync(pathS).forEach(file => {
				const filePath = join(pathS, file);

				if (statSync(filePath).isDirectory()) {
					// Recursively remove subdirectories
					removeDirectoryRecursiveSync([filePath]);
				}
				else {
					// Remove files
					unlinkSync(filePath);
				}
			});

			// Remove the empty directory
			rmdirSync(pathS);
		}
		else {
			// Remove file if not directory
			rmSync(pathS);
		}
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

/**
 * Files that generally should not be copied
 */
export const FILE_IGNORE_LIST = [
	'.DS_Store',
];

/*
 * ----------------------------------------------------//
 *  Credits: https://github.com/fent/node-stream-equal //
 * ----------------------------------------------------//
 */
/**
 * Checks the file content of the file is equal
 * @param file1 File path of first file
 * @param file2 File path of seccond file
 * @returns Are the files equal
 */
export function filesEqual(file1: string, file2: string): Promise<boolean> {
	const stream1 = createReadStream(file1);
	const stream2 = createReadStream(file2);

	return new Promise<boolean>((resolve, reject) => {
		const readStream1 = stream1.pipe(new PassThrough({ objectMode: true }));
		const readStream2 = stream2.pipe(new PassThrough({ objectMode: true }));

		const cleanup = (equal: boolean) => {
			stream1.removeListener('error', reject);
			readStream1.removeListener('end', onend1);
			readStream1.removeListener('readable', streamState1.read);

			stream2.removeListener('error', reject);
			readStream2.removeListener('end', onend2);
			readStream1.removeListener('readable', streamState2.read);

			resolve(equal);
		};

		const streamState1: StreamState = {
			id: 1,
			stream: readStream1,
			data: null,
			pos: 0,
			ended: false,
			read: () => { },
		};
		const streamState2: StreamState = {
			id: 2,
			stream: readStream2,
			data: null,
			pos: 0,
			ended: false,
			read: () => { },
		};
		streamState1.read = createOnRead(streamState1, streamState2, cleanup);
		streamState2.read = createOnRead(streamState2, streamState1, cleanup);
		const onend1 = createOnEndFn(streamState1, streamState2, cleanup);
		const onend2 = createOnEndFn(streamState2, streamState1, cleanup);

		stream1.on('error', reject);
		readStream1.on('end', onend1);

		stream2.on('error', reject);
		readStream2.on('end', onend2);

		// Start by reading from the first stream.
		streamState1.stream.once('readable', streamState1.read);
	});
}

interface StreamState {
	id: number;
	stream: Readable;
	data: Buffer | null;
	pos: number;
	ended: boolean;
	read: () => void;
}

/*
 * ----------------------------------------------------//
 *  Credits: https://github.com/fent/node-stream-equal //
 * ----------------------------------------------------//
 */
/**
 * Creates a function that gets when a stream read
 *
 * @param streamState1
 * @param streamState2
 * @param resolve
 * @returns
 */
function createOnRead(streamState1: StreamState, streamState2: StreamState, resolve: (equal: boolean) => void): () => void {
	return () => {
		let data = streamState1.stream.read();
		if (!data) {
			return streamState1.stream.once('readable', streamState1.read);
		}

		// Make sure `data` is a buffer.
		if (!Buffer.isBuffer(data)) {
			if (typeof data === 'object') {
				data = JSON.stringify(data);
			}
			else {
				data = data.toString();
			}
			data = Buffer.from(data);
		}

		const newPos = streamState1.pos + data.length;

		if (streamState1.pos < streamState2.pos) {
			if (!streamState2.data) {
				return resolve(false);
			}
			const minLength = Math.min(data.length, streamState2.data.length);

			const streamData = data.slice(0, minLength);
			streamState1.data = data.slice(minLength);

			const otherStreamData = streamState2.data.slice(0, minLength);
			streamState2.data = streamState2.data.slice(minLength);

			// Compare.
			for (let i = 0; i < minLength; i++) {
				if (streamData[i] !== otherStreamData[i]) {
					return resolve(false);
				}
			}
		}
		else {
			streamState1.data = data;
		}

		streamState1.pos = newPos;
		if (newPos > streamState2.pos) {
			if (streamState2.ended) {
				/*
				 * If this stream is still emitting `data` events but the other has
				 * ended, then this is longer than the other one.
				 */
				return resolve(false);
			}

			/*
			 * If this stream has caught up to the other,
			 * read from other one.
			 */
			streamState2.read();
		}
		else {
			streamState1.read();
		}
	};
}

/*
 * ----------------------------------------------------//
 *  Credits: https://github.com/fent/node-stream-equal //
 * ----------------------------------------------------//
 */
/**
 * Creates a function that gets called when a stream ends.
 *
 * @param streamState1
 * @param streamState2
 * @param resolve
 */
function createOnEndFn(streamState1: StreamState, streamState2: StreamState, resolve: (equal: boolean) => void): () => void {
	return () => {
		streamState1.ended = true;
		if (streamState2.ended) {
			resolve(streamState1.pos === streamState2.pos);
		}
		else {
			streamState2.read();
		}
	};
}