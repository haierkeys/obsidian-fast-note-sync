import { App, Modal, setIcon, ButtonComponent } from "obsidian";

import { ConfirmModal } from "./confirm-modal";
import { formatFileSize, showSyncNotice, dumpError } from "../lib/helps";
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
    private items: RecycleItem[] = [];
    private loading: boolean = false;

    private selectedPaths: Set<string> = new Set();
    private selectedPathHashes: Map<string, string> = new Map();
    private abortController: AbortController | null = null;

    constructor(app: App, plugin: FastSync) {
        super(app);
        this.plugin = plugin;
        this.api = new HttpApiService(plugin);
    }

    onOpen() {
        // 初始加载数据，数据加载完会自动渲染
        void this.loadData();
    }

    onClose() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }


    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("fns-recycle-bin-modal");
        // 加宽界面
        this.containerEl.addClass("fns-modal-wide");

        this.titleEl.innerText = $("ui.recycle_bin.title");

        this.renderTabs(contentEl);
        this.renderActions(contentEl);

        // 确保列表容器始终存在
        const listContainer = contentEl.createDiv("fns-recycle-list");
        this.renderList(listContainer);
    }

    private renderTabs(parent: HTMLElement) {
        const tabContainer = parent.createDiv("fns-recycle-tabs");
        tabContainer.addClass("fns-flex", "fns-margin-b-10", "fns-gap-10");

        const noteTabBtn = new ButtonComponent(tabContainer)
            .setButtonText($("ui.recycle_bin.note"))
            .onClick(() => {
                void this.switchTab('note');
            });

        const fileTabBtn = new ButtonComponent(tabContainer)
            .setButtonText($("ui.recycle_bin.file"))
            .onClick(() => {
                void this.switchTab('file');
            });

        if (this.activeTab === 'note') {
            noteTabBtn.setCta();
        } else {
            fileTabBtn.setCta();
        }
    }

    private renderActions(parent: HTMLElement) {
        const actionContainer = parent.createDiv("fns-recycle-actions");
        actionContainer.addClass("fns-flex-between", "fns-margin-b-10", "fns-padding-h-5");

        const leftActions = actionContainer.createDiv("fns-actions-left");
        leftActions.addClass("fns-flex", "fns-gap-10");

        // 全选复选框
        const selectAllContainer = leftActions.createDiv();
        selectAllContainer.addClass("fns-flex", "fns-items-center", "fns-gap-5");

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
                        () => {
                            void this.bulkDelete();
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
                    () => {
                        void this.clearAll();
                    },
                    undefined,
                    undefined,
                    false
                ).open();
            });
    }

    private async switchTab(tab: 'note' | 'file') {
        if (this.activeTab === tab) return;

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

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
        listContainer.addClass("fns-list-container");

        // offline check
        if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
            const emptyState = listContainer.createDiv({ cls: "fns-empty-state fns-offline-state" });
            emptyState.addClass("fns-text-center", "fns-muted-text");
            emptyState.setCssProps({
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "250px"
            });

            const emptyIcon = emptyState.createDiv();
            emptyIcon.addClass("fns-margin-b-15", "fns-opacity-6");
            setIcon(emptyIcon, "wifi-off");

            const emptyText = emptyState.createDiv();
            emptyText.addClass("fns-font-lg");
            emptyText.innerText = $("setting.remote.disconnected");
            return;
        }

        if (this.loading && (!this.items || this.items.length === 0)) {
            const loadingDiv = listContainer.createDiv("fns-loading");
            loadingDiv.addClass("fns-padding-40", "fns-text-center");
            loadingDiv.innerText = $("ui.history.loading");
            return;
        }

        if (!this.items || this.items.length === 0) {
            const emptyState = listContainer.createDiv({ cls: "fns-empty-state" });
            emptyState.addClass("fns-text-center", "fns-muted-text");
            emptyState.setCssProps({
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "250px"
            });

            const emptyIcon = emptyState.createDiv();
            emptyIcon.addClass("fns-margin-b-15", "fns-opacity-6");
            setIcon(emptyIcon, "archive-x"); // 使用 archive-x 图标

            const emptyText = emptyState.createDiv();
            emptyText.addClass("fns-font-lg");
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
                void this.loadData(true);
            }
        });

        // Load more at bottom
        if (this.items.length < this.totalRows) {
            const loadMoreDiv = listContainer.createDiv("fns-load-more");
            loadMoreDiv.addClass("fns-text-center", "fns-padding-20");

            if (this.loading) {
                loadMoreDiv.innerText = $("ui.history.loading");
            } else {
                new ButtonComponent(loadMoreDiv)
                    .setButtonText($("ui.recycle_bin.load_more"))
                    .onClick(() => {
                        this.page++;
                        void this.loadData(true);
                    });
            }
        }
    }

    private renderItem(container: HTMLElement, item: RecycleItem) {
        const itemDiv = container.createDiv("fns-recycle-item");
        itemDiv.addClass("fns-flex-between", "fns-padding-8-10", "fns-border-b");

        const leftDiv = itemDiv.createDiv("fns-item-left");
        leftDiv.addClass("fns-flex", "fns-items-center", "fns-gap-8", "fns-overflow-hidden", "fns-flex-1");

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
        infoDiv.addClass("fns-flex", "fns-flex-col", "fns-overflow-hidden", "fns-flex-1");

        const nameEl = infoDiv.createDiv("fns-item-name");
        nameEl.innerText = item.path;
        nameEl.addClass("fns-font-bold", "fns-no-wrap", "fns-overflow-hidden", "fns-text-ellipsis");
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
        dateEl.addClass("fns-font-sm", "fns-muted-text");

        const rightDiv = itemDiv.createDiv("fns-item-right");
        rightDiv.addClass("fns-flex", "fns-gap-5");

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
                    () => {
                        void this.deleteItemPermanently(item);
                    },
                    undefined,
                    undefined,
                    false
                ).open();
            });
    }

    private async loadData(append: boolean = false) {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
            this.render();
            return;
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        this.render();

        try {
            if (this.activeTab === 'note') {
                const res = await this.api.getNoteList(this.page, this.pageSize, true, "", signal);
                const newList = (res?.list || []) as RecycleItem[];
                if (append) {
                    this.items = [...(this.items || []), ...newList];
                } else {
                    this.items = newList;
                }
                this.totalRows = res?.pager?.totalRows || 0;
            } else {
                const res = await this.api.getFileList(this.page, this.pageSize, true, "", signal);
                const newList = (res?.list || []) as RecycleItem[];
                if (append) {
                    this.items = [...(this.items || []), ...newList];
                } else {
                    this.items = newList;
                }
                this.totalRows = res?.pager?.totalRows || 0;
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                return;
            }
            showSyncNotice($("ui.history.load_failed"));
            dumpError("Failed to load recycle bin data", e);
        } finally {
            if (!signal.aborted) {
                this.loading = false;
                this.render();
            }
        }
    }

    private async restoreItem(item: RecycleItem) {
        let success = false;
        const signal = this.abortController?.signal;
        if (this.activeTab === 'note') {
            success = await this.api.restoreNote(item.path, item.pathHash, signal);
        } else {
            success = await this.api.restoreFile(item.path, item.pathHash, signal);
        }

        if (success) {
            showSyncNotice($("ui.recycle_bin.restore_success"));
            this.items = this.items.filter(i => i.path !== item.path);
            this.totalRows--;
            this.selectedPaths.delete(item.path);
            this.selectedPathHashes.delete(item.path);
            this.render();
        }
    }

    private async deleteItemPermanently(item: RecycleItem) {
        // 确保有 pathHash 才执行删除，避免与 clearAll 行为混淆
        if (!item.pathHash) {
            showSyncNotice($("ui.history.load_failed"));
            return;
        }
        const signal = this.abortController?.signal;
        const success = await this.api.clearRecycleBin(this.activeTab, item.path, item.pathHash, signal);
        if (success) {
            showSyncNotice($("ui.recycle_bin.delete_success"));
            this.items = this.items.filter(i => i.path !== item.path);
            this.totalRows--;
            this.selectedPaths.delete(item.path);
            this.selectedPathHashes.delete(item.path);
            this.render();
        }
    }

    private async bulkRestore() {
        const paths = Array.from(this.selectedPaths);
        const signal = this.abortController?.signal;
        let successCount = 0;
        for (const path of paths) {
            if (signal?.aborted) break;
            const hash = this.selectedPathHashes.get(path);
            let success = false;
            if (this.activeTab === 'note') {
                success = await this.api.restoreNote(path, hash, signal);
            } else {
                success = await this.api.restoreFile(path, hash, signal);
            }
            if (success) successCount++;
        }

        if (successCount > 0) {
            showSyncNotice(`成功恢复 ${successCount} 个项目`);
            this.page = 1;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            await this.loadData();
        }
    }

    private async bulkDelete() {
        const allPaths = Array.from(this.selectedPaths);
        const paths = allPaths.filter((p: string) => this.selectedPathHashes.has(p));
        const hashes = paths.map((p: string) => this.selectedPathHashes.get(p)!);
        const signal = this.abortController?.signal;

        if (paths.length === 0) {
            showSyncNotice($("ui.history.load_failed"));
            return;
        }

        let successCount = 0;
        for (let i = 0; i < paths.length; i++) {
            if (signal?.aborted) break;
            const success = await this.api.clearRecycleBin(this.activeTab, paths[i], hashes[i], signal);
            if (success) successCount++;
        }

        if (successCount > 0) {
            showSyncNotice($("ui.recycle_bin.delete_success"));
            this.page = 1;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            await this.loadData();
        }
    }

    private async clearAll() {
        const signal = this.abortController?.signal;
        const success = await this.api.clearRecycleBin(this.activeTab, undefined, undefined, signal);
        if (success) {
            showSyncNotice($("ui.recycle_bin.clear_success"));
            this.items = [];
            this.totalRows = 0;
            this.selectedPaths.clear();
            this.selectedPathHashes.clear();
            this.render();
        }
    }
}
