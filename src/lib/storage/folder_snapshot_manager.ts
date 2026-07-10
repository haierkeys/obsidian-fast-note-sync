import { TFolder } from "obsidian";

import { dump, isFolderSyncPathExcluded, debounce, LocalStateFileMirror } from "../utils/helpers";
import type FastSync from "../../main";

// 对账延迟：初始化后等待若干秒再比对，避开插件刚加载时的启动开销高峰
// Reconciliation delay: wait a few seconds after init to avoid the plugin's startup load spike
const RECONCILE_DELAY_MS = 5000;


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
        this.storageKey = `fns-folderSnapshot`;
        this.debouncedFlush = debounce(() => this.flush(), 500);
        this.mirror = new LocalStateFileMirror(plugin, "folderSnapshot.json");
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
     * 初始化快照表
     */
    async initialize(): Promise<void> {
        const loaded = this.loadFromStorage();
        if (loaded) {
            this.isInitialized = true;
            // 采用了持久化快照，其内容可能因外部工具改动目录而漂移（新增/删除文件夹后从未与
            // 真实 vault 对账过）。安排一次轻量后台对账去修正，buildSnapshot 分支是刚从 vault
            // 现状构建的，天然一致，无需对账。
            // Adopted a persisted snapshot, which may have drifted if external tools changed
            // folders (it's never been reconciled against the real vault). Schedule a lightweight
            // background reconciliation to fix it; the buildSnapshot branch is freshly built from
            // vault state and is inherently consistent, so it doesn't need reconciliation.
            this.scheduleReconciliation();
            return;
        }

        // localStorage 未命中：尝试从文件镜像恢复，不弹通知、不重建
        const mirrored = await this.mirror.read();
        if (mirrored && this.parseAndLoad(mirrored)) {
            dump("FolderSnapshotManager: 从文件镜像恢复快照");
            this.saveToStorage();
            this.isInitialized = true;
            // 镜像恢复的数据同样可能漂移，与 localStorage 命中分支一样安排对账
            this.scheduleReconciliation();
            return;
        }

        await this.buildSnapshot();
        this.isInitialized = true;
    }

    /**
     * 安排一次轻量后台对账 / Schedule a lightweight background reconciliation
     */
    private scheduleReconciliation(): void {
        window.setTimeout(() => {
            this.reconcileWithVault();
        }, RECONCILE_DELAY_MS);
    }

    /**
     * 比对当前 vault 的文件夹集合与快照 key 集合的差集，修正漂移：
     * 本地新增但快照缺失的文件夹补进去，快照里有但本地已消失的文件夹删掉。
     * 批量更新内存 Map 后走一次 flush 落盘，不逐条触发防抖写入。
     * Diff the current vault's folder set against the snapshot's key set and correct drift:
     * add folders present locally but missing from the snapshot, remove snapshot entries whose
     * local folder is gone. Batches the in-memory Map update then flushes once, instead of
     * triggering the debounced write per item.
     */
    private reconcileWithVault(): void {
        try {
            const files = this.plugin.app.vault.getAllLoadedFiles();
            const vaultFolderPaths = new Set<string>();
            for (const file of files) {
                if (file instanceof TFolder) {
                    if (file.path === "/" || isFolderSyncPathExcluded(file.path, this.plugin)) continue;
                    vaultFolderPaths.add(file.path);
                }
            }

            const toAdd: string[] = [];
            for (const path of vaultFolderPaths) {
                if (!this.snapshotMap.has(path)) toAdd.push(path);
            }
            const toRemove: string[] = [];
            for (const path of this.snapshotMap.keys()) {
                if (!vaultFolderPaths.has(path)) toRemove.push(path);
            }

            if (toAdd.length === 0 && toRemove.length === 0) {
                dump("FolderSnapshotManager: [Reconcile] no drift detected against vault");
                return;
            }

            const now = Date.now();
            for (const path of toAdd) this.snapshotMap.set(path, now);
            for (const path of toRemove) this.snapshotMap.delete(path);

            dump(`FolderSnapshotManager: [Reconcile] drift corrected, added=${toAdd.length}, removed=${toRemove.length}`, { toAdd, toRemove });

            // 对账是低频一次性事件，直接标脏并立即落盘一次，不必等待防抖窗口
            // Reconciliation is a low-frequency one-off event; mark dirty and flush immediately
            // rather than waiting for the debounce window
            this.isDirty = true;
            this.flush();
        } catch (error) {
            dump("FolderSnapshotManager: [Reconcile] failed", error);
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
        this.scheduleSave();
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
            this.scheduleSave();
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
            this.scheduleSave();
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
                    `fns-${vaultName}-folderSnapshot`,                  // 上一版：绑定本地库名的稳定前缀
                    `fast-note-sync-${vaultName}-folderSnapshot`,       // 更早版
                    `fast-note-sync-${vaultName}-folder-snapshot`,      // 更更早版
                    `fast-note-sync-folder-snapshot-${vaultName}`,      // 最原始格式
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

        // 即使 localStorage 写入失败，镜像写入也照常进行
        this.mirror.scheduleWrite(data);
    }
}
