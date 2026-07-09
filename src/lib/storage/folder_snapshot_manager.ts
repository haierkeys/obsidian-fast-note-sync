import { TFolder } from "obsidian";

import { dump, isFolderSyncPathExcluded, LocalStateFileMirror } from "../utils/helpers";
import type FastSync from "../../main";


/**
 * 文件夹快照管理器
 * 负责记录本地文件夹路径及其上一次同步的时间戳 (mtime)
 * 用于离线删除检测以及启动时的快速同步判定
 */
export class FolderSnapshotManager {
    private plugin: FastSync;
    private snapshotMap: Map<string, number> = new Map();
    private storageKey: string;
    private isInitialized: boolean = false;
    // 文件镜像：localStorage 被移动端系统清除后的兜底恢复
    // File mirror: fallback recovery after mobile OS clears localStorage
    private mirror: LocalStateFileMirror;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        // 与 vault 名无关的稳定存储键：iCloud 手机端同步冲突会把库文件夹改名，绑定 vault 名的旧 key
        // 会失效导致快照意外重建，历史键迁移见 loadFromStorage
        this.storageKey = `fns-folderSnapshot`;
        this.mirror = new LocalStateFileMirror(plugin, "folderSnapshot.json");
    }

    /**
     * 立即落盘防抖中的镜像写（用于同步结束、插件卸载等需要保证持久化的时机）
     */
    flush(): void {
        this.mirror.flush();
    }

    /**
     * 初始化快照表
     * localStorage 未命中时先尝试文件镜像恢复，镜像也没有才真正重建
     */
    async initialize(): Promise<void> {
        const loaded = this.loadFromStorage();
        if (loaded) {
            this.isInitialized = true;
            return;
        }

        // localStorage 未命中：尝试从文件镜像恢复
        const mirrored = await this.mirror.read();
        if (mirrored && this.parseAndLoad(mirrored)) {
            dump("FolderSnapshotManager: 从文件镜像恢复快照");
            this.saveToStorage();
            this.isInitialized = true;
            return;
        }

        await this.buildSnapshot();
        this.isInitialized = true;
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 构建初始快照
     */
    private async buildSnapshot(): Promise<void> {
        try {
            const files = this.plugin.app.vault.getAllLoadedFiles();
            const now = Date.now();
            for (const file of files) {
                if (file instanceof TFolder) {
                    if (file.path === "/" || isFolderSyncPathExcluded(file.path, this.plugin)) continue;

                    // 初始快照时，所有文件夹的 mtime 设为当前时间 (虚拟化)
                    this.snapshotMap.set(file.path, now);
                }
            }
            this.saveToStorage();
        } catch (error) {
            dump("FolderSnapshotManager: 构建快照失败", error);
        }
    }

    /**
     * 获取路径的快照时间
     */
    getMtime(path: string): number | null {
        return this.snapshotMap.get(path) || null;
    }

    /**
     * 获取快照中记录的所有路径
     */
    getAllPaths(): string[] {
        return Array.from(this.snapshotMap.keys());
    }

    /**
     * 更新单个文件夹的快照时间
     */
    setFolderMtime(path: string, mtime: number): void {
        this.snapshotMap.set(path, mtime);
        this.saveToStorage();
    }

    /**
     * 批量更新文件夹的快照时间
     */
    setFolderMtimes(paths: string[], mtime: number): void {
        for (const path of paths) {
            this.snapshotMap.set(path, mtime);
        }
        this.saveToStorage();
    }

    /**
     * 删除路径快照
     */
    removeFolder(path: string): void {
        if (this.snapshotMap.delete(path)) {
            this.saveToStorage();
        }
    }

    /**
     * 批量删除文件夹快照
     */
    removeFolders(paths: Iterable<string>): void {
        let changed = false;
        for (const path of paths) {
            if (this.snapshotMap.delete(path)) {
                changed = true;
            }
        }
        if (changed) {
            this.saveToStorage();
        }
    }

    /**
     * 从 localStorage 加载快照
     */
    private loadFromStorage(): boolean {
        try {
            let data = this.plugin.app.loadLocalStorage(this.storageKey) as string | null;

            // 迁移逻辑：如果新键无数据，按由新到旧依次回溯历史键格式
            if (!data) {
                const vaultName = this.plugin.app.vault.getName();
                const legacyKeys = [
                    `fns-${vaultName}-folderSnapshot`,                    // 上一版：绑定本地库名
                    `fast-note-sync-${vaultName}-folderSnapshot`,         // 更早版
                    `fast-note-sync-${vaultName}-folder-snapshot`,        // 更更早版
                    `fast-note-sync-folder-snapshot-${vaultName}`,        // 最原始格式
                ];
                for (const legacyKey of legacyKeys) {
                    data = this.plugin.app.loadLocalStorage(legacyKey) as string | null;
                    if (data) break;
                }

                if (data) {
                    dump("FolderSnapshotManager: 发现旧版快照数据，执行迁移");
                    this.plugin.app.saveLocalStorage(this.storageKey, data);
                } else {
                    return false;
                }
            }
            return this.parseAndLoad(data);
        } catch (error) {
            dump("FolderSnapshotManager: 加载快照失败", error);
            return false;
        }
    }

    /**
     * 解析快照数据并装入 this.snapshotMap
     */
    private parseAndLoad(data: string): boolean {
        try {
            const parsed = JSON.parse(data) as Record<string, number>;
            this.snapshotMap = new Map(
                Object.entries(parsed).map(([key, value]) => [key, Number(value)])
            );
            return true;
        } catch (error) {
            dump("FolderSnapshotManager: 解析快照数据失败", error);
            return false;
        }
    }

    /**
     * 保存快照到 localStorage，同时镜像写入文件 (兜底移动端 localStorage 被清除)
     */
    private saveToStorage(): void {
        let data: string;
        try {
            const obj = Object.fromEntries(this.snapshotMap);
            data = JSON.stringify(obj);
        } catch (error) {
            dump("FolderSnapshotManager: 序列化快照失败", error);
            return;
        }

        try {
            this.plugin.app.saveLocalStorage(this.storageKey, data);
        } catch (error) {
            dump("FolderSnapshotManager: 保存快照失败", error);
        }

        // 即使 localStorage 写入失败 (如配额)，镜像写入也照常进行
        this.mirror.scheduleWrite(data);
    }
}
