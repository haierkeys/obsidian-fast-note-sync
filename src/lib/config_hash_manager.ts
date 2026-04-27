import { normalizePath } from "obsidian";

import { hashContent, hashContentAsync, hashArrayBuffer, dump, configIsPathExcluded, getConfigSyncCustomDirs, showSyncNotice } from "./helps";
import { configAllPaths } from "./config_operator";
import type FastSync from "../main";


/**
 * 哈希缓存结构
 */
interface HashCache {
    hash: string;
    mtime: number;
    size: number;
}

/**
 * 配置哈希管理器
 * 负责管理配置文件路径与哈希值的映射关系,存储在 localStorage 中
 */
export class ConfigHashManager {
    private plugin: FastSync;
    private hashMap: Map<string, HashCache> = new Map();
    private storageKey: string;
    private isInitialized: boolean = false;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        // 根据仓库名生成唯一的存储键
        const vaultName = this.plugin.app.vault.getName();
        this.storageKey = `fns-${vaultName}-configHashMap`;
    }

    /**
     * 初始化哈希表
     * 只在 localStorage 不存在时执行完整的配置文件遍历
     */
    async initialize(): Promise<void> {
        dump("ConfigHashManager: 开始初始化");

        // 尝试从 localStorage 加载
        const loaded = this.loadFromStorage();

        if (loaded) {
            dump(`ConfigHashManager: 从 localStorage 加载成功,共 ${this.hashMap.size} 个配置`);
            this.isInitialized = true;
        } else {
            dump("ConfigHashManager: localStorage 中无数据,开始构建配置哈希映射");
            await this.buildConfigHashMap();
            this.isInitialized = true;
        }
    }

    /**
     * 检查是否已初始化
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    private async buildConfigHashMap(): Promise<void> {
        const notice = showSyncNotice("正在初始化配置哈希映射...", 0);

        try {
            // 获取所有配置文件路径
            const configDir = this.plugin.app.vault.configDir;
            const customDirs = getConfigSyncCustomDirs(this.plugin);
            const configPaths = await configAllPaths([configDir, ...customDirs], this.plugin);

            // 添加 LocalStorage 虚拟路径
            const localStorageConfigs = await this.plugin.localStorageManager.getStorageConfigs();
            const allPaths = [...configPaths, ...localStorageConfigs.map(c => c.path)];

            const totalConfigs = allPaths.length;
            let processedConfigs = 0;

            dump(`ConfigHashManager: 开始遍历 ${totalConfigs} 个配置`);

            for (const path of allPaths) {
                // 跳过已排除的配置
                if (configIsPathExcluded(path, this.plugin)) {
                    processedConfigs++;
                    continue;
                }

                let contentHash: string;
                let mtime = 0;
                let size = 0;

                // 检查是否为 LocalStorage 虚拟路径
                if (path.startsWith(this.plugin.localStorageManager.syncPathPrefix)) {
                    const key = this.plugin.localStorageManager.pathToKey(path);
                    if (key) {
                        let value: string | null = this.plugin.localStorageManager.getItemValue(key);
                        if (value) {
                            contentHash = await hashContentAsync(value);
                            this.hashMap.set(path, { hash: contentHash, mtime: 0, size: 0 });
                            value = null; // 显式释放引用 (Explicitly release reference)
                        }
                    }
                } else {
                    // 从文件系统读取配置文件
                    // 注意：configAllPaths 返回的已经是相对于 Vault 的路径，无需再拼接 configDir
                    const filePath = normalizePath(path);
                    try {
                        const stat = await this.plugin.app.vault.adapter.stat(filePath);
                        if (stat) {
                            let contentBuf: ArrayBuffer | null = await this.plugin.app.vault.adapter.readBinary(filePath);
                            contentHash = await hashArrayBuffer(contentBuf);
                            this.hashMap.set(path, { hash: contentHash, mtime: stat.mtime, size: stat.size });
                            contentBuf = null; // 显式释放引用 (Explicitly release reference)
                        }
                    } catch (error) {
                        console.error("读取配置文件出错:", error);
                    }
                }

                processedConfigs++;

                // 每处理 50 个配置更新一次进度
                if (processedConfigs % 50 === 0) {
                    notice.setMessage(`正在初始化配置哈希映射... (${processedConfigs}/${totalConfigs})`);
                    // 让出主线程,避免阻塞 UI
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // 保存到 localStorage
            this.saveToStorage();

            notice.setMessage(`配置哈希映射初始化完成! 共处理 ${totalConfigs} 个配置`);
            setTimeout(() => notice.hide(), 3000);

            dump(`ConfigHashManager: 构建完成,共 ${totalConfigs} 个配置`);
        } catch (error) {
            notice.hide();
            showSyncNotice(`配置哈希映射初始化失败: ${error.message}`);
            dump("ConfigHashManager: 构建失败", error);
            throw error;
        }
    }

    /**
     * 获取有效的哈希值
     */
    getValidHash(path: string, mtime: number, size: number): string | null {
        const cache = this.hashMap.get(path);
        // 如果 mtime 和 size 为 0，通常是虚拟路径或旧数据，强制重新校验
        if (cache && cache.mtime === mtime && cache.size === size && mtime !== 0) {
            return cache.hash;
        }
        return null;
    }

    /**
     * 获取指定路径的哈希值
     */
    getPathHash(path: string): string | null {
        return this.hashMap.get(path)?.hash || null;
    }

    /**
     * 获取哈希表中存储的所有配置路径
     */
    getAllPaths(): string[] {
        return Array.from(this.hashMap.keys());
    }

    /**
     * 添加或更新单个配置的哈希
     */
    setFileHash(path: string, hash: string, mtime: number = 0, size: number = 0): void {
        this.hashMap.set(path, { hash, mtime, size });
        this.saveToStorage();
    }

    /**
     * 删除指定路径的哈希
     */
    removeFileHash(path: string): void {
        const deleted = this.hashMap.delete(path);
        if (deleted) {
            this.saveToStorage();
        }
    }

    /**
     * 从 localStorage 加载哈希映射
     */
    private loadFromStorage(): boolean {
        try {
            let data = localStorage.getItem(this.storageKey);

            // 迁移逻辑：如果新键无数据，尝试读取旧键
            if (!data) {
                const vaultName = this.plugin.app.vault.getName();

                // 1. 尝试上一个格式: fast-note-sync-[Vault]-configHashMap
                const prevKey1 = `fast-note-sync-${vaultName}-configHashMap`;
                data = localStorage.getItem(prevKey1);

                // 2. 尝试更早格式: fast-note-sync-[Vault]-config-hash-map
                if (!data) {
                    const prevKey2 = `fast-note-sync-${vaultName}-config-hash-map`;
                    data = localStorage.getItem(prevKey2);
                }

                // 3. 尝试最原始格式: fast-note-sync-config-hash-map-[Vault]
                if (!data) {
                    const oldKey = `fast-note-sync-config-hash-map-${vaultName}`;
                    data = localStorage.getItem(oldKey);
                }

                if (data) {
                    dump("ConfigHashManager: 发现旧版配置哈希数据，执行迁移");
                    localStorage.setItem(this.storageKey, data);
                } else {
                    return false;
                }
            }

            const parsed = JSON.parse(data);
            const migratedMap = new Map<string, HashCache>();
            let needsSave = false;

            for (const [path, value] of Object.entries(parsed)) {
                if (typeof value === "string") {
                    migratedMap.set(path, { hash: value, mtime: 0, size: 0 });
                    needsSave = true;
                } else {
                    migratedMap.set(path, value as HashCache);
                }
            }

            this.hashMap = migratedMap;
            if (needsSave) this.saveToStorage();

            return true;
        } catch (error) {
            dump("ConfigHashManager: 从 localStorage 加载失败", error);
            return false;
        }
    }

    /**
     * 保存哈希映射到 localStorage
     */
    private saveToStorage(): void {
        try {
            const obj = Object.fromEntries(this.hashMap);
            const data = JSON.stringify(obj);
            localStorage.setItem(this.storageKey, data);
        } catch (error) {
            dump("ConfigHashManager: 保存到 localStorage 失败", error);
            showSyncNotice(`保存配置哈希映射失败: ${error.message}`);
        }
    }

    /**
     * 手动重建哈希表
     * 用于命令面板
     */
    async rebuildHashMap(): Promise<void> {
        dump("ConfigHashManager: 手动重建配置哈希映射");
        this.hashMap.clear();
        await this.buildConfigHashMap();
    }

    /**
     * 清理哈希表内容
     */
    clearAll(): void {
        this.hashMap.clear();
        this.saveToStorage();
    }

    /**
     * 清理已排除配置的哈希
     * 当配置排除设置变更时调用
     */
    cleanupExcludedHashes(): void {
        let deletedCount = 0;
        for (const path of this.hashMap.keys()) {
            if (configIsPathExcluded(path, this.plugin)) {
                this.hashMap.delete(path);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            dump(`ConfigHashManager: 清理了 ${deletedCount} 个已排除配置的哈希`);
            this.saveToStorage();
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): { totalConfigs: number; storageKey: string } {
        return {
            totalConfigs: this.hashMap.size,
            storageKey: this.storageKey,
        };
    }
}

