import { TFolder, Notice } from "obsidian";

import { dump, isPathExcluded } from "./helps";
import type FastSync from "../main";


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

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        const vaultName = this.plugin.app.vault.getName();
        this.storageKey = `fns-${vaultName}-folderSnapshot`;
    }

    /**
     * 初始化快照表
     */
    async initialize(): Promise<void> {
        const loaded = this.loadFromStorage();
        if (loaded) {
            this.isInitialized = true;
        } else {
            await this.buildSnapshot();
            this.isInitialized = true;
        }
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
                    if (file.path === "/" || isPathExcluded(file.path, this.plugin)) continue;

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
     * 删除路径快照
     */
    removeFolder(path: string): void {
        if (this.snapshotMap.delete(path)) {
            this.saveToStorage();
        }
    }

    /**
     * 从 localStorage 加载快照
     */
    private loadFromStorage(): boolean {
        try {
            let data = localStorage.getItem(this.storageKey);

            // 迁移逻辑：如果新键无数据，尝试读取旧键
            if (!data) {
                const vaultName = this.plugin.app.vault.getName();

                // 1. 尝试上一个格式: fast-note-sync-[Vault]-folderSnapshot
                const prevKey1 = `fast-note-sync-${vaultName}-folderSnapshot`;
                data = localStorage.getItem(prevKey1);

                // 2. 尝试更早格式: fast-note-sync-[Vault]-folder-snapshot
                if (!data) {
                    const prevKey2 = `fast-note-sync-${vaultName}-folder-snapshot`;
                    data = localStorage.getItem(prevKey2);
                }

                // 3. 尝试最原始格式: fast-note-sync-folder-snapshot-[Vault]
                if (!data) {
                    const oldKey = `fast-note-sync-folder-snapshot-${vaultName}`;
                    data = localStorage.getItem(oldKey);
                }

                if (data) {
                    dump("FolderSnapshotManager: 发现旧版快照数据，执行迁移");
                    localStorage.setItem(this.storageKey, data);
                } else {
                    return false;
                }
            }
            const parsed = JSON.parse(data);
            this.snapshotMap = new Map(
                Object.entries(parsed).map(([key, value]) => [key, Number(value)])
            );
            return true;
        } catch (error) {
            dump("FolderSnapshotManager: 加载快照失败", error);
            return false;
        }
    }

    /**
     * 保存快照到 localStorage
     */
    private saveToStorage(): void {
        try {
            const obj = Object.fromEntries(this.snapshotMap);
            localStorage.setItem(this.storageKey, JSON.stringify(obj));
        } catch (error) {
            dump("FolderSnapshotManager: 保存快照失败", error);
        }
    }
}
