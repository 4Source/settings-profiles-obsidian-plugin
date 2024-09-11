import { Modal } from "obsidian";

export abstract class AsyncModal extends Modal {
	resolve: (value: unknown) => void;

	open(): Promise<void> {
		return new Promise((resolve, reject) => {
			super.open();
			this.resolve = resolve;
		})
	}

	close(): void {
		super.close();
		this.resolve(undefined);
	}
}