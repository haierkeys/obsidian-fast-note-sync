import { App, Modal, Setting } from "obsidian";

import { $ } from "../lang/lang";


export class ConfirmModal extends Modal {
    private titleText: string;
    private message: string;
    private onConfirm: () => void;
    private confirmLabel: string;
    private cancelLabel: string;

    constructor(
        app: App,
        title: string,
        message: string,
        onConfirm: () => void,
        confirmLabel?: string,
        cancelLabel?: string
    ) {
        super(app);
        this.titleText = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.confirmLabel = confirmLabel || $("ui.button.confirm") || "Confirm";
        this.cancelLabel = cancelLabel || $("ui.button.cancel") || "Cancel";
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText(this.titleText);

        const messageEl = contentEl.createEl("div", {
            cls: "fns-modal-warning-message"
        });
        messageEl.setText(this.message);

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText(this.confirmLabel)
                    .setWarning()
                    .onClick(() => {
                        this.close();
                        this.onConfirm();
                    })
            )
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
