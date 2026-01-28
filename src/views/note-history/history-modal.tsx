import { Root, createRoot } from "react-dom/client";
import { Modal, App, setIcon } from "obsidian";
import * as React from "react";

import { HistoryView } from "./history-view";
import type FastSync from "../../main";
import { $ } from "../../lang/lang";


export class NoteHistoryModal extends Modal {
    private root: Root | null = null;

    constructor(app: App, private plugin: FastSync, private filePath: string) {
        super(app);
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        this.containerEl.addClass("note-history-modal");

        titleEl.empty();
        const iconSpan = titleEl.createSpan({ cls: "title-prefix" });
        setIcon(iconSpan, "history");
        iconSpan.createSpan({ text: ` ${$("ui.history.title")}：` });
        titleEl.createEl("span", { text: this.filePath, cls: "title-path" });

        this.root = createRoot(contentEl);
        this.root.render(
            <HistoryView plugin={this.plugin} filePath={this.filePath} />
        );
    }

    onClose() {
        if (this.root) {
            this.root.unmount();
        }
        this.contentEl.empty();
    }
}
