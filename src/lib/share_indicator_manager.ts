import type FastSync from "../main";

export class ShareIndicatorManager {
    // 内存中的分享路径集合 / In-memory set of shared paths
    private sharedPaths: Set<string> = new Set();
    // 筛选是否激活 / Whether the filter is active
    private _isFilterActive = false;
    // 网络重连处理器引用 / Online handler ref
    private onlineHandler: (() => void) | null = null;
    // 启动延迟定时器 / Startup delay timer
    private startupTimer: number | null = null;
    // 并发同步守卫 / Concurrent sync guard
    private isSyncing = false;
    // DOM 观察器 / DOM Observer
    private observer: MutationObserver | null = null;

    constructor(private plugin: FastSync) {}

    /**
     * 初始化
     */
    async initialize(): Promise<void> {
        if (this.startupTimer !== null) {
            window.clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }

        const saved = this.plugin.settings.sharedPaths ?? [];
        this.sharedPaths = new Set(saved);

        this.onlineHandler = () => {
            void (async () => {
                await this.syncWithServer();
            })().catch(() => {});
        };
        window.addEventListener("online", this.onlineHandler);

        this.startupTimer = window.setTimeout(() => {
            void this.syncWithServer().catch(() => {});
        }, 5000);

        // 启动 DOM 观察器
        this.startObserver();

        this.plugin.registerEvent(this.plugin.app.vault.on("delete", (file) => {
            void this.removeSharedPath(file.path);
        }));
    }

    private startObserver() {
        if (this.observer) return;

        this.observer = new MutationObserver(() => {
            this.updateAllElements();
        });

        // 观察整个 body，因为文件浏览器可能会被销毁和重建
        this.observer.observe(activeDocument.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-path', 'data-drag-path']
        });

        // 初始更新
        this.updateAllElements();
    }

    private updateAllElements() {
        if (!this.plugin.settings.showShareIcon) return;

        const sharedPaths = this.sharedPaths;
        const ancestorFolders = this.getAllAncestorFolders();

        // 处理原生文件浏览器
        activeDocument.querySelectorAll('.nav-file-title, .nav-folder-title').forEach(el => {
            const path = el.getAttribute('data-path');
            if (!path) return;

            const isShared = sharedPaths.has(path) || ancestorFolders.has(path);
            const targetEl = el.parentElement || el; // 尝试给父级（.nav-file / .nav-folder）加标记 / Tag parent element
            
            if (isShared) {
                if (targetEl.getAttribute('data-fns-shared') !== 'true') {
                    targetEl.setAttribute('data-fns-shared', 'true');
                }
            } else {
                if (targetEl.hasAttribute('data-fns-shared')) {
                    targetEl.removeAttribute('data-fns-shared');
                }
            }
        });

        // 处理 Notebook Navigator 等第三方插件 (使用 data-drag-path)
        activeDocument.querySelectorAll('[data-drag-path]').forEach(el => {
            const path = el.getAttribute('data-drag-path');
            if (!path) return;

            const isShared = sharedPaths.has(path);
            if (isShared) {
                if (el.getAttribute('data-fns-shared') !== 'true') {
                    el.setAttribute('data-fns-shared', 'true');
                }
            } else {
                if (el.hasAttribute('data-fns-shared')) {
                    el.removeAttribute('data-fns-shared');
                }
            }
        });
    }

    updateSharedPaths(paths: string[]): void {
        this.sharedPaths = new Set(paths);
        this.plugin.settings.sharedPaths = paths;
        void this.plugin.saveSettings();
        this.updateAllElements();
    }

    async syncWithServer(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;
        try {
            if (!this.plugin.settings.api || !this.plugin.settings.apiToken) return;
            
            // 新增：仅在 WebSocket 认证通过（确保服务端连通）时才获取分享列表
            if (!this.plugin.websocket.isAuth) return;

            const paths = await this.plugin.api.getSharePaths();
            if (paths === null) return;

            const newSet = new Set(paths);
            if (this.sharedPaths.size === newSet.size && paths.every(p => this.sharedPaths.has(p))) return;

            this.sharedPaths = newSet;
            this.plugin.settings.sharedPaths = paths;
            await this.plugin.saveData(this.plugin.settings);
            this.updateAllElements();
        } finally {
            this.isSyncing = false;
        }
    }

    async addSharedPath(path: string): Promise<void> {
        this.sharedPaths.add(path);
        this.plugin.settings.sharedPaths = Array.from(this.sharedPaths);
        await this.plugin.saveData(this.plugin.settings);
        this.updateAllElements();
        this.plugin.menuManager?.updateShareIconColor();
    }

    async removeSharedPath(path: string): Promise<void> {
        this.sharedPaths.delete(path);
        this.plugin.settings.sharedPaths = Array.from(this.sharedPaths);
        await this.plugin.saveData(this.plugin.settings);
        this.updateAllElements();
        this.plugin.menuManager?.updateShareIconColor();
        
        if (this._isFilterActive && this.sharedPaths.size === 0) {
            this._isFilterActive = false;
            activeDocument.body.removeClass('fns-filter-active');
        }
    }

    getSharedCount(): number {
        return this.sharedPaths.size;
    }

    hasPath(path: string): boolean {
        return this.sharedPaths.has(path);
    }

    get isFilterActive(): boolean {
        return this._isFilterActive;
    }

    toggleFilter(): void {
        this._isFilterActive = !this._isFilterActive;
        if (this._isFilterActive) {
            activeDocument.body.addClass('fns-filter-active');
            this.expandSharedFolders();
        } else {
            activeDocument.body.removeClass('fns-filter-active');
        }
        this.plugin.app.workspace.requestSaveLayout();
    }

    private getAllAncestorFolders(): Set<string> {
        const folders = new Set<string>();
        for (const path of this.sharedPaths) {
            const parts = path.split("/");
            for (let i = 1; i < parts.length; i++) {
                folders.add(parts.slice(0, i).join("/"));
            }
        }
        return folders;
    }

    private expandSharedFolders(): void {
        const ancestors = this.getAllAncestorFolders();
        for (const folderPath of ancestors) {
            const folderEl = activeDocument.querySelector(
                `.nav-folder:has(> .nav-folder-title[data-path="${folderPath}"]).is-collapsed`
            );
            if (folderEl) {
                const titleEl = folderEl.querySelector(".nav-folder-title");
                (titleEl as HTMLElement)?.click();
            }
        }
    }

    unload(): void {
        if (this.startupTimer !== null) {
            window.clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
        if (this.onlineHandler) {
            window.removeEventListener("online", this.onlineHandler);
            this.onlineHandler = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        activeDocument.body.removeClass('fns-filter-active');
        // 清理所有标记
        activeDocument.querySelectorAll('[data-fns-shared]').forEach(el => el.removeAttribute('data-fns-shared'));
    }

    public regenerateCss(): void {
        this.updateAllElements();
    }
}
