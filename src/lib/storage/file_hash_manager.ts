import { hashContentAsync, dump, isPathExcluded, showSyncNotice, isLargeBinarySyncRisk, describeBinarySyncLimit, logMemorySnapshot, hashFileAsync, debounce, LocalStateFileMirror } from "../utils/helpers";
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
 * 文件哈希管理器
 * 负责管理文件路径与哈希值的映射关系,存储在 localStorage 中
 */
export class FileHashManager {
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
    this.storageKey = `fns-fileHashMap`;
    this.debouncedFlush = debounce(() => this.flush(), 500);
    this.mirror = new LocalStateFileMirror(plugin, "fileHashMap.json");
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
   * 只在 localStorage 不存在时执行完整的文件遍历；localStorage 未命中时先尝试文件镜像恢复，
   * 镜像也没有才真正重建 (移动端 localStorage 被系统清除时避免每次启动全量重建 + 弹通知)
   */
  async initialize(): Promise<void> {
    dump("FileHashManager: 开始初始化");

    // 尝试从 localStorage 加载
    const loaded = this.loadFromStorage();

    if (loaded) {
      dump(`FileHashManager: 从 localStorage 加载成功,共 ${this.hashMap.size} 个文件`);
      this.isInitialized = true;
      return;
    }

    // localStorage 未命中：尝试从文件镜像恢复，不弹通知、不重建
    const mirrored = await this.mirror.read();
    if (mirrored && this.parseAndLoad(mirrored)) {
      dump("FileHashManager: 从文件镜像恢复哈希表");
      this.saveToStorage();
      this.isInitialized = true;
      return;
    }

    dump("FileHashManager: localStorage 与文件镜像均无数据,开始构建哈希映射");
    await this.buildFileHashMap();
    this.isInitialized = true;
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

            if (isLargeBinarySyncRisk(file.stat.size, this.plugin)) {
              dump(`FileHashManager: skip large binary hash (${describeBinarySyncLimit(this.plugin)} limit): ${file.path}`, file.stat.size);
              continue;
            }
            contentHash = await hashFileAsync(this.plugin.app, file.path);
            logMemorySnapshot(`after hash ${file.path}`);
          }

          this.hashMap.set(file.path, {
            hash: contentHash,
            mtime: file.stat.mtime,
            size: file.stat.size
          });
        } catch (error) {
          // 单个文件哈希计算失败不应中断整个构建过程
          const msg = error instanceof Error ? error.message : String(error);
          dump(`FileHashManager: 计算哈希失败，跳过文件: ${file.path}`, error);
          console.warn(`[FastNoteSync] 跳过文件 ${file.path}: ${msg}`);
        }

        processedFiles++;

        // 每处理 50 个文件更新一次进度 (Update progress every 50 files)
        if (processedFiles % 50 === 0) {
          notice.setMessage(`正在初始化文件哈希映射... (${processedFiles}/${totalFiles})`);
          // 让出主线程,避免阻塞 UI
          await new Promise(resolve => window.setTimeout(resolve, 0));
        }
      }

      // 保存到 localStorage
      this.saveToStorage();

      notice.setMessage(`文件哈希映射初始化完成! 共处理 ${totalFiles} 个文件`);
      window.setTimeout(() => notice.hide(), 3000);

      dump(`FileHashManager: 构建完成,共 ${totalFiles} 个文件`);
    } catch (error) {
      notice.hide();
      const msg = error instanceof Error ? error.message : String(error);
      showSyncNotice(`文件哈希映射初始化失败: ${msg}`);
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
    this.scheduleSave();
  }

  setFileHashes(entries: Iterable<[string, string]>, getStat?: (path: string) => { mtime?: number; size?: number } | null | undefined): void {
    let changed = false;
    for (const [path, hash] of entries) {
      const stat = getStat?.(path);
      this.hashMap.set(path, { hash, mtime: stat?.mtime || 0, size: stat?.size || 0 });
      changed = true;
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
          `fns-${vaultName}-fileHashMap`,                      // 上一版：绑定本地库名的稳定前缀
          `fast-note-sync-${vaultName}-fileHashMap`,           // 更早版
          `fast-note-sync-${vaultName}-file-hash-map`,         // 更更早版
          `fast-note-sync-file-hash-map-${vaultName}`,         // 最原始格式
        ];
        for (const legacyKey of legacyKeys) {
          data = this.plugin.app.loadLocalStorage(legacyKey) as string | null;
          if (data) break;
        }

        if (data) {
          dump("FileHashManager: 发现旧版哈希表数据，执行迁移");
          this.plugin.app.saveLocalStorage(this.storageKey, data);
        } else {
          return false;
        }
      }

      return this.parseAndLoad(data);
    } catch (error) {
      dump("FileHashManager: 从 localStorage 加载失败", error);
      return false;
    }
  }

  /**
   * 解析哈希表数据并装入 this.hashMap，兼容旧版仅存哈希字符串的格式
   * Parse hash map data and load it into this.hashMap, compatible with the old hash-only string format
   */
  private parseAndLoad(data: string): boolean {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
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
      dump("FileHashManager: 解析哈希表数据失败", error);
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
      dump("FileHashManager: 序列化哈希表失败", error);
      return;
    }

    try {
      this.plugin.app.saveLocalStorage(this.storageKey, data);
    } catch (error) {
      dump("FileHashManager: 保存到 localStorage 失败", error);
      const msg = error instanceof Error ? error.message : String(error);
      showSyncNotice(`保存文件哈希映射失败: ${msg}`);
    }

    // 即使 localStorage 写入失败 (如配额)，镜像写入也照常进行
    this.mirror.scheduleWrite(data);
  }

  /**
   * 手动重建哈希表
   * 用于命令面板
   */
  async rebuildHashMap(): Promise<void> {
    dump("FileHashManager: 手动重建哈希映射");
    this.clearAll();
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
   * Bulk-set hashes from a scanned hash map and persist once.
   * Used to eagerly commit computed hashes during scan, breaking the
   * Catch-22 where hashes are never persisted because SyncEnd is never received.
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
