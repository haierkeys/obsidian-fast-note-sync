import { TFolder, Notice } from "obsidian";

import { hashContent, dump, isPathExcluded } from "./helps";
import type FastSync from "../main";


/**
 * 文件夹哈希管理器
 * 负责管理文件夹路径及其存在的记录,存储在 localStorage 中
 * 主要用于离线删除检测
 */
export class FolderHashManager {
    private plugin: FastSync;
    private hashMap: Map<string, string> = new Map();
    private storageKey: string;
    private isInitialized: boolean = false;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        const vaultName = this.plugin.app.vault.getName();
        this.storageKey = `fast-note-sync-folder-hash-map-${vaultName}`;
    }

    /**
     * 初始化哈希表
     */
    async initialize(): Promise<void> {
        const loaded = this.loadFromStorage();
        if (loaded) {
            this.isInitialized = true;
        } else {
            await this.buildFolderHashMap();
            this.isInitialized = true;
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    private async buildFolderHashMap(): Promise<void> {
        try {
            const files = this.plugin.app.vault.getAllLoadedFiles();
            for (const file of files) {
                if (file instanceof TFolder) {
                    if (file.path === "/" || isPathExcluded(file.path, this.plugin)) continue;
                    this.hashMap.set(file.path, hashContent(file.path));
                }
            }
            this.saveToStorage();
        } catch (error) {
            dump("FolderHashManager: 构建失败", error);
        }
    }

    getPathHash(path: string): string | null {
        return this.hashMap.get(path) || null;
    }

    getAllPaths(): string[] {
        return Array.from(this.hashMap.keys());
    }

    setFolderHash(path: string, hash: string): void {
        this.hashMap.set(path, hash);
        this.saveToStorage();
    }

    removeFolderHash(path: string): void {
        const deleted = this.hashMap.delete(path);
        if (deleted) {
            this.saveToStorage();
        }
    }

    private loadFromStorage(): boolean {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return false;
            const parsed = JSON.parse(data);
            this.hashMap = new Map(Object.entries(parsed));
            return true;
        } catch (error) {
            return false;
        }
    }

    private saveToStorage(): void {
        try {
            const obj = Object.fromEntries(this.hashMap);
            localStorage.setItem(this.storageKey, JSON.stringify(obj));
        } catch (error) { }
    }
}
