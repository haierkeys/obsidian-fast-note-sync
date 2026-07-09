import { normalizePath } from "obsidian";

import { hashContentAsync, dump, dumpError, configIsPathExcluded, getConfigSyncCustomDirs, showSyncNotice, hashFileAsync, debounce, LocalStateFileMirror } from "../utils/helpers";
import { configAllPaths } from "../sync/operator_config";
import type FastSync from "../../main";


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
    // 脏标记 + 防抖落盘：高频单条写入（下载/Ack 路径）不再逐条同步整表 JSON.stringify，
    // 避免高频写 localStorage 阻塞主线程导致界面白屏
    private isDirty: boolean = false;
    private debouncedFlush: () => void;
    // 文件镜像：localStorage 被移动端系统清除后的兜底恢复
    private mirror: LocalStateFileMirror;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        // 与 vault 名无关的稳定存储键：iCloud 手机端会把库文件夹改名，绑定 vault 名的旧 key 会失效
        // (与 local_storage_manager.ts getInternalKey 的修复同理)，历史键迁移见 loadFromStorage
        this.storageKey = `fns-configHashMap`;
        this.debouncedFlush = debounce(() => this.flush(), 500);
        this.mirror = new LocalStateFileMirror(plugin, "configHashMap.json");
    }

    /**
     * 标记为脏并安排一次防抖落盘（用于高频单条写入路径）
     */
    private scheduleSave(): void {
        this.isDirty = true;
        this.debouncedFlush();
    }

    /**
     * 立即将脏数据落盘（用于同步结束、插件卸载等需要保证持久化的时机）
     */
    flush(): void {
        if (this.isDirty) {
            this.isDirty = false;
            this.saveToStorage();
        }
        // 最后冲镜像：既包含 saveToStorage 刚安排的一份，也包含与 isDirty 无关的防抖中镜像写
        this.mirror.flush();
    }

    /**
     * 初始化哈希表
     * 只在 localStorage 不存在时执行完整的配置文件遍历；localStorage 未命中时先尝试文件镜像恢复，
     * 镜像也没有才真正重建
     */
    async initialize(): Promise<void> {
        dump("ConfigHashManager: 开始初始化");

        // 尝试从 localStorage 加载
        const loaded = this.loadFromStorage();

        if (loaded) {
            dump(`ConfigHashManager: 从 localStorage 加载成功,共 ${this.hashMap.size} 个配置`);
            this.isInitialized = true;
            return;
        }

        // localStorage 未命中：尝试从文件镜像恢复，不弹通知、不重建
        const mirrored = await this.mirror.read();
        if (mirrored && this.parseAndLoad(mirrored)) {
            dump("ConfigHashManager: 从文件镜像恢复哈希表");
            this.saveToStorage();
            this.isInitialized = true;
            return;
        }

        dump("ConfigHashManager: localStorage 与文件镜像均无数据,开始构建配置哈希映射");
        await this.buildConfigHashMap();
        this.isInitialized = true;
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
                            contentHash = await hashFileAsync(this.plugin.app, filePath);
                            this.hashMap.set(path, { hash: contentHash, mtime: stat.mtime, size: stat.size });
                        }
                    } catch (error) {
                        dumpError("读取配置文件出错:", error);
                    }
                }

                processedConfigs++;

                // 每处理 50 个配置更新一次进度
                if (processedConfigs % 50 === 0) {
                    notice.setMessage(`正在初始化配置哈希映射... (${processedConfigs}/${totalConfigs})`);
                    // 让出主线程,避免阻塞 UI
                    await new Promise(resolve => window.setTimeout(resolve, 0));
                }
            }

            // 保存到 localStorage
            this.saveToStorage();

            notice.setMessage(`配置哈希映射初始化完成! 共处理 ${totalConfigs} 个配置`);
            window.setTimeout(() => notice.hide(), 3000);

            dump(`ConfigHashManager: 构建完成,共 ${totalConfigs} 个配置`);
        } catch (error) {
            notice.hide();
            const errorMsg = error instanceof Error ? error.message : String(error);
            showSyncNotice(`配置哈希映射初始化失败: ${errorMsg}`);
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
        this.scheduleSave();
    }

    async setFileHashes(entries: Iterable<[string, string]>, getStat?: (path: string) => Promise<{ mtime?: number; size?: number } | null | undefined> | { mtime?: number; size?: number } | null | undefined): Promise<void> {
        let changed = false;
        for (const [path, hash] of entries) {
            const stat = await getStat?.(path);
            this.hashMap.set(path, { hash, mtime: stat?.mtime || 0, size: stat?.size || 0 });
            changed = true;
        }
        if (changed) this.saveToStorage();
    }

    /**
     * 批量从扫描的哈希表中设置并持久化一次
     */
    bulkSetFromScanned(scanned: Map<string, { hash: string; mtime: number; size: number }>): void {
        if (scanned.size === 0) return;
        let changed = false;
        for (const [path, cache] of scanned) {
            const existing = this.hashMap.get(path);
            if (!existing || existing.mtime <= cache.mtime) {
                this.hashMap.set(path, { hash: cache.hash, mtime: cache.mtime, size: cache.size });
                changed = true;
            }
        }
        if (changed) this.saveToStorage();
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

    removeFileHashes(paths: Iterable<string>): void {
        let changed = false;
        for (const path of paths) {
            changed = this.hashMap.delete(path) || changed;
        }
        if (changed) this.saveToStorage();
    }

    /**
     * 从 localStorage 加载哈希映射
     */
    private loadFromStorage(): boolean {
        try {
            let data = this.plugin.app.loadLocalStorage(this.storageKey) as string | null;

            // 迁移逻辑：如果新键无数据，按由新到旧依次回溯历史键格式
            if (!data) {
                const vaultName = this.plugin.app.vault.getName();
                const legacyKeys = [
                    `fns-${vaultName}-configHashMap`,                     // 上一版：绑定本地库名的稳定前缀
                    `fast-note-sync-${vaultName}-configHashMap`,          // 更早版
                    `fast-note-sync-${vaultName}-config-hash-map`,        // 更更早版
                    `fast-note-sync-config-hash-map-${vaultName}`,        // 最原始格式
                ];
                for (const legacyKey of legacyKeys) {
                    data = this.plugin.app.loadLocalStorage(legacyKey) as string | null;
                    if (data) break;
                }

                if (data) {
                    dump("ConfigHashManager: 发现旧版配置哈希数据，执行迁移");
                    this.plugin.app.saveLocalStorage(this.storageKey, data);
                } else {
                    return false;
                }
            }

            return this.parseAndLoad(data);
        } catch (error) {
            dump("ConfigHashManager: 从 localStorage 加载失败", error);
            return false;
        }
    }

    /**
     * 解析哈希表数据并装入 this.hashMap，兼容旧版仅存哈希字符串的格式
     */
    private parseAndLoad(data: string): boolean {
        try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
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
            dump("ConfigHashManager: 解析哈希表数据失败", error);
            return false;
        }
    }

    /**
     * 保存哈希映射到 localStorage，同时镜像写入文件 (兜底移动端 localStorage 被清除)
     */
    private saveToStorage(): void {
        let data: string;
        try {
            const obj = Object.fromEntries(this.hashMap);
            data = JSON.stringify(obj);
        } catch (error) {
            dump("ConfigHashManager: 序列化哈希表失败", error);
            return;
        }

        try {
            this.plugin.app.saveLocalStorage(this.storageKey, data);
        } catch (error) {
            dump("ConfigHashManager: 保存到 localStorage 失败", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            showSyncNotice(`保存配置哈希映射失败: ${errorMsg}`);
        }

        // 即使 localStorage 写入失败 (如配额)，镜像写入也照常进行
        this.mirror.scheduleWrite(data);
    }

    /**
     * 手动重建哈希表
     * 用于命令面板
     */
    async rebuildHashMap(): Promise<void> {
        dump("ConfigHashManager: 手动重建配置哈希映射");
        this.clearAll();
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
