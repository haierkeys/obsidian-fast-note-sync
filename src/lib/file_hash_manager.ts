import { TFile, Notice } from "obsidian";

import { hashContent, hashArrayBuffer, dump } from "./helps";
import type FastSync from "../main";


/**
 * 文件哈希管理器
 * 负责管理文件路径与哈希值的映射关系,存储在 localStorage 中
 */
export class FileHashManager {
  private plugin: FastSync;
  private hashMap: Map<string, string> = new Map();
  private storageKey: string;
  private isInitialized: boolean = false;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    // 根据仓库名生成唯一的存储键
    const vaultName = this.plugin.app.vault.getName();
    this.storageKey = `obsidian-fast-sync-file-hash-map-${vaultName}`;
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

  /**
   * 遍历所有文件并生成哈希映射
   * 显示进度提示
   */
  private async buildFileHashMap(): Promise<void> {
    const notice = new Notice("正在初始化文件哈希映射...", 0);

    try {
      const files = this.plugin.app.vault.getFiles();

      const totalFiles = files.length;
      let processedFiles = 0;

      dump(`FileHashManager: 开始遍历 ${totalFiles} 个文件`);

      for (const file of files) {
        let contentHash: string;

        // 根据文件类型选择不同的哈希计算方式
        if (file.extension === "md") {
          // md 文件使用文本内容计算哈希
          const content = await this.plugin.app.vault.cachedRead(file);
          contentHash = hashContent(content);
        } else {
          // 非 md 文件使用二进制内容计算哈希
          const buffer = await this.plugin.app.vault.readBinary(file);
          contentHash = hashArrayBuffer(buffer);
        }

        this.hashMap.set(file.path, contentHash);
        processedFiles++;

        // 每处理 100 个文件更新一次进度
        if (processedFiles % 100 === 0) {
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
      new Notice(`文件哈希映射初始化失败: ${error.message}`);
      dump("FileHashManager: 构建失败", error);
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
   * 添加或更新单个文件的哈希
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
      new Notice(`保存文件哈希映射失败: ${error.message}`);
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
   * 获取统计信息
   */
  getStats(): { totalFiles: number; storageKey: string } {
    return {
      totalFiles: this.hashMap.size,
      storageKey: this.storageKey,
    };
  }
}
