import { App, Modal, Setting } from "obsidian";

import { $ } from "../lang/lang";


export class ConfirmModal extends Modal {
    private titleText: string;
    private message: string;
    private onConfirm: () => void;
    private confirmLabel: string;
    private cancelLabel: string;

    private isWarning: boolean;

    constructor(
        app: App,
        title: string,
        message: string,
        onConfirm: () => void,
        confirmLabel?: string,
        cancelLabel?: string,
        isWarning: boolean = true
    ) {
        super(app);
        this.titleText = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.confirmLabel = confirmLabel || $("ui.button.confirm") || "Confirm";
        this.cancelLabel = cancelLabel || $("ui.button.cancel") || "Cancel";
        this.isWarning = isWarning;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText(this.titleText);

        const messageEl = contentEl.createEl("div", {
            cls: this.isWarning ? "fns-modal-warning-message" : "fns-modal-info-message"
        });
        messageEl.innerHTML = this.message;

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText(this.confirmLabel)
                if (this.isWarning) {
                    btn.setWarning();
                } else {
                    btn.setCta();
                }
                btn.onClick(() => {
                    this.close();
                    this.onConfirm();
                });
            })
            .addButton((btn) =>
                btn.setButtonText(this.cancelLabel).onClick(() => {
                    this.close();
                })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
