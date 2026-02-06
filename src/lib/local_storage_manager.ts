import { configModify } from "./config_operator";
import { hashContent, dump } from "./helps";
import type FastSync from "../main";


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

    /**
     * 底层读原子操作
     */
    private read(key: string): string | null {
        return localStorage.getItem(key);
    }

    /**
     * 底层写原子操作
     */
    private write(key: string, value: string): void {
        localStorage.setItem(key, value);
    }

    /**
     * 获取内部私有数据的完整键名（带插件和笔记库前缀）
     */
    private getInternalKey(field: string): string {
        const vaultName = this.plugin.settings.vault || this.plugin.app.vault.getName();
        return `fast-note-sync-${vaultName}-${field}`;
    }

    /**
     * 获取元数据项
     */
    getMetadata(field: 'lastNoteSyncTime' | 'lastFileSyncTime' | 'lastConfigSyncTime' | 'lastFolderSyncTime' | 'clientName' | 'isInitSync' | 'serverVersion' | 'serverVersionIsNew' | 'serverVersionNewName' | 'serverVersionNewLink' | 'pluginVersionIsNew' | 'pluginVersionNewName' | 'pluginVersionNewLink'): any {
        const value = this.read(this.getInternalKey(field));
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
    setMetadata(field: 'lastNoteSyncTime' | 'lastFileSyncTime' | 'lastConfigSyncTime' | 'lastFolderSyncTime' | 'clientName' | 'isInitSync' | 'serverVersion' | 'serverVersionIsNew' | 'serverVersionNewName' | 'serverVersionNewLink' | 'pluginVersionIsNew' | 'pluginVersionNewName' | 'pluginVersionNewLink', value: any): void {
        this.write(this.getInternalKey(field), String(value));
    }

    constructor(plugin: FastSync) {
        this.plugin = plugin;
    }

    /**
     * 启动定时检查
     */
    startWatch() {
        if (this.watchTimer) return;

        // 加载持久化的哈希和时间戳状态
        this.loadState();

        this.watchTimer = window.setInterval(() => {
            this.checkChanges();
        }, 4000);
    }

    /**
     * 停止定时检查
     */
    stopWatch() {
        if (this.watchTimer) {
            window.clearInterval(this.watchTimer);
            this.watchTimer = null;
        }
    }

    /**
     * 检查变更并触发同步
     */
    private async checkChanges() {
        // 如果未连接或未初始化，跳过检查
        if (!this.plugin.websocket.isConnected() || !this.plugin.getWatchEnabled() || !this.plugin.isFirstSync) return;
        if (!this.plugin.settings.configSyncEnabled) return;

        const keys = this.getKeys();
        for (const key of keys) {
            const val = this.getItemValue(key);
            if (val === null) continue;

            const currentHash = hashContent(val);
            const lastHash = this.lastHashes.get(key);

            if (currentHash !== lastHash) {
                // 内容发生变化，更新时间戳并触发同步
                const mtime = Date.now();
                this.lastHashes.set(key, currentHash);
                this.lastMtimes.set(key, mtime);
                this.saveState();

                const path = this.keyToPath(key);
                configModify(path, this.plugin, false, val);
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
        } catch (e) {
            dump("保存 LocalStorage 状态失败:", e);
        }
    }

    /**
     * 从 localStorage 加载状态
     */
    private loadState() {
        try {
            const stored = this.read(this.getInternalKey("local-storage-state"));
            if (stored) {
                const state = JSON.parse(stored);
                if (state.hashes) this.lastHashes = new Map(Object.entries(state.hashes));
                if (state.mtimes) this.lastMtimes = new Map(Object.entries(state.mtimes));
            } else {
                // 兼容旧版
                const oldHashes = this.read(this.getInternalKey("local-storage-hashes"));
                if (oldHashes) {
                    this.lastHashes = new Map(Object.entries(JSON.parse(oldHashes)));
                }
            }
        } catch (e) {
            dump("加载 LocalStorage 状态失败:", e);
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
    async getStorageConfigs(): Promise<any[]> {
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
}
