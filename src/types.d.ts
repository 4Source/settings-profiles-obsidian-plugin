import { } from 'obsidian';

declare module 'obsidian' {
	interface Commands {
		executeCommandById(commandId: string): boolean;
	}

	interface App {
		commands: Commands;
	}

	interface SuggestModal<T> {
		chooser: SuggestModalChooser<T, this>;
	}

	interface SuggestModalChooser<T, TModal> {
		chooser: TModal;
		values: T[] | null;
		useSelectedItem(evt: MouseEvent | KeyboardEvent): void;
	}
}