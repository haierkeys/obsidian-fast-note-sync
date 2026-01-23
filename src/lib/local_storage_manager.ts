import { configModify } from "./config_operator";
import { hashContent, dump } from "./helps";
import type FastSync from "../main";


/**
 * LocalStorage 管理器
 * 负责将 localStorage 中的特定项映射为虚拟文件进行同步
 */
export class LocalStorageManager {
    private plugin: FastSync;
    public prefix: string = "_localStorage/";
    private lastHashes: Map<string, string> = new Map();
    private watchTimer: number | null = null;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
    }

    /**
     * 启动定时检查
     */
    startWatch() {
        if (this.watchTimer) return;

        // 尝试加载持久化的哈希表
        this.loadHashes();

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
                // 内容发生变化，通过配置操作器触发同步
                const path = this.keyToPath(key);
                configModify(path, this.plugin, false, val);

                this.lastHashes.set(key, currentHash);
                this.saveHashes();
            }
        }
    }

    /**
     * 获取当前笔记库专用的持久化键名
     */
    private getHashStorageKey(): string {
        const vaultName = this.plugin.app.vault.getName();
        return `obsidian-fast-sync-local-storage-hashes-${vaultName}`;
    }

    /**
     * 保存哈希表到 localStorage
     */
    private saveHashes() {
        try {
            const obj = Object.fromEntries(this.lastHashes);
            localStorage.setItem(this.getHashStorageKey(), JSON.stringify(obj));
        } catch (e) {
            dump("保存 LocalStorage 哈希表失败:", e);
        }
    }

    /**
     * 从 localStorage 加载哈希表
     */
    private loadHashes() {
        try {
            const stored = localStorage.getItem(this.getHashStorageKey());
            if (stored) {
                const obj = JSON.parse(stored);
                this.lastHashes = new Map(Object.entries(obj));
            }
        } catch (e) {
            dump("加载 LocalStorage 哈希表失败:", e);
            this.lastHashes = new Map();
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
        return `${this.prefix}${key}`;
    }

    /**
     * 将虚拟路径转换为键
     */
    pathToKey(path: string): string | null {
        if (path.startsWith(this.prefix)) {
            return path.substring(this.prefix.length);
        }
        return null;
    }

    /**
     * 读取 localStorage 项的内容
     */
    getItemValue(key: string): string | null {
        return localStorage.getItem(key);
    }

    /**
     * 写入 localStorage 项的内容
     */
    setItemValue(key: string, value: string): void {
        localStorage.setItem(key, value);
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

            configs.push({
                path: path,
                pathHash: hashContent(path),
                contentHash: contentHash,
                mtime: Date.now(), // localStorage 没有 mtime，使用当前时间
                size: value.length,
                isLocalStorage: true // 标记为 localStorage 项
            });
        }

        return configs;
    }

    /**
     * 处理接收到的 localStorage 更新
     */
    async handleReceivedUpdate(path: string, content: string): Promise<boolean> {
        const key = this.pathToKey(path);
        if (key) {
            this.setItemValue(key, content);
            // 同步更新哈希值，防止产生回环同步
            this.lastHashes.set(key, hashContent(content));
            this.saveHashes();
            return true;
        }
        return false;
    }
}
