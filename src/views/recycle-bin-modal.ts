import { App, Modal, Notice, setIcon, ButtonComponent } from "obsidian";

import { formatFileSize } from "../lib/helps";
import { HttpApiService } from "../lib/api";
import type FastSync from "../main";
import { $ } from "../lang/lang";


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
        this.renderListContainer(contentEl);
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

    private async switchTab(tab: 'note' | 'file') {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.page = 1;
        this.items = [];
        this.totalRows = 0;
        await this.loadData();
    }

    private renderListContainer(parent: HTMLElement) {
        const listContainer = parent.createDiv("fns-recycle-list");
        listContainer.style.minHeight = "300px";
        listContainer.style.maxHeight = "500px";
        listContainer.style.overflowY = "auto";
        listContainer.style.border = "1px solid var(--background-modifier-border)";
        listContainer.style.borderRadius = "4px";

        if (this.loading && this.items.length === 0) {
            const loadingDiv = listContainer.createDiv("fns-loading");
            loadingDiv.style.padding = "20px";
            loadingDiv.style.textAlign = "center";
            loadingDiv.innerText = $("ui.history.loading");
            return;
        }

        if (this.items.length === 0) {
            const emptyState = listContainer.createDiv({ cls: "fns-empty-state" });
            emptyState.style.padding = "20px";
            emptyState.style.textAlign = "center";
            emptyState.style.color = "var(--text-muted)";
            emptyState.innerText = $("ui.recycle_bin.empty");
            return;
        }

        this.items.forEach(item => {
            this.renderItem(listContainer, item);
        });

        // Infinite scroll
        listContainer.addEventListener("scroll", () => {
            if (this.loading || this.items.length >= this.totalRows) return;

            // Check if scrolled near bottom (e.g., within 50px)
            if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 50) {
                this.page++;
                this.loadData(true);
            }
        });

        // Loading indicator at bottom
        if (this.items.length < this.totalRows) {
            const loadMoreDiv = listContainer.createDiv("fns-load-more");
            loadMoreDiv.style.textAlign = "center";
            loadMoreDiv.style.padding = "10px";

            if (this.loading) {
                loadMoreDiv.innerText = $("ui.history.loading");
            } else {
                // Optional: Keep button as manual trigger or just a spacer
                // For better UX with infinite scroll, we usually don't show a button unless error.
                // But detailed implementation: if auto-scroll fails or for accessibility, a button is nice.
                // Let's hide it if not loading, or make it "Load More" text that clicks.
                // Simple approach: Just text "Loading..." if loading, else existing button
                // but typically scroll triggers it before user sees button.
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

        const iconDiv = leftDiv.createDiv("fns-item-icon");
        // 使用 Obsidian 内置图标
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

        new ButtonComponent(rightDiv)
            .setButtonText($("ui.recycle_bin.restore"))
            .onClick(async () => {
                await this.restoreItem(item);
            });
    }

    private async loadData(append: boolean = false) {
        if (this.loading && !append) return; // Prevent double loading unless appending
        this.loading = true;

        // 如果不是追加模式，先渲染 loading 状态
        if (!append) {
            this.render();
        } else {
            // 如果是追加模式，重新渲染以显示底部的 loading
            this.render();
        }

        try {
            if (this.activeTab === 'note') {
                const res = await this.api.getNoteList(this.page, this.pageSize, true);
                if (append) {
                    this.items = [...this.items, ...res.list];
                } else {
                    this.items = res.list;
                }
                this.totalRows = res.pager.totalRows;
            } else {
                const res = await this.api.getFileList(this.page, this.pageSize, true);
                if (append) {
                    this.items = [...this.items, ...res.list];
                } else {
                    this.items = res.list;
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
        // 乐观 UI 更新：先移除，失败再回来？还是等成功？
        // 等成功比较安全。
        if (this.activeTab === 'note') {
            success = await this.api.restoreNote(item.path, item.pathHash);
        } else {
            success = await this.api.restoreFile(item.path, item.pathHash);
        }

        if (success) {
            new Notice($("ui.recycle_bin.restore_success"));
            this.items = this.items.filter(i => i.path !== item.path);
            this.totalRows--;
            this.render();
        } else {
            // Notice already handled in api calls usually, but let's be sure
            // api.restoreNote handles notice on failure.
        }
    }
}
