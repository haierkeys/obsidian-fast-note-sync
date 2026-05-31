import { App, Modal, Setting } from "obsidian";
import { DebugLogManager } from "../lib/debug_log_manager";
import { $ } from "../i18n/lang";

export class DebugLogModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl, titleEl, modalEl } = this;
        modalEl.addClass("fns-debug-log-modal");
        titleEl.setText($("ui.log.debug_title"));

        const container = contentEl.createDiv({ cls: "fns-debug-log-container" });

        const refreshLogs = () => {
            container.empty();
            const logs = DebugLogManager.getInstance().getLogs();
            if (logs.length === 0) {
                container.createDiv({ text: $("ui.log.empty"), cls: "fns-setting-no-results" });
                return;
            }
            logs.forEach(log => {
                const isError = log.includes("[ERROR]");
                const item = container.createDiv({ cls: `fns-debug-log-item${isError ? " is-error" : ""}` });
                item.setText(log);
            });
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        };

        refreshLogs();

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText($("ui.log.copy_all"))
                .onClick(async () => {
                    const logs = DebugLogManager.getInstance().getLogs().join("\n");
                    await navigator.clipboard.writeText(logs);
                })
            )
            .addButton(btn => btn
                .setButtonText($("ui.log.clear"))
                .onClick(() => {
                    DebugLogManager.getInstance().clearLogs();
                    refreshLogs();
                })
            )
            .addButton(btn => btn
                .setButtonText($("ui.button.collapse"))
                .onClick(() => this.close())
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
