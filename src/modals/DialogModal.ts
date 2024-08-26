import { App, Modal, Setting } from "obsidian";

export class DialogModal extends Modal {
    message: string;
    submit: string;
	submitWarning: boolean;
    deny: string;
	denyWarning: boolean;
    onSubmit: () => void;
    onDeny: () => void;

    constructor(app: App, title: string, message: string, onSubmit: () => void, onDeny: () => void, submit = 'Agree', submitWarning = false, deny = 'Cancel', denyWarning = true) {
        super(app);

        this.titleEl.setText(title);

        this.message = message;
        this.onSubmit = onSubmit;
        this.onDeny = onDeny;
        this.submit = submit;
		this.submitWarning = submitWarning;
        this.deny = deny;
		this.denyWarning = denyWarning;
    }

    onOpen(): void {
        const { contentEl } = this;

        contentEl.createEl('span', { text: this.message });

        const setting = new Setting(contentEl);
		if(this.submitWarning) {
			setting.addButton(button => button
                .setButtonText(this.submit)
				.setWarning()
                .onClick(() => {
                    this.close();
                    this.onSubmit();
                }))
		}
		else {
			setting.addButton(button => button
                .setButtonText(this.submit)
                .onClick(() => {
                    this.close();
                    this.onSubmit();
                }))
		}

		if(this.denyWarning) {
			setting.addButton(button => button
                .setButtonText(this.deny)
                .setWarning()
                .onClick(() => {
                    this.close();
                    this.onDeny();
                }))
		}
		else {
			setting.addButton(button => button
                .setButtonText(this.deny)
                .onClick(() => {
                    this.close();
                    this.onDeny();
                }))
		}
            
        setting.setClass('modal-buttons');
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}