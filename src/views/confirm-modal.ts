import { App, Modal, Setting } from "obsidian";

import { $ } from "../i18n/lang";


export class ConfirmModal extends Modal {
    private titleText: string;
    private message: string;
    private onConfirm: () => void;
    private confirmLabel: string;
    private cancelLabel: string;

    private isWarning: boolean;
    private onCancel?: () => void;
    private decided: boolean = false;

    constructor(
        app: App,
        title: string,
        message: string,
        onConfirm: () => void,
        confirmLabel?: string,
        cancelLabel?: string,
        isWarning: boolean = true,
        onCancel?: () => void
    ) {
        super(app);
        this.titleText = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.confirmLabel = confirmLabel || $("ui.button.confirm") || "Confirm";
        this.cancelLabel = cancelLabel || $("ui.button.cancel") || "Cancel";
        this.isWarning = isWarning;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText(this.titleText);

        const messageEl = contentEl.createEl("div", {
        cls: (this.isWarning ? "fns-modal-warning-message" : "fns-modal-info-message") + " fns-modal-pre-wrap"
        });
        messageEl.setText(this.message);

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText(this.confirmLabel)
                if (this.isWarning) {
                    const destBtn = btn as unknown as { setDestructive(): void };
                    if (typeof destBtn.setDestructive === "function") {
                        destBtn.setDestructive();
                    } else {
                        const legacyBtn = btn as unknown as { setWarning(): void };
                        legacyBtn.setWarning();
                    }
                } else {
                    btn.setCta();
                }
                btn.onClick(() => {
                    this.decided = true;
                    this.close();
                    this.onConfirm();
                });
            })
            .addButton((btn) =>
                btn.setButtonText(this.cancelLabel).onClick(() => {
                    this.decided = true;
                    this.close();
                    this.onCancel?.();
                })
            );

        // 绑定键盘回车键确认 / Bind Enter key to confirm
        this.scope.register([], "Enter", (evt) => {
            evt.preventDefault();
            this.decided = true;
            this.close();
            this.onConfirm();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        // 通过 Escape/点击遮罩关闭且未走确认/取消按钮时，视为隐式取消 / Dismissed via Escape or
        // backdrop click without hitting either button counts as an implicit cancel
        if (!this.decided) {
            this.decided = true;
            this.onCancel?.();
        }
    }
}
