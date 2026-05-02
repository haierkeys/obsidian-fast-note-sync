import type FastSync from "../main";

// 注入的 <style> 元素 ID / ID of the injected <style> element
const STYLE_EL_ID = "fns-share-indicator-style";
// 筛选用的 <style> 元素 ID / ID of the filter <style> element
const FILTER_STYLE_EL_ID = "fns-share-filter-style";

// Lucide share-2 图标（绿色）SVG 字符串 / Lucide share-2 icon (green) SVG string
const SVG_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
// 编码为 CSS background-image 可用的 data URI / Encoded as data URI usable in CSS background-image
const SVG_URI = `data:image/svg+xml,${encodeURIComponent(SVG_STR)}`;

// 分享图标 CSS 属性（所有视图共用）/ Share icon CSS properties (shared across all views)
const ICON_CSS_PROPS = `content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  background-image: url("${SVG_URI}");
  background-size: contain;
  background-repeat: no-repeat;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.85;`;

// 启动后延迟同步，避免与 Obsidian 启动任务竞争网络资源
// Delay sync after startup to avoid competing with Obsidian startup tasks for network resources
const STARTUP_DELAY_MS = 5000;

export class ShareIndicatorManager {
    // 内存中的分享路径集合 / In-memory set of shared paths
    private sharedPaths: Set<string> = new Set();
    // 已注入的 <style> 元素引用 / Reference to the injected <style> element
    private styleEl: HTMLStyleElement | null = null;
    // 筛选用的 <style> 元素引用 / Reference to the filter <style> element
    private filterStyleEl: HTMLStyleElement | null = null;
    // 筛选是否激活 / Whether the filter is active
    private _isFilterActive = false;
    // 网络重连处理器引用（用于 removeEventListener）/ Online handler ref for removeEventListener
    private onlineHandler: (() => void) | null = null;
    // 上一次生成的 CSS 内容，用于变更检测防止无限循环 (Last generated CSS content for change detection to prevent infinite loops)
    private lastGeneratedCss: string = "";
    // 防抖定时器 / Debounce timer
    private regenerateTimer: ReturnType<typeof setTimeout> | null = null;
    // 启动延迟定时器 / Startup delay timer
    private startupTimer: ReturnType<typeof setTimeout> | null = null;
    // 并发同步守卫，防止多个 syncWithServer 同时执行 / Concurrent sync guard to prevent multiple syncWithServer calls running simultaneously
    private isSyncing = false;

    constructor(private plugin: FastSync) {}

    /**
     * 初始化：从 data.json 加载本地缓存立即注入 CSS，然后延迟从服务器同步
     * Initialize: load local cache from data.json and inject CSS immediately, then sync from server after delay
     */
    async initialize(): Promise<void> {
        // 防止重复调用导致监听器和定时器泄漏 / Prevent listener and timer leaks on re-initialization
        if (this.startupTimer !== null) {
            clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
        if (this.regenerateTimer !== null) {
            clearTimeout(this.regenerateTimer);
            this.regenerateTimer = null;
        }
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }

        // 从持久化设置中恢复缓存，立即注入 CSS（不等待网络）
        // Restore cache from persisted settings, inject CSS immediately (no network wait)
        const saved = this.plugin.settings.sharedPaths ?? [];
        this.sharedPaths = new Set(saved);
        this.regenerateCss();

        // 注册设备上线事件：重连后全量同步分享状态
        // Register online event: full sync share state on reconnect
        this.onlineHandler = () => {
            setTimeout(() => this.syncWithServer().catch(() => {}), STARTUP_DELAY_MS);
        };
        window.addEventListener("online", this.onlineHandler);

        // 启动后延迟 5s 再同步，避免与 Obsidian 其他启动任务竞争网络资源
        // Delay sync by 5s after startup to avoid competing with other Obsidian startup tasks
        this.startupTimer = setTimeout(() => {
            this.syncWithServer().catch(() => {});
        }, STARTUP_DELAY_MS);
    }

    /**
     * 从服务端全量拉取分享路径并更新本地缓存和 CSS
     * Full fetch share paths from server, update local cache and CSS
     */
    async syncWithServer(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;
        try {
            if (!this.plugin.settings.api || !this.plugin.settings.apiToken) return;

            // 在拉取分享列表前，先执行探测以确保 runApi 是最新的
            // Execute probe before fetching share list to ensure runApi is up-to-date
            await this.plugin.api.probeApiRedirect(this.plugin.runApi);
            // 不再因为探测失败而中断，让下方的业务请求自行处理连接问题
            // No longer interrupt due to probe failure; let the business request below handle connection issues

            const paths = await this.plugin.api.getSharePaths();
            if (paths === null) return; // 网络错误，静默失败 / Network error, fail silently

            // 路径集合未变更时跳过写盘和 CSS 重建
            // Skip saveData and CSS rebuild when path set is unchanged
            const newSet = new Set(paths);
            if (this.sharedPaths.size === newSet.size && paths.every(p => this.sharedPaths.has(p))) return;

            this.sharedPaths = newSet;
            this.plugin.settings.sharedPaths = paths;
            await this.plugin.saveData(this.plugin.settings);
            this.regenerateCss();
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 添加分享路径、持久化并更新 CSS（用户在本设备创建分享时调用）
     * Add a shared path, persist, and update CSS (called when user creates a share on this device)
     */
    async addSharedPath(path: string): Promise<void> {
        this.sharedPaths.add(path);
        this.plugin.settings.sharedPaths = Array.from(this.sharedPaths);
        await this.plugin.saveData(this.plugin.settings);
        this.regenerateCss();
        // 同步更新状态栏分享图标颜色 / Sync status bar share icon color
        this.plugin.menuManager?.updateShareIconColor();
    }

    /**
     * 移除分享路径、持久化并更新 CSS（用户在本设备取消分享时调用）
     * Remove a shared path, persist, and update CSS (called when user cancels a share on this device)
     */
    async removeSharedPath(path: string): Promise<void> {
        this.sharedPaths.delete(path);
        this.plugin.settings.sharedPaths = Array.from(this.sharedPaths);
        await this.plugin.saveData(this.plugin.settings);
        this.regenerateCss();
        // 同步更新状态栏分享图标颜色 / Sync status bar share icon color
        this.plugin.menuManager?.updateShareIconColor();
        // 如果筛选激活且没有分享路径了，自动关闭筛选
        // If filter is active and no shared paths remain, auto-deactivate filter
        if (this._isFilterActive && this.sharedPaths.size === 0) {
            this._isFilterActive = false;
            this.removeFilterCss();
        } else if (this._isFilterActive) {
            // 更新筛选 CSS 以反映最新的分享列表
            // Update filter CSS to reflect the latest shared paths
            this.injectFilterCss();
        }
    }

    /**
     * 获取当前分享中的路径数量
     * Get the count of currently shared paths
     */
    getSharedCount(): number {
        return this.sharedPaths.size;
    }

    /**
     * 判断指定路径是否正在分享中（O(1) Set 查找）
     * Check if a given path is currently shared (O(1) Set lookup)
     */
    hasPath(path: string): boolean {
        return this.sharedPaths.has(path);
    }

    /**
     * 获取筛选是否激活
     * Get whether the filter is active
     */
    get isFilterActive(): boolean {
        return this._isFilterActive;
    }

    /**
     * 切换筛选状态：激活时注入筛选 CSS 并展开相关文件夹，取消时移除
     * Toggle filter state: inject filter CSS and expand folders when activating, remove when deactivating
     */
    toggleFilter(): void {
        this._isFilterActive = !this._isFilterActive;
        if (this._isFilterActive) {
            const ancestors = this.getAllAncestorFolders();
            this.injectFilterCss(ancestors);
            this.expandSharedFolders(ancestors);
        } else {
            this.removeFilterCss();
        }
    }

    /**
     * 收集所有分享路径的祖先文件夹路径（去重）
     * Collect all ancestor folder paths for shared paths (deduplicated)
     */
    private getAllAncestorFolders(): Set<string> {
        const folders = new Set<string>();
        for (const path of this.sharedPaths) {
            const parts = path.split("/");
            // 跳过最后一段（文件名），逐级构建祖先路径
            // Skip last segment (filename), build ancestor paths level by level
            for (let i = 1; i < parts.length; i++) {
                folders.add(parts.slice(0, i).join("/"));
            }
        }
        return folders;
    }

    /**
     * 注入筛选 CSS，隐藏原生文件浏览器中非分享文件和空文件夹
     * Inject filter CSS to hide non-shared files and empty folders in native file explorer
     */
    private injectFilterCss(ancestors?: Set<string>): void {
        const rules: string[] = [];

        if (this.sharedPaths.size === 0) {
            this.removeFilterCss();
            return;
        }

        // 原生文件浏览器：隐藏所有文件项
        // Native file explorer: hide all file items
        rules.push(`.nav-file { display: none !important; }`);

        // 隐藏不包含分享文件的文件夹（排除根文件夹）
        // Hide folders that don't contain shared files (exclude root folder)
        rules.push(`.nav-folder:not(.mod-root) { display: none !important; }`);

        for (const path of this.sharedPaths) {
            // 原生文件浏览器：显示分享的文件
            // Native file explorer: show shared files
            rules.push(`.nav-file:has(.nav-file-title[data-path="${path}"]) { display: block !important; }`);
        }

        // 显示所有祖先文件夹（包含分享文件的直接父级及更上层）
        // Show all ancestor folders (direct parents and higher ancestors of shared files)
        for (const folderPath of (ancestors ?? this.getAllAncestorFolders())) {
            rules.push(`.nav-folder:has(> .nav-folder-title[data-path="${folderPath}"]) { display: block !important; }`);
        }

        const newCss = rules.join("\n");
        const existingEl = document.getElementById(FILTER_STYLE_EL_ID) as HTMLStyleElement;
        
        if (existingEl) {
            if (existingEl.textContent === newCss) return;
            existingEl.textContent = newCss;
        } else {
            const el = document.createElement("style");
            el.id = FILTER_STYLE_EL_ID;
            el.textContent = newCss;
            document.head.appendChild(el);
            this.filterStyleEl = el;
        }
    }

    /**
     * 移除筛选 CSS，恢复所有文件显示
     * Remove filter CSS to restore all files display
     */
    private removeFilterCss(): void {
        document.getElementById(FILTER_STYLE_EL_ID)?.remove();
        this.filterStyleEl = null;
    }

    /**
     * 展开包含分享文件的文件夹（原生文件浏览器）
     * Expand folders that contain shared files (native file explorer)
     */
    private expandSharedFolders(ancestors?: Set<string>): void {
        for (const folderPath of (ancestors ?? this.getAllAncestorFolders())) {
            // 查找折叠状态的文件夹并展开
            // Find collapsed folders and expand them
            const folderEl = document.querySelector(
                `.nav-folder:has(> .nav-folder-title[data-path="${folderPath}"]).is-collapsed`
            );
            if (folderEl) {
                const titleEl = folderEl.querySelector(".nav-folder-title") as HTMLElement | null;
                titleEl?.click();
            }
        }
    }

    /**
     * 移除注入的 <style> 元素并清理事件监听（插件卸载时调用）
     * Remove injected <style> and clean up event listeners (called on plugin unload)
     */
    unload(): void {
        if (this.startupTimer !== null) {
            clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
        if (this.regenerateTimer !== null) {
            clearTimeout(this.regenerateTimer);
            this.regenerateTimer = null;
        }
        if (this.onlineHandler) {
            window.removeEventListener("online", this.onlineHandler);
            this.onlineHandler = null;
        }
        this.styleEl?.remove();
        this.styleEl = null;
        this.lastGeneratedCss = "";
        // 清理筛选样式 / Clean up filter style
        this.filterStyleEl?.remove();
        this.filterStyleEl = null;
        this._isFilterActive = false;
    }

    /**
     * 重新生成 CSS 规则并注入到 document.head
     * Regenerate CSS rules and inject into document.head
     */
    public regenerateCss(): void {
        // 使用防抖，防止高频触发（尤其是 css-change 事件引起的递归循环）
        // Use debounce to prevent high-frequency triggers (especially recursive loops caused by css-change events)
        if (this.regenerateTimer !== null) {
            clearTimeout(this.regenerateTimer);
        }

        this.regenerateTimer = setTimeout(() => {
            this.performRegenerateCss();
            this.regenerateTimer = null;
        }, 50);
    }

    /**
     * 执行真正的 CSS 重建逻辑
     * Execute actual CSS regeneration logic
     */
    private performRegenerateCss(): void {
        // 如果未开启分享图标显示，或没有分享路径，则清理并退出
        if (!this.plugin.settings.showShareIcon || this.sharedPaths.size === 0) {
            if (this.lastGeneratedCss !== "") {
                document.getElementById(STYLE_EL_ID)?.remove();
                this.styleEl = null;
                this.lastGeneratedCss = "";
            }
            return;
        }

        const rules: string[] = [];
        for (const path of this.sharedPaths) {
            // 三种视图共用相同图标样式，仅选择器不同
            // All three views share the same icon style, only selectors differ
            const selectors = [
                `[data-drag-path="${path}"] .nn-navitem-name::before`,  // Notebook Navigator 导航树 / nav tree
                `[data-drag-path="${path}"] .nn-file-name::before`,     // Notebook Navigator 笔记列表 / file list
                `.nav-file-title[data-path="${path}"] .nav-file-title-content::before`, // 原生文件浏览器 / native explorer
            ];
            rules.push(`${selectors.join(",\n")} {\n${ICON_CSS_PROPS}\n}`);
        }

        const newCss = rules.join("\n");

        // 变更检测：如果内容未变，不执行 DOM 操作，彻底切断 css-change 无限循环
        // Change detection: If content unchanged, skip DOM ops to break css-change infinite loop
        if (newCss === this.lastGeneratedCss) return;

        const existingEl = document.getElementById(STYLE_EL_ID) as HTMLStyleElement;
        if (existingEl) {
            existingEl.textContent = newCss;
        } else {
            const el = document.createElement("style");
            el.id = STYLE_EL_ID;
            el.textContent = newCss;
            document.head.appendChild(el);
            this.styleEl = el;
        }
        this.lastGeneratedCss = newCss;
    }
}
