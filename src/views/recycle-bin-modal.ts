import { App, Modal, Notice, setIcon, ButtonComponent } from "obsidian";

import { ConfirmModal } from "./confirm-modal";
import { formatFileSize } from "../lib/helps";
import { HttpApiService } from "../lib/api";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


// 简单的接口定义，避免循环依赖
interface RecycleItem {
    id?: number;
    path: string;
    pathHash?: string;
    mtime?: number; // 笔记可能是 mtime
    updatedTimestamp?: number; // 笔记可能是 updatedTimestamp
    lastTime?: number; // 附件可能是 lastTime
    size?: number;
}

export class RecycleBinModal extends Modal {
    private plugin: FastSync;
    private api: HttpApiService;
    private activeTab: 'note' | 'file' = 'note';
    private page: number = 1;
    private pageSize: number = 20;
    private totalRows: number = 0;
    private items: any[] = [];
    private loading: boolean = false;

    private selectedPaths: Set<string> = new Set();
    private selectedPathHashes: Map<string, string> = new Map();

    constructor(app: App, plugin: FastSync) {
        super(app);
        this.plugin = plugin;
        this.api = new HttpApiService(plugin);
    }

    onOpen() {
        // 初始加载数据，数据加载完会自动渲染
        this.loadData();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }


    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("fns-recycle-bin-modal");
        // 加宽界面
        this.containerEl.addClass("fns-modal-wide");
        (this.containerEl.querySelector(".modal") as HTMLElement).style.width = "800px";
        (this.containerEl.querySelector(".modal") as HTMLElement).style.maxWidth = "90vw";

        this.titleEl.innerText = $("ui.recycle_bin.title");

        // offline check
        if (!this.plugin.websocket || !this.plugin.websocket.isConnected()) {
            const div = contentEl.createDiv("fns-recycle-offline");
            div.style.padding = "20px";
            div.style.textAlign = "center";
            div.style.color = "var(--text-error)";
            div.innerText = $("ui.recycle_bin.offline");
            return;
        }

        this.renderTabs(contentEl);
        this.renderActions(contentEl);

        // 确保列表容器始终存在
        const listContainer = contentEl.createDiv("fns-recycle-list");
        this.renderList(listContainer);
    }

    private renderTabs(parent: HTMLElement) {
        const tabContainer = parent.createDiv("fns-recycle-tabs");
        tabContainer.style.display = "flex";
        tabContainer.style.marginBottom = "10px";
        tabContainer.style.gap = "10px";

        const noteTabBtn = new ButtonComponent(tabContainer)
            .setButtonText($("ui.recycle_bin.note"))
            .onClick(() => {
                this.switchTab('note');
            });

        const fileTabBtn = new ButtonComponent(tabContainer)
            .setButtonText($("ui.recycle_bin.file"))
            .onClick(() => {
                this.switchTab('file');
            });

        if (this.activeTab === 'note') {
            noteTabBtn.setCta();
        } else {
            fileTabBtn.setCta();
        }
    }

    private renderActions(parent: HTMLElement) {
        const actionContainer = parent.createDiv("fns-recycle-actions");
        actionContainer.style.display = "flex";
        actionContainer.style.justifyContent = "space-between";
        actionContainer.style.alignItems = "center";
        actionContainer.style.marginBottom = "10px";
        actionContainer.style.padding = "0 5px";

        const leftActions = actionContainer.createDiv("fns-actions-left");
        leftActions.style.display = "flex";
        leftActions.style.gap = "10px";

        // 全选复选框
        const selectAllContainer = leftActions.createDiv();
        selectAllContainer.style.display = "flex";
        selectAllContainer.style.alignItems = "center";
        selectAllContainer.style.gap = "5px";

        const selectAllCb = selectAllContainer.createEl("input", { type: "checkbox" });
        const items = this.items || [];
        selectAllCb.checked = items.length > 0 && this.selectedPaths.size === items.length;
        selectAllCb.addEventListener("change", () => {
            if (selectAllCb.checked) {
                items.forEach(item => {
                    this.selectedPaths.add(item.path);
                    if (item.pathHash) this.selectedPathHashes.set(item.path, item.pathHash);
                });
            } else {
                this.selectedPaths.clear();
                this.selectedPathHashes.clear();
            }
            this.render();
        });

        const selectAllLabel = selectAllContainer.createEl("label");
        selectAllLabel.innerText = $("ui.recycle_bin.select_all");

        if (this.selectedPaths.size > 0) {
            new ButtonComponent(leftActions)
                .setButtonText($("ui.recycle_bin.bulk_restore"))
                .onClick(async () => {
                    await this.bulkRestore();
                });

            new ButtonComponent(leftActions)
                .setButtonText($("ui.recycle_bin.bulk_delete"))
                .setCta()
                .onClick(() => {
                    new ConfirmModal(
                        this.app,
                        $("ui.recycle_bin.bulk_delete"),
                        $("ui.recycle_bin.bulk_delete_confirm"),
                        async () => {
                            await this.bulkDelete();
                        },
                        undefined,
                        undefined,
                        false
                    ).open();
                });
        }

        const rightActions = actionContainer.createDiv("fns-actions-right");
        new ButtonComponent(rightActions)
            .setButtonText($("ui.recycle_bin.clear"))
            .setCta()
            .onClick(() => {
                new ConfirmModal(
                    this.app,
                    $("ui.recycle_bin.clear"),
                    $("ui.recycle_bin.clear_confirm"),
                    async () => {
                        await this.clearAll();
                    },
                    undefined,
                    undefined,
                    false
                ).open();
            });
    }

    private async switchTab(tab: 'note' | 'file') {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.page = 1;
        this.items = [];
        this.totalRows = 0;
        this.selectedPaths.clear();
        this.selectedPathHashes.clear();
        await this.loadData();
    }

    private renderList(listContainer: HTMLElement) {
        listContainer.empty();
        listContainer.style.minHeight = "300px";
        listContainer.style.maxHeight = "500px";
        listContainer.style.overflowY = "auto";
        listContainer.style.border = "1px solid var(--background-modifier-border)";
        listContainer.style.borderRadius = "4px";
        listContainer.style.marginTop = "10px";

        if (this.loading && (!this.items || this.items.length === 0)) {
            const loadingDiv = listContainer.createDiv("fns-loading");
            loadingDiv.style.padding = "40px 20px";
            loadingDiv.style.textAlign = "center";
            loadingDiv.innerText = $("ui.history.loading");
            return;
        }

        if (!this.items || this.items.length === 0) {
            const emptyState = listContainer.createDiv({ cls: "fns-empty-state" });
            emptyState.style.padding = "60px 20px";
            emptyState.style.textAlign = "center";
            emptyState.style.color = "var(--text-muted)";

            const emptyIcon = emptyState.createDiv();
            emptyIcon.style.marginBottom = "15px";
            emptyIcon.style.opacity = "0.6";
            setIcon(emptyIcon, "archive-x"); // 使用 archive-x 图标

            const emptyText = emptyState.createDiv();
            emptyText.style.fontSize = "1.1em";
            emptyText.innerText = this.activeTab === 'note' ? $("ui.recycle_bin.empty_note") : $("ui.recycle_bin.empty_file");
            return;
        }

        this.items.forEach(item => {
            this.renderItem(listContainer, item);
        });

        // Infinite scroll logic
        listContainer.addEventListener("scroll", () => {
            if (this.loading || this.items.length >= this.totalRows) return;
            if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 50) {
                this.page++;
                this.loadData(true);
            }
        });

        // Load more at bottom
        if (this.items.length < this.totalRows) {
            const loadMoreDiv = listContainer.createDiv("fns-load-more");
            loadMoreDiv.style.textAlign = "center";
            loadMoreDiv.style.padding = "20px";

            if (this.loading) {
                loadMoreDiv.innerText = $("ui.history.loading");
            } else {
                new ButtonComponent(loadMoreDiv)
                    .setButtonText($("ui.recycle_bin.load_more"))
                    .onClick(() => {
                        this.page++;
                        this.loadData(true);
                    });
            }
        }
    }

    private renderItem(container: HTMLElement, item: RecycleItem) {
        const itemDiv = container.createDiv("fns-recycle-item");
        itemDiv.style.display = "flex";
        itemDiv.style.alignItems = "center";
        itemDiv.style.padding = "8px 10px";
        itemDiv.style.borderBottom = "1px solid var(--background-modifier-border)";
        itemDiv.style.justifyContent = "space-between";

        const leftDiv = itemDiv.createDiv("fns-item-left");
        leftDiv.style.display = "flex";
        leftDiv.style.alignItems = "center";
        leftDiv.style.gap = "8px";
        leftDiv.style.overflow = "hidden";
        leftDiv.style.flex = "1";

        // 复选框
        const cb = leftDiv.createEl("input", { type: "checkbox" });
        cb.checked = this.selectedPaths.has(item.path);
        cb.addEventListener("change", () => {
            if (cb.checked) {
                this.selectedPaths.add(item.path);
                if (item.pathHash) this.selectedPathHashes.set(item.path, item.pathHash);
            } else {
                this.selectedPaths.delete(item.path);
                this.selectedPathHashes.delete(item.path);
            }
            this.render();
        });

        const iconDiv = leftDiv.createDiv("fns-item-icon");
        setIcon(iconDiv, this.activeTab === 'note' ? "file-text" : "file");

        const infoDiv = leftDiv.createDiv("fns-item-info");
        infoDiv.style.display = "flex";
        infoDiv.style.flexDirection = "column";
        infoDiv.style.overflow = "hidden";
        infoDiv.style.flex = "1";

        const nameEl = infoDiv.createDiv("fns-item-name");
        nameEl.innerText = item.path;
        nameEl.style.fontWeight = "bold";
        nameEl.style.whiteSpace = "nowrap";
        nameEl.style.overflow = "hidden";
        nameEl.style.textOverflow = "ellipsis";
        nameEl.title = item.path;

        const dateEl = infoDiv.createDiv("fns-item-date");
        let metaText = "";
        if (item.size !== undefined) {
            metaText += `${formatFileSize(item.size)}  |  `;
        }

        let ts = item.lastTime || item.mtime || item.updatedTimestamp || 0;
        if (ts > 0) {
            const date = new Date(ts);
            metaText += `${$("ui.recycle_bin.delete_time")}: ${date.toLocaleString()}`;
        }
        dateEl.innerText = metaText;
        dateEl.style.fontSize = "0.8em";
        dateEl.style.color = "var(--text-muted)";

        const rightDiv = itemDiv.createDiv("fns-item-right");
        rightDiv.style.display = "flex";
        rightDiv.style.gap = "5px";

        new ButtonComponent(rightDiv)
            .setButtonText($("ui.recycle_bin.restore"))
            .onClick(async () => {
                await this.restoreItem(item);
            });

        new ButtonComponent(rightDiv)
            .setButtonText($("ui.recycle_bin.delete"))
            .setCta()
            .onClick(() => {
                new ConfirmModal(
                    this.app,
                    $("ui.recycle_bin.delete"),
                    $("ui.recycle_bin.delete_confirm"),
                    async () => {
                        await this.deleteItemPermanently(item);
                    },
                    undefined,
                    undefined,
                    false
                ).open();
            });
    }

    private async loadData(append: boolean = false) {
        if (this.loading && !append) return;
        this.loading = true;

        this.render();

        try {
            if (this.activeTab === 'note') {
                const res = await this.api.getNoteList(this.page, this.pageSize, true);
                const newList = res?.list || [];
                if (append) {
                    this.items = [...(this.items || []), ...newList];
                } else {
                    this.items = newList;
                }
                this.totalRows = res?.pager?.totalRows || 0;
            } else {
                const res = await this.api.getFileList(this.page, this.pageSize, true);
                const newList = res?.list || [];
                if (append) {
                    this.items = [...(this.items || []), ...newList];
                } else {
                    this.items = newList;
                }
                this.totalRows = res?.pager?.totalRows || 0;
            }
        } catch (e) {
            new Notice($("ui.history.load_failed"));
            console.error("Failed to load recycle bin data", e);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    private async restoreItem(item: RecycleItem) {
        let success = false;
        if (this.activeTab === 'note') {
            success = await this.api.restoreNote(item.path, item.pathHash);
        } else {
            success = await this.api.restoreFile(item.path, item.pathHash);
        }

        if (success) {
            new Notice($("ui.recycle_bin.restore_success"));
            this.items = this.items.filter(i => i.path !== item.path);
            this.totalRows--;
            this.selectedPaths.delete(item.path);
            this.selectedPathHashes.delete(item.path);
            this.render();
        }
    }

    private async deleteItemPermanently(item: RecycleItem) {
        const success = await this.api.clearRecycleBin(this.activeTab, [item.path], item.pathHash ? [item.pathHash] : []);
        if (success) {
            new Notice($("ui.recycle_bin.delete_success"));
            this.items = this.items.filter(i => i.path !== item.path);
            this.totalRows--;
            this.selectedPaths.delete(item.path);
            this.selectedPathHashes.delete(item.path);
            this.render();
        }
    }

    private async bulkRestore() {
        const paths = Array.from(this.selectedPaths);
        let successCount = 0;
        for (const path of paths) {
            const hash = this.selectedPathHashes.get(path);
            let success = false;
            if (this.activeTab === 'note') {
                success = await this.api.restoreNote(path, hash);
            } else {
                success = await this.api.restoreFile(path, hash);
            }
            if (success) successCount++;
        }

        if (successCount > 0) {
            new Notice(`成功恢复 ${successCount} 个项目`);
            this.page = 1;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            await this.loadData();
        }
    }

    private async bulkDelete() {
        const paths = Array.from(this.selectedPaths);
        const hashes = paths.map(p => this.selectedPathHashes.get(p)).filter(h => !!h) as string[];

        const success = await this.api.clearRecycleBin(this.activeTab, paths, hashes);
        if (success) {
            new Notice($("ui.recycle_bin.delete_success"));
            this.page = 1;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            await this.loadData();
        }
    }

    private async clearAll() {
        const success = await this.api.clearRecycleBin(this.activeTab);
        if (success) {
            new Notice($("ui.recycle_bin.clear_success"));
            this.items = [];
            this.totalRows = 0;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            this.render();
        }
    }
}
