import { TFile } from "obsidian";

import { hashContent, hashContentAsync, hashArrayBuffer, dump, isPathExcluded, showSyncNotice } from "./helps";
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
 * 文件哈希管理器
 * 负责管理文件路径与哈希值的映射关系,存储在 localStorage 中
 */
export class FileHashManager {
  private plugin: FastSync;
  private hashMap: Map<string, HashCache> = new Map();
  private storageKey: string;
  private isInitialized: boolean = false;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    // 根据仓库名生成唯一的存储键 (格式: fns-[VaultName]-fileHashMap)
    const vaultName = this.plugin.app.vault.getName();
    this.storageKey = `fns-${vaultName}-fileHashMap`;
  }

  /**
   * 初始化哈希表
   * 只在 localStorage 不存在时执行完整的文件遍历
   */
  async initialize(): Promise<void> {
    dump("FileHashManager: 开始初始化");

    // 尝试从 localStorage 加载
    const loaded = this.loadFromStorage();

    if (loaded) {
      dump(`FileHashManager: 从 localStorage 加载成功,共 ${this.hashMap.size} 个文件`);
      this.isInitialized = true;
    } else {
      dump("FileHashManager: localStorage 中无数据,开始构建哈希映射");
      await this.buildFileHashMap();
      this.isInitialized = true;
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  private async buildFileHashMap(): Promise<void> {
    const notice = showSyncNotice("正在初始化文件哈希映射...", 0);

    try {
      const files = this.plugin.app.vault.getFiles();

      const totalFiles = files.length;
      let processedFiles = 0;

      dump(`FileHashManager: 开始遍历 ${totalFiles} 个文件`);

      for (const file of files) {
        // 跳过已排除的文件
        if (isPathExcluded(file.path, this.plugin)) {
          processedFiles++;
          continue;
        }

        try {
          let contentHash: string;

          // 根据文件类型选择不同的哈希计算方式
          if (file.extension === "md") {
            // md 文件使用文本内容计算哈希
            let content: string | null = await this.plugin.app.vault.read(file);
            contentHash = await hashContentAsync(content);
            content = null; // 显式释放引用 (Explicitly release reference)
          } else {
            // 非 md 文件使用二进制内容计算哈希
            let buffer: ArrayBuffer | null = await this.plugin.app.vault.readBinary(file);
            contentHash = await hashArrayBuffer(buffer);
            buffer = null; // 显式释放引用 (Explicitly release reference)
          }

          this.hashMap.set(file.path, {
            hash: contentHash,
            mtime: file.stat.mtime,
            size: file.stat.size
          });
        } catch (error) {
          // 单个文件哈希计算失败不应中断整个构建过程
          dump(`FileHashManager: 计算哈希失败，跳过文件: ${file.path}`, error);
          console.warn(`[FastNoteSync] 跳过文件 ${file.path}: ${error.message}`);
        }

        processedFiles++;

        // 每处理 50 个文件更新一次进度 (Update progress every 50 files)
        if (processedFiles % 50 === 0) {
          notice.setMessage(`正在初始化文件哈希映射... (${processedFiles}/${totalFiles})`);
          // 让出主线程,避免阻塞 UI
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 保存到 localStorage
      this.saveToStorage();

      notice.setMessage(`文件哈希映射初始化完成! 共处理 ${totalFiles} 个文件`);
      setTimeout(() => notice.hide(), 3000);

      dump(`FileHashManager: 构建完成,共 ${totalFiles} 个文件`);
    } catch (error) {
      notice.hide();
      showSyncNotice(`文件哈希映射初始化失败: ${error.message}`);
      dump("FileHashManager: 构建失败", error);
      throw error;
    }
  }

  /**
   * 获取有效的哈希值
   * 如果缓存存在且 mtime/size 匹配，则返回缓存的哈希，否则返回 null
   */
  getValidHash(path: string, mtime: number, size: number): string | null {
    const cache = this.hashMap.get(path);
    if (cache && cache.mtime === mtime && cache.size === size) {
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
   * 获取哈希表中存储的所有文件路径
   */
  getAllPaths(): string[] {
    return Array.from(this.hashMap.keys());
  }

  /**
   * 添加或更新单个文件的哈希
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

        // 1. 尝试上一个格式: fast-note-sync-[Vault]-fileHashMap
        const prevKey1 = `fast-note-sync-${vaultName}-fileHashMap`;
        data = localStorage.getItem(prevKey1);

        // 2. 尝试更早格式: fast-note-sync-[Vault]-file-hash-map
        if (!data) {
          const prevKey2 = `fast-note-sync-${vaultName}-file-hash-map`;
          data = localStorage.getItem(prevKey2);
        }

        // 3. 尝试最原始格式: fast-note-sync-file-hash-map-[Vault]
        if (!data) {
          const oldKey = `fast-note-sync-file-hash-map-${vaultName}`;
          data = localStorage.getItem(oldKey);
        }

        if (data) {
          dump("FileHashManager: 发现旧版哈希表数据，执行迁移");
          localStorage.setItem(this.storageKey, data);
        } else {
          return false;
        }
      }

      const parsed = JSON.parse(data);
      // 数据迁移逻辑：如果值是字符串，说明是旧版数据，需要重新构建或设为默认值
      // Data migration: if value is string, it's old version data; need to migrate or default
      const migratedMap = new Map<string, HashCache>();
      let needsSave = false;

      for (const [path, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          // 旧版数据：只有哈希。由于缺失 mtime/size，我们将它们设为 0，
          // 这样下次同步时会重新触发计算并更新为新格式。
          // Old data: hash only. Set mtime/size to 0 so next sync triggers recalculation and updates to new format.
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
      dump("FileHashManager: 从 localStorage 加载失败", error);
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
      dump("FileHashManager: 保存到 localStorage 失败", error);
      showSyncNotice(`保存文件哈希映射失败: ${error.message}`);
    }
  }

  /**
   * 手动重建哈希表
   * 用于命令面板
   */
  async rebuildHashMap(): Promise<void> {
    dump("FileHashManager: 手动重建哈希映射");
    this.hashMap.clear();
    await this.buildFileHashMap();
  }

  /**
   * 清理哈希表内容
   */
  clearAll(): void {
    this.hashMap.clear();
    this.saveToStorage();
  }

  /**
   * 清清理已排除文件的哈希
   * 当同步排除设置变更时调用
   */
  cleanupExcludedHashes(): void {
    let deletedCount = 0;
    for (const path of this.hashMap.keys()) {
      if (isPathExcluded(path, this.plugin)) {
        this.hashMap.delete(path);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      dump(`FileHashManager: 清理了 ${deletedCount} 个已排除文件的哈希`);
      this.saveToStorage();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalFiles: number; storageKey: string } {
    return {
      totalFiles: this.hashMap.size,
      storageKey: this.storageKey,
    };
  }
}

