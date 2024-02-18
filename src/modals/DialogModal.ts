import { App, Modal, Setting } from "obsidian";

export class DialogModal extends Modal {
    message: string;
    submit: string;
    deny: string;
    onSubmit: () => void;
    onDeny: () => void;

    constructor(app: App, title: string, message: string, onSubmit: () => void, onDeny: () => void, submit = 'Agree', deny = 'Cancel') {
        super(app);

        this.titleEl.setText(title);

        this.message = message;
        this.onSubmit = onSubmit;
        this.onDeny = onDeny;
        this.submit = submit;
        this.deny = deny;
    }

    onOpen(): void {
        const { contentEl } = this;

        contentEl.createEl('span', { text: this.message });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText(this.submit)
                .onClick(() => {
                    this.close();
                    this.onSubmit();
                }))
            .addButton(button => button
                .setButtonText(this.deny)
                .setWarning()
                .onClick(() => {
                    this.close();
                    this.onDeny();
                }))
            .setClass('modal-buttons');
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}