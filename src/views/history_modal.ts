import { Modal, App, TFile } from "obsidian";

import { timestampToDate } from "../lib/helps";
import { $ } from "../lang/lang";


interface HistoryEntry {
    mtime: number;
    contentHash: string;
    content?: string;
    diff?: { type: 'add' | 'del' | 'same', text: string }[];
}

export class NoteHistoryModal extends Modal {
    file: TFile;

    constructor(app: App, file: TFile) {
        super(app);
        this.file = file;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Modal Container Scaling
        this.modalEl.style.width = "800px";
        this.modalEl.style.maxWidth = "95vw";

        contentEl.createEl("h2", { text: $("笔记历史"), cls: "note-history-title" });
        contentEl.createEl("p", { text: `${$("当前文件") || "Current File"}: ${this.file.path}`, cls: "note-history-file-path" });

        const container = contentEl.createDiv({ cls: "note-history-container" });

        // Mock data for UI verification
        const mockHistory: HistoryEntry[] = [
            {
                mtime: Date.now(),
                contentHash: "sha256-mock-1",
                content: "Current content mock",
                diff: [
                    { type: 'same', text: 'This is a normal line.' },
                    { type: 'add', text: 'This is a newly added line.' },
                    { type: 'same', text: 'Another normal line.' }
                ]
            },
            {
                mtime: Date.now() - 3600000,
                contentHash: "sha256-mock-2",
                content: "1 hour ago content mock",
                diff: [
                    { type: 'same', text: 'Stable content here.' },
                    { type: 'del', text: 'This line was removed in this version.' },
                    { type: 'add', text: 'This line replaces the deleted one.' }
                ]
            },
            {
                mtime: Date.now() - 86400000,
                contentHash: "sha256-mock-3",
                content: "Yesterday content mock",
                diff: [
                    { type: 'add', text: 'Initial content line.' },
                    { type: 'add', text: 'Second content line.' }
                ]
            },
        ];

        this.renderHistoryList(container, mockHistory);
    }

    renderHistoryList(container: HTMLElement, history: HistoryEntry[]) {
        const table = container.createEl("table", { cls: "note-history-table" });
        const thead = table.createEl("thead");
        const headerRow = thead.createEl("tr");
        headerRow.createEl("th", { text: $("时间") });
        headerRow.createEl("th", { text: $("详情") });
        headerRow.createEl("th", { text: $("操作") || "Action" });

        const tbody = table.createEl("tbody");

        history.forEach((entry) => {
            const row = tbody.createEl("tr");
            row.createEl("td", { text: timestampToDate(entry.mtime) });

            const detailCell = row.createEl("td");
            detailCell.createEl("code", { text: entry.contentHash.substring(0, 12) });
            detailCell.createSpan({ text: ` (${$("已同步") || "Synced"})`, cls: "note-history-status" });

            const actionCell = row.createEl("td");
            const btnGroup = actionCell.createDiv({ cls: "note-history-btn-group" });

            const detailBtn = btnGroup.createEl("button", { text: $("详情") || "Details" });
            detailBtn.onclick = () => {
                this.showDiff(entry);
            };

            const restoreBtn = btnGroup.createEl("button", { text: $("恢复") || "Restore" });
            restoreBtn.onclick = () => {
                console.log("Restore clicked for", entry.contentHash);
            };
        });
    }

    showDiff(entry: HistoryEntry) {
        const diffModal = new Modal(this.app);
        diffModal.onOpen = () => {
            const { contentEl } = diffModal;
            contentEl.empty();

            diffModal.modalEl.style.width = "800px";
            diffModal.modalEl.style.maxWidth = "95vw";

            contentEl.createEl("h3", { text: `${$("详情")}: ${timestampToDate(entry.mtime)}` });

            const diffContainer = contentEl.createDiv({ cls: "note-history-diff-view" });
            if (entry.diff) {
                entry.diff.forEach(line => {
                    const lineEl = diffContainer.createDiv({
                        cls: `diff-line diff-${line.type}`,
                        text: `${line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '} ${line.text}`
                    });
                });
            } else {
                diffContainer.createEl("p", { text: "No diff data available." });
            }
        };
        diffModal.open();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
