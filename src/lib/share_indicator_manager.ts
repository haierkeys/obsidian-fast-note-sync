import type FastSync from "../main";

// 注入的 <style> 元素 ID / ID of the injected <style> element
const STYLE_EL_ID = "fns-share-indicator-style";

// Lucide share-2 图标（绿色）SVG 字符串 / Lucide share-2 icon (green) SVG string
const SVG_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
// 编码为 CSS background-image 可用的 data URI / Encoded as data URI usable in CSS background-image
const SVG_URI = `data:image/svg+xml,${encodeURIComponent(SVG_STR)}`;

// 启动后延迟同步，避免与 Obsidian 启动任务竞争网络资源
// Delay sync after startup to avoid competing with Obsidian startup tasks for network resources
const STARTUP_DELAY_MS = 5000;

// 重连后延迟，等待网络连接稳定
// Delay after reconnect to wait for network connection to stabilize
const RECONNECT_DELAY_MS = 2000;

export class ShareIndicatorManager {
    // 内存中的分享路径集合 / In-memory set of shared paths
    private sharedPaths: Set<string> = new Set();
    // 已注入的 <style> 元素引用 / Reference to the injected <style> element
    private styleEl: HTMLStyleElement | null = null;
    // 网络重连处理器引用（用于 removeEventListener）/ Online handler ref for removeEventListener
    private onlineHandler: (() => void) | null = null;
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
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }

        // 从持久化设置中恢复缓存，立即注入 CSS（不等待网络）
        // Restore cache from persisted settings, inject CSS immediately (no network wait)
        const saved = this.plugin.settings.sharedPaths ?? [];
        this.sharedPaths = new Set(saved);
        this.regenerateCss();

        // 注册设备上线事件：重连后增量同步，恢复离线期间的变更
        // Register online event: incremental sync on reconnect to recover offline changes
        this.onlineHandler = () => {
            setTimeout(() => this.syncWithServer().catch(() => {}), RECONNECT_DELAY_MS);
        };
        window.addEventListener("online", this.onlineHandler);

        // 启动后延迟 5s 再同步，避免与 Obsidian 其他启动任务竞争网络资源
        // Delay sync by 5s after startup to avoid competing with other Obsidian startup tasks
        this.startupTimer = setTimeout(() => {
            this.syncWithServer().catch(() => {});
        }, STARTUP_DELAY_MS);
    }

    /**
     * 增量优先的服务端同步：有 lastShareSyncTime 时走增量，否则全量拉取
     * Delta-first server sync: use incremental if lastShareSyncTime exists, else full refresh
     */
    async syncWithServer(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;
        try {
            if (!this.plugin.settings.api || !this.plugin.settings.apiToken) return;

            const lastSyncTime = Number(
                this.plugin.localStorageManager?.getMetadata("lastShareSyncTime") ?? 0
            );

            if (lastSyncTime > 0) {
                // 增量同步 / Incremental sync
                const changes = await this.plugin.api.getShareChanges(lastSyncTime);
                if (changes === null) return; // 网络错误，静默失败 / Network error, fail silently

                if (changes.fullRefreshRequired) {
                    await this._fullRefresh();
                } else {
                    // 应用增量变更 / Apply delta changes
                    for (const p of changes.removed) this.sharedPaths.delete(p);
                    for (const p of changes.added) this.sharedPaths.add(p);
                    this.plugin.settings.sharedPaths = Array.from(this.sharedPaths);
                    await this.plugin.saveData(this.plugin.settings);
                    this.plugin.localStorageManager?.setMetadata("lastShareSyncTime", changes.lastTime);
                    this.regenerateCss();
                }
            } else {
                // 首次同步，全量拉取 / First sync: full fetch
                await this._fullRefresh();
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 全量拉取并覆盖本地缓存
     * Full fetch: overwrite local cache with server's complete active share list
     */
    private async _fullRefresh(): Promise<void> {
        const paths = await this.plugin.api.getSharePaths();
        if (paths === null) return; // 网络错误，静默失败 / Network error, fail silently
        this.sharedPaths = new Set(paths);
        this.plugin.settings.sharedPaths = paths;
        await this.plugin.saveData(this.plugin.settings);
        // 记录全量拉取完成的时间戳，供后续增量请求使用
        // Record timestamp of full fetch completion for future delta requests
        this.plugin.localStorageManager?.setMetadata("lastShareSyncTime", Date.now());
        this.regenerateCss();
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
        if (this.onlineHandler) {
            window.removeEventListener("online", this.onlineHandler);
            this.onlineHandler = null;
        }
        this.styleEl?.remove();
        this.styleEl = null;
    }

    /**
     * 重新生成 CSS 规则并注入到 document.head
     * Regenerate CSS rules and inject into document.head
     */
    private regenerateCss(): void {
        // 移除旧的 style 元素 / Remove old style element
        document.getElementById(STYLE_EL_ID)?.remove();
        this.styleEl = null;

        if (this.sharedPaths.size === 0) return;

        const rules: string[] = [];
        for (const path of this.sharedPaths) {
            // Notebook Navigator 导航树视图: 图标在标题左侧 via ::before 伪元素
            // Notebook Navigator nav tree view: icon left of title via ::before pseudo-element
            rules.push(`[data-drag-path="${path}"] .nn-navitem-name::before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  background-image: url("${SVG_URI}");
  background-size: contain;
  background-repeat: no-repeat;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.85;
}`);

            // Notebook Navigator 笔记列表视图: 图标在标题左侧 via ::before 伪元素
            // Notebook Navigator file list view: icon left of title via ::before pseudo-element
            rules.push(`[data-drag-path="${path}"] .nn-file-name::before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  background-image: url("${SVG_URI}");
  background-size: contain;
  background-repeat: no-repeat;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.85;
}`);

            // 原生文件浏览器: 图标在文件名左侧 via ::before 伪元素
            // Native file explorer: icon left of filename via ::before pseudo-element
            rules.push(`.nav-file-title[data-path="${path}"] .nav-file-title-content::before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  background-image: url("${SVG_URI}");
  background-size: contain;
  background-repeat: no-repeat;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.85;
}`);
        }

        const el = document.createElement("style");
        el.id = STYLE_EL_ID;
        el.textContent = rules.join("\n");
        document.head.appendChild(el);
        this.styleEl = el;
    }
}
