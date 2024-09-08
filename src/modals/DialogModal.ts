import { App, Modal, Setting } from 'obsidian';

export abstract class DialogModal extends Modal {
	message: string;
	submit: string;
	submitWarning: boolean;
	deny: string;
	denyWarning: boolean;
	dontShowAgain: boolean;
	onSubmit: () => void;
	onDeny?: () => void;
	onDontShowAgain?: () => void;

	constructor(app: App, title: string, message: string, handler: { onSubmit: () => void, onDeny?: () => void, onDontShowAgain?: () => void }, options?: { submit?: string, submitWarning?: boolean, deny?: string, denyWarning?: boolean, dontShowAgain?: boolean }) {
		super(app);

		this.titleEl.setText(title);

		this.message = message;
		this.onSubmit = handler.onSubmit;
		this.onDeny = handler.onDeny;
		this.onDontShowAgain = handler.onDontShowAgain;
		this.submit = options?.submit || 'Agree';
		if (options === undefined || options.submitWarning === undefined) {
			this.submitWarning = false;
		}
		else {
			this.submitWarning = options.submitWarning;
		}
		this.deny = options?.deny || 'Cancel';
		if (options === undefined || options.denyWarning === undefined) {
			this.denyWarning = true;
		}
		else {
			this.denyWarning = options.denyWarning;
		}
		if (options === undefined || options.dontShowAgain === undefined) {
			this.dontShowAgain = false;
		}
		else {
			this.dontShowAgain = options.dontShowAgain;
		}
	}

	onOpen(): void {
		if (this.dontShowAgain) {
			this.close();
			this.onSubmit();
			// return;
		}

		const { contentEl } = this;

		contentEl.createEl('span', { text: this.message });

		const setting = new Setting(contentEl);
		if (this.onDontShowAgain) {
			const dontShowAgainEl = setting.infoEl.createEl('div');
			const checkbox = dontShowAgainEl.createEl('input', { type: 'checkbox' });
			checkbox.id = 'dontShowAgainCheckbox';
			const label = dontShowAgainEl.createEl('label', { text: `Don't show again` });
			label.id = 'dontShowAgainLabel';
			label.setAttr('for', 'dontShowAgainCheckbox');

			checkbox.onClickEvent((ev) => {
				this.dontShowAgain = !this.dontShowAgain;
			})
		}


		if (this.submitWarning) {
			setting.addButton(button => button
				.setButtonText(this.submit)
				.setWarning()
				.onClick(() => {
					if (this.onDontShowAgain && this.dontShowAgain) {
						this.onDontShowAgain();
					}
					this.close();
					this.onSubmit();
				}))
		}
		else {
			setting.addButton(button => button
				.setButtonText(this.submit)
				.onClick(() => {
					if (this.onDontShowAgain && this.dontShowAgain) {
						this.onDontShowAgain();
					}
					this.close();
					this.onSubmit();
				}))
		}

		if (this.denyWarning) {
			setting.addButton(button => button
				.setButtonText(this.deny)
				.setWarning()
				.onClick(() => {
					this.close();
					if (this.onDeny) {
						this.onDeny();
					}
				}))
		}
		else {
			setting.addButton(button => button
				.setButtonText(this.deny)
				.onClick(() => {
					this.close();
					if (this.onDeny) {
						this.onDeny();
					}
				}))
		}

		setting.setClass('modal-buttons');
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}