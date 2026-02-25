import { Notice, normalizePath } from "obsidian";

import { hashContent, hashArrayBuffer, dump, configIsPathExcluded, getConfigSyncCustomDirs } from "./helps";
import { configAllPaths } from "./config_operator";
import type FastSync from "../main";


/**
 * 配置哈希管理器
 * 负责管理配置文件路径与哈希值的映射关系,存储在 localStorage 中
 */
export class ConfigHashManager {
    private plugin: FastSync;
    private hashMap: Map<string, string> = new Map();
    private storageKey: string;
    private isInitialized: boolean = false;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        // 根据仓库名生成唯一的存储键
        const vaultName = this.plugin.app.vault.getName();
        this.storageKey = `fast-note-sync-config-hash-map-${vaultName}`;
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
        const notice = new Notice("正在初始化配置哈希映射...", 0);

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

                // 检查是否为 LocalStorage 虚拟路径
                if (path.startsWith(this.plugin.localStorageManager.syncPathPrefix)) {
                    const key = this.plugin.localStorageManager.pathToKey(path);
                    if (key) {
                        const value = this.plugin.localStorageManager.getItemValue(key);
                        if (value) {
                            contentHash = hashContent(value);
                            this.hashMap.set(path, contentHash);
                        }
                    }
                } else {
                    // 从文件系统读取配置文件
                    // 注意：configAllPaths 返回的已经是相对于 Vault 的路径，无需再拼接 configDir
                    const filePath = normalizePath(path);
                    try {
                        const exists = await this.plugin.app.vault.adapter.exists(filePath);
                        if (exists) {
                            const contentBuf = await this.plugin.app.vault.adapter.readBinary(filePath);
                            contentHash = hashArrayBuffer(contentBuf);
                            this.hashMap.set(path, contentHash);
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
            new Notice(`配置哈希映射初始化失败: ${error.message}`);
            dump("ConfigHashManager: 构建失败", error);
            throw error;
        }
    }

    /**
     * 获取指定路径的哈希值
     */
    getPathHash(path: string): string | null {
        return this.hashMap.get(path) || null;
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
    setFileHash(path: string, hash: string): void {
        this.hashMap.set(path, hash);
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
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                return false;
            }

            const parsed = JSON.parse(data);
            this.hashMap = new Map(Object.entries(parsed));
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
            new Notice(`保存配置哈希映射失败: ${error.message}`);
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
