import { hashContent, dump, SyncRule } from "../utils/helpers";
import { configModify } from "../sync/operator_config";
import type FastSync from "../../main";


/**
 * LocalStorage 管理器
 * 负责将 localStorage 中的特定项映射为虚拟文件进行同步
 */
export class LocalStorageManager {
    private plugin: FastSync;
    /**
     * 同步虚拟路径前缀
     */
    public syncPathPrefix: string = "_localStorage/";
    private lastHashes: Map<string, string> = new Map();
    private lastMtimes: Map<string, number> = new Map();
    private watchTimer: number | null = null;
    private storageHandler: ((event: StorageEvent) => void) | null = null;

    /**
     * 底层读原子操作
     */
    private read(key: string): string | null {
        return this.plugin.app.loadLocalStorage(key) as string | null;
    }
    

    private write(key: string, value: string | null): void {
        this.plugin.app.saveLocalStorage(key, value);
    }

    private getInternalKey(field: string): string {
        // Obsidian 的 loadLocalStorage/saveLocalStorage 已按 vault(appId) 隔离，无需再叠加 vault 显示名做前缀。
        // 旧实现用 `fns-${vaultName}-${field}`：vault 一旦被改名（iCloud 手机端同步冲突会把库文件夹改成 "Vault 1" 等，
        // 非常常见），新 key 读不到旧值 → api/token/vault 被判为空 → 又被回存覆盖，同步配置永久丢失。
        // 改用与 vault 名无关的稳定 key，配合 getMetadata 的历史键迁移逻辑找回旧数据。
        return `fns-${field}`;
    }

    getMetadata(field: 'lastNoteSyncTime' | 'lastFileSyncTime' | 'lastConfigSyncTime' | 'lastFolderSyncTime' | 'lastSyncSuccessTime' | 'clientName' | 'isInitSync' | 'serverVersion' | 'serverChangelog' | 'serverVersionIsNew' | 'serverVersionNewName' | 'serverVersionNewLink' | 'serverVersionNewChangelogContent' | 'serverVersionChangelogContent' | 'pluginVersionIsNew' | 'pluginVersionNewName' | 'pluginVersionNewLink' | 'pluginVersionNewChangelogContent' | 'pluginVersionChangelogContent' | 'internalExcludes' | 'apiToken' | 'apiUrl' | 'vault' | 'autoRedirectEnabled' | 'wsPreProbeEnabled' | 'serverVersionHistory' | 'pluginVersionHistory'): unknown {
        const newKey = this.getInternalKey(field);
        let value = this.read(newKey);

        // 迁移逻辑：新 key 读不到时，依次回溯历史格式的键，命中即迁移到新的稳定 key
        if (value === null) {
            const vaultName = this.plugin.app.vault.getName();
            const remoteVault = this.plugin.settings.vault;
            // 按由新到旧的顺序尝试历史键格式
            const legacyKeys = [
                `fns-${vaultName}-${field}`,                // 上一版：绑定本地库名
                `fast-note-sync-${vaultName}-${field}`,     // 更早版：绑定本地库名
            ];
            // 若设置里存有与当前不同的远端库名，再补上远端库名格式（应对早期改名场景）
            if (remoteVault && remoteVault !== vaultName) {
                legacyKeys.push(`fns-${remoteVault}-${field}`);
                legacyKeys.push(`fast-note-sync-${remoteVault}-${field}`);
            }

            let oldValue: string | null = null;
            for (const legacyKey of legacyKeys) {
                oldValue = this.read(legacyKey);
                if (oldValue !== null) break;
            }

            if (oldValue !== null) {
                value = oldValue;
                // 自动同步到新键
                this.write(newKey, value);
            }
        }
        if (field.endsWith('Time')) {
            return value ? Number(value) : 0;
        }
        if (field === 'isInitSync' || field === 'serverVersionIsNew' || field === 'pluginVersionIsNew') {
            return value === 'true';
        }
        return value || "";
    }

    /**
     * 设置元数据项
     */
    setMetadata(field: 'lastNoteSyncTime' | 'lastFileSyncTime' | 'lastConfigSyncTime' | 'lastFolderSyncTime' | 'lastSyncSuccessTime' | 'clientName' | 'isInitSync' | 'serverVersion' | 'serverChangelog' | 'serverVersionIsNew' | 'serverVersionNewName' | 'serverVersionNewLink' | 'serverVersionNewChangelogContent' | 'serverVersionChangelogContent' | 'pluginVersionIsNew' | 'pluginVersionNewName' | 'pluginVersionNewLink' | 'pluginVersionNewChangelogContent' | 'pluginVersionChangelogContent' | 'internalExcludes' | 'apiToken' | 'apiUrl' | 'vault' | 'autoRedirectEnabled' | 'wsPreProbeEnabled' | 'serverVersionHistory' | 'pluginVersionHistory', value: unknown): void {
        this.write(this.getInternalKey(field), String(value));
    }

    /**
     * 获取内部排除规则 (Internal Sync Excludes)
     */
    getInternalExcludes(): SyncRule[] {
        const value = this.getMetadata('internalExcludes');
        if (!value) return [];
        try {
            return JSON.parse(value as string) as SyncRule[];
        } catch (e) {
            dump("[LocalStorageManager] Failed to parse internalExcludes:", e);
            return [];
        }
    }

    /**
     * 设置内部排除规则 (Internal Sync Excludes)
     */
    setInternalExcludes(rules: SyncRule[]): void {
        this.setMetadata('internalExcludes', JSON.stringify(rules));
    }

    // --- pending 持久化方法 ---
    // Pending persistence methods: protect against data loss on crash

    /**
     * 将内存中的 pending Map 序列化写入 localStorage
     * Serialize in-memory pending Map to localStorage
     */
    savePending(field: 'pendingNoteModifies' | 'pendingUploadHashes' | 'pendingConfigModifies', map: Map<string, string>): void {
        try {
            this.write(this.getInternalKey(field), JSON.stringify(Object.fromEntries(map)));
        } catch (e) {
            dump(`[LocalStorageManager] Failed to persist ${field}:`, e);
        }
    }

    /**
     * 从 localStorage 加载 pending Map，并过滤本地已不存在的路径
     * Load pending Map from localStorage, filtering out paths that no longer exist locally
     */
    loadPending(field: 'pendingNoteModifies' | 'pendingUploadHashes' | 'pendingConfigModifies'): Map<string, string> {
        try {
            const raw = this.read(this.getInternalKey(field));
            if (!raw) return new Map();
            const obj = JSON.parse(raw) as Record<string, string>;
            return new Map(Object.entries(obj));
        } catch (e) {
            dump(`[LocalStorageManager] Failed to load pending ${field}:`, e);
            return new Map();
        }
    }

    /**
     * 清除 localStorage 中的 pending 持久化数据
     * Clear persisted pending data from localStorage
     */
    clearPending(field: 'pendingNoteModifies' | 'pendingUploadHashes' | 'pendingConfigModifies'): void {
        const key = this.getInternalKey(field);
        this.plugin.app.saveLocalStorage(key, null);
    }

    /**
     * 清理所有同步记录时间戳，同时清除持久化的冲突路径记录
     * Clear all sync timestamps and persisted conflicted paths.
     * Must be called together when the user resets the sync cache,
     * so stale conflict paths don't ghost-resurrect after a fresh sync.
     */
    clearSyncTime(): void {
        this.setMetadata('lastNoteSyncTime', 0);
        this.setMetadata('lastFileSyncTime', 0);
        this.setMetadata('lastConfigSyncTime', 0);
        this.setMetadata('lastFolderSyncTime', 0);
        this.setMetadata('isInitSync', false);
        // 同步清除持久化的冲突路径，避免重启后旧冲突记录在全新同步后误触发冲突列表弹窗
        // Also clear persisted conflicted paths so stale conflicts don't re-surface after a fresh sync
        this.setConflictedPaths(new Set());
    }

    constructor(plugin: FastSync) {
        this.plugin = plugin;
    }

    /**
     * 启动定时检查
     */
    startWatch() {
        if (this.watchTimer) return;

        dump("[LocalStorageManager] Starting watch...");
        // 加载持久化的哈希和时间戳状态
        this.loadState();

        // 1. 注册工作区布局就绪事件 (Check on layout ready)
        this.plugin.app.workspace.onLayoutReady(() => {
            void this.checkChanges();
        });

        // 2. 注册活动笔记切换事件 (Check when switching notes)
        this.plugin.registerEvent(
            this.plugin.app.workspace.on("active-leaf-change", () => {
                void this.checkChanges();
            })
        );

        // 3. 监听跨窗口/标签页的 localStorage 变更 (Listen for cross-tab changes)
        if (this.storageHandler) {
            window.removeEventListener("storage", this.storageHandler);
        }
        this.storageHandler = (e) => {
            if (e.key && this.getKeys().includes(e.key)) {
                void this.checkChanges();
            }
        };
        window.addEventListener("storage", this.storageHandler);

        // 标记为已启动 (Reuse watchTimer as a boolean flag)
        this.watchTimer = 1;
    }

    /**
     * 停止定时检查 (Cleanup handled by plugin.registerEvent)
     */
    stopWatch() {
        if (this.storageHandler) {
            window.removeEventListener("storage", this.storageHandler);
            this.storageHandler = null;
        }
        this.watchTimer = null;
    }

    /**
     * 检查变更并触发同步
     */
    private async checkChanges() {
        // 如果未连接或未初始化，跳过检查
        if (!this.plugin.websocket || !this.plugin.websocket.isConnected()) {
            // dump("[LocalStorageManager] Skip check: WebSocket not ready or not connected.");
            return;
        }
        if (this.plugin.isSyncing) {
            // dump("[LocalStorageManager] Skip check: Syncing in progress.");
            return;
        }
        if (!this.plugin.isFirstSync) {
            // dump("[LocalStorageManager] Skip check: First sync not completed.");
            return;
        }
        if (!this.plugin.settings.configSyncEnabled) {
            // dump("[LocalStorageManager] Skip check: Config sync disabled.");
            return;
        }

        const keys = this.getKeys();
        for (const key of keys) {
            const val = this.getItemValue(key);
            if (val === null) continue;

            const currentHash = hashContent(val);
            const lastHash = this.lastHashes.get(key);

            if (currentHash !== lastHash) {
                dump(`[LocalStorageManager] Detected change in key: ${key}`);
                // 内容发生变化，更新时间戳并触发同步
                const mtime = Date.now();
                this.lastHashes.set(key, currentHash);
                this.lastMtimes.set(key, mtime);
                this.saveState();

                const path = this.keyToPath(key);
                dump(`[LocalStorageManager] Triggering configModify for path: ${path}`);
                void configModify(path, this.plugin, false, val);
            }
        }
    }

    /**
     * 保存状态（哈希表和时间戳）到 localStorage
     */
    private saveState() {
        try {
            const state = {
                hashes: Object.fromEntries(this.lastHashes),
                mtimes: Object.fromEntries(this.lastMtimes)
            };
            this.write(this.getInternalKey("local-storage-state"), JSON.stringify(state));
            dump("[LocalStorageManager] State saved.");
        } catch (e) {
            dump("[LocalStorageManager] Failed to save state:", e);
        }
    }

    /**
     * 从 localStorage 加载状态
     */
    private loadState() {
        try {
            const stored = this.read(this.getInternalKey("local-storage-state"));
            if (stored) {
                const state = JSON.parse(stored) as { hashes?: Record<string, string>; mtimes?: Record<string, number> };
                if (state.hashes) this.lastHashes = new Map(Object.entries(state.hashes));
                if (state.mtimes) this.lastMtimes = new Map(Object.entries(state.mtimes));
                dump("[LocalStorageManager] State loaded from storage.");
            } else {
                // 兼容旧版
                const oldHashes = this.read(this.getInternalKey("local-storage-hashes"));
                if (oldHashes) {
                    this.lastHashes = new Map(Object.entries(JSON.parse(oldHashes) as Record<string, string>));
                    dump("[LocalStorageManager] Old hashes loaded.");
                } else {
                    dump("[LocalStorageManager] No stored state found.");
                }
            }
        } catch (e) {
            dump("[LocalStorageManager] Failed to load state:", e);
        }
    }

    /**
    * 获取需要同步的键列表
    */
    getKeys(): string[] {
        const keys: string[] = [];
        if (this.plugin.settings.pdfSyncEnabled) {
            keys.push("pdfjs.history");
        }
        return keys;
    }

    /**
     * 将键转换为虚拟路径
     */
    keyToPath(key: string): string {
        return `${this.syncPathPrefix}${key}`;
    }

    /**
     * 将虚拟路径转换为键
     */
    pathToKey(path: string): string | null {
        if (path.startsWith(this.syncPathPrefix)) {
            return path.substring(this.syncPathPrefix.length);
        }
        return null;
    }

    /**
     * 读取同步项内容
     */
    getItemValue(key: string): string | null {
        return this.read(key);
    }

    /**
     * 写入同步项内容
     */
    setItemValue(key: string, value: string): void {
        this.write(key, value);
    }

    /**
     * 获取所有同步项的虚拟配置信息
     */
    async getStorageConfigs(): Promise<{ path: string; pathHash: string; contentHash: string; mtime: number; ctime: number; size: number; isLocalStorage: boolean }[]> {
        const keys = this.getKeys();
        const configs = [];

        for (const key of keys) {
            const value = this.getItemValue(key);
            if (value === null) continue;

            const contentHash = hashContent(value);
            const path = this.keyToPath(key);

            // 优先使用持久化记录的 mtime，若无则使用当前时间并持久化
            let mtime = this.lastMtimes.get(key);
            if (!mtime) {
                mtime = Date.now();
                this.lastMtimes.set(key, mtime);
                this.lastHashes.set(key, contentHash);
                this.saveState();
            }

            configs.push({
                path: path,
                pathHash: hashContent(path),
                contentHash: contentHash,
                mtime: mtime,
                ctime: mtime,
                size: value.length,
                isLocalStorage: true
            });
        }

        return configs;
    }

    /**
     * 处理接收到的同步项更新
     */
    async handleReceivedUpdate(path: string, content: string): Promise<boolean> {
        const key = this.pathToKey(path);
        if (key) {
            dump(`[LocalStorageManager] Received remote update for key: ${key}`);
            const contentHash = hashContent(content);
            this.setItemValue(key, content);

            // 更新本地哈希和时间戳状态，防止产生回环同步
            this.lastHashes.set(key, contentHash);
            this.lastMtimes.set(key, Date.now()); // 远端同步过来视为一次修改
            this.saveState();
            return true;
        }
        return false;
    }

    /**
     * 获取持久化挂起冲突的文件路径集合
     */
    getConflictedPaths(): Set<string> {
        try {
            const raw = this.read("fns-conflicted-paths");
            if (!raw) return new Set();
            const arr = JSON.parse(raw) as string[];
            return new Set(arr);
        } catch (e) {
            dump("[LocalStorageManager] Failed to load conflicted paths:", e);
            return new Set();
        }
    }

    /**
     * 保存持久化挂起冲突的文件路径集合
     */
    setConflictedPaths(paths: Set<string>): void {
        try {
            this.write("fns-conflicted-paths", JSON.stringify(Array.from(paths)));
        } catch (e) {
            dump("[LocalStorageManager] Failed to save conflicted paths:", e);
        }
    }
}
