import { Notice, moment, normalizePath, TFolder } from "obsidian";

import FastSync from "../main";


/**
 * 同步规则结构
 */
export interface SyncRule {
  pattern: string;
  caseSensitive: boolean;
}

/**
 * =============================================================================
 * 路径与过滤相关 (Path & Exclusion)
 * =============================================================================
 */

/**
 * 获取文件名
 */
export const getFileName = function (path: string, includeExt: boolean = true): string {
  const base = path.split(/[\\/]/).pop() || ""
  const lastDotIndex = base.lastIndexOf(".")

  // 如果没有点，或者点在字符串末尾（即没有实际后缀内容），视为不含后缀
  if (lastDotIndex === -1) return ""

  if (includeExt) return base
  return base.substring(0, lastDotIndex)
}

/**
 * 获取目录名
 */
export const getDirName = function (path: string): string {
  // 1. 统一将 Windows 分隔符 \ 替换为 /，方便统一处理
  // 2. 找到最后一个斜杠的位置
  const lastSlashIndex = path.replace(/\\/g, "/").lastIndexOf("/");

  // 如果找不到斜杠，说明路径只包含文件名（在当前目录下），返回空字符串
  if (lastSlashIndex === -1) return "";

  const parts = path.split("/");
  return parts[0] || "";
};

/**
 * 获取目录名或空
 */
export const getDirNameOrEmpty = function (path: string): string {
  return path != undefined && path.includes(".") ? "" : path;
};

/**
 * 检查路径是否命中模式
 * 支持正则 (默认忽略大小写) 或 路径前缀匹配
 * 匹配情况：
 * 1. regex 匹配 (不包含前后斜线)
 * 2. path === pattern (全等)
 * 3. path 以 pattern + "/" 开头 (子目录或文件)
 */
export const isPathMatch = function (path: string, pattern: string, caseSensitive: boolean = false): boolean {
  // 1. 尝试正则匹配
  try {
    // 根据规则决定是否忽略大小写
    const flags = caseSensitive ? "" : "i";
    // 检查 pattern 是否已经包含前后斜杠 (如果是纯正则模式)
    // 这里保持原逻辑：强制从头匹配 ^
    const regex = new RegExp("^" + pattern, flags);
    if (regex.test(path)) return true;
  } catch (e) {
    // 如果正则非法，则忽略错误，继续后续的路径匹配逻辑
  }

  // 2. 传统路径前缀匹配 (支持 Windows 分隔符兼容)
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // 如果不区分大小写，统一转小写进行匹配
  const p1 = caseSensitive ? normalizedPath : normalizedPath.toLowerCase();
  const p2 = caseSensitive ? normalizedPattern : normalizedPattern.toLowerCase();

  const p = p2.endsWith("/") ? p2.slice(0, -1) : p2;

  if (p1 === p) return true;
  if (p1.startsWith(p + "/")) return true;

  return false;
}

/**
 * 将设置中的字符串解析为规则数组
 * 支持旧版 (换行分隔) 和新版 (JSON)
 */
export const parseRules = function (setting: string): SyncRule[] {
  if (!setting || setting.trim() === "") return [];

  const trimmed = setting.trim();
  // 检查是否为 JSON 格式
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          pattern: typeof item === 'string' ? item : (item.pattern || ""),
          caseSensitive: !!item.caseSensitive
        })).filter(item => item.pattern !== "");
      }
    } catch (e) {
      // 解析失败，视为普通文本
    }
  }

  // 旧版逻辑：换行分隔
  return trimmed.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== "")
    .map(line => ({ pattern: line, caseSensitive: false }));
}

/**
 * 将规则数组序列化为 JSON 字符串
 */
export const stringifyRules = function (rules: SyncRule[]): string {
  if (!rules || rules.length === 0) return "";
  return JSON.stringify(rules);
}

/**
 * 检查路径是否被排除 (针对笔记和附件)
 */
export const isPathExcluded = function (path: string, plugin: FastSync): boolean {
  const { syncExcludeFolders, syncExcludeExtensions, syncExcludeWhitelist } = plugin.settings;
  const normalizedPath = path.replace(/\\/g, "/");

  // 0. 检查白名单 (优先级最高)
  if (syncExcludeWhitelist) {
    const whitelist = parseRules(syncExcludeWhitelist);
    if (whitelist.some(rule => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return false;
    }
  }

  // 1. 检查扩展名排除
  if (syncExcludeExtensions) {
    const extList = parseRules(syncExcludeExtensions);
    const ext = "." + normalizedPath.split(".").pop()?.toLowerCase();
    if (extList.some(rule => {
      const e = rule.pattern.toLowerCase();
      // 扩展名匹配目前强制不区分大小写，因为系统文件扩展名通常被视为同类
      return ext === e || (e.startsWith(".") && ext === e) || (!e.startsWith(".") && ext === "." + e);
    })) {
      return true;
    }
  }

  // 2. 检查目录/路径排除 (共享设置)
  if (syncExcludeFolders) {
    const folderList = parseRules(syncExcludeFolders);
    if (folderList.some(rule => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return true;
    }
  }

  return false;
}

/**
 * 排除监听文件的集合 (缓存)
 */
const CONFIG_EXCLUDE_SET = new Set<string>()

/**
 * 检查配置文件路径是否被排除
 */
export const configIsPathExcluded = function (relativePath: string, plugin: FastSync): boolean {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const { syncExcludeFolders, syncExcludeWhitelist } = plugin.settings;

  // 0. 检查白名单 (优先级最高 - 使用共享设置)
  if (syncExcludeWhitelist) {
    const whitelist = parseRules(syncExcludeWhitelist);
    if (whitelist.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return false
    }
  }

  // 1. 检查内部排除集合 (支持左匹配) - 重要逻辑保留
  if (Array.from(CONFIG_EXCLUDE_SET).some(p => isPathMatch(normalizedPath, p, false))) {
    return true
  }

  // 2. 检查用户设置的排除 (使用共享设置)
  if (syncExcludeFolders) {
    const rules = parseRules(syncExcludeFolders);
    if (rules.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return true
    }
  }

  return false
}

/**
 * 获取用户自定义的配置同步目录列表（过滤 . 开头的目录）
 */
export const getConfigSyncCustomDirs = function (plugin: FastSync): string[] {
  const setting = plugin.settings.configSyncOtherDirs || ""
  return setting
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "" && p.startsWith("."))
}

/**
 * 校验路径是否属于配置同步范畴
 * 包含：.obsidian 目录、localStorage 虚拟目录、以及用户自定义目录
 */
export const isPathInConfigSyncDirs = function (path: string, plugin: FastSync): boolean {
  const normalizedPath = path.replace(/\\/g, "/")
  const configDir = plugin.app.vault.configDir

  // 1. 检查是否为标准配置目录
  if (normalizedPath.startsWith(configDir + "/")) return true



  // 2. 检查是否为 localStorage 虚拟目录
  const storagePrefix = plugin.localStorageManager.syncPathPrefix

  if (normalizedPath === storagePrefix || normalizedPath.startsWith(storagePrefix)) return true

  // 3. 检查是否为用户定义的自定义同步目录
  const customDirs = getConfigSyncCustomDirs(plugin)
  if (customDirs.some(dir => normalizedPath === dir || normalizedPath.startsWith(dir + "/"))) return true

  return false
}

/**
 * 添加到临时排除集合
 */
export const configAddPathExcluded = function (relativePath: string, plugin: FastSync): void {
  CONFIG_EXCLUDE_SET.add(relativePath)
}

/**
 * =============================================================================
 * 哈希相关 (Hashing)
 * =============================================================================
 */

/**
 * 对字符串内容进行哈希
 */
export const hashContent = function (content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash
  }
  return String(hash)
}

/**
 * 对 ArrayBuffer 进行哈希
 */
/**
 * 对 ArrayBuffer 进行哈希 (优化版：优先使用 Web Crypto API 以避免大文件计算导致 UI 冻结)
 * Hash ArrayBuffer (Optimized: prioritizing Web Crypto API to avoid UI freeze due to large file calculation)
 */
export const hashArrayBuffer = async function (buffer: ArrayBuffer): Promise<string> {
  // 优先使用 Web Crypto API (SubtleCrypto)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      // 将 ArrayBuffer 转换为 16 进制字符串，截取前 16 位以保持较短的指纹
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch (e) {
      dump("Web Crypto hash failed, falling back to JS implementation:", e);
    }
  }

  // 基础兼容性回退方案 (JS 循环)
  let hash = 0
  const view = new Uint8Array(buffer)
  for (let i = 0; i < view.length; i++) {
    const byte = view[i]
    hash = (hash << 5) - hash + byte
    hash &= hash
  }
  return String(hash)
}

/**
 * 获取安全的 ctime (如果不存在则回退到 mtime)
 */
export const getSafeCtime = function (stat: { ctime?: number; mtime?: number }): number {
  return (stat.ctime && stat.ctime > 0) ? stat.ctime : (stat.mtime || Date.now());
}

/**
 * =============================================================================
 * 日期与时间相关 (Date & Time)
 * =============================================================================
 */

/**
 * 将时间戳转换为格式化的日期字符串 (YYYY-MM-DD HH:mm:ss)
 */
export const timestampToDate = function (timestamp: number): string {
  return moment(timestamp).format("YYYY-MM-DD HH:mm:ss")
}

/**
 * 将日期字符串转换为格式化的日期字符串 (YYYY-MM-DD HH:mm:ss)
 */
export const stringToDate = function (date: string): string {
  if (!date || date == "") {
    date = "1970-01-01 00:00:00"
  }
  return moment(date).format("YYYY-MM-DD HH:mm:ss")
}

/**
 * 延迟执行 (让出主线程)
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 等待文件夹变为空
 */
export const waitForFolderEmpty = async function (path: string, plugin: FastSync, timeoutMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  const normalizedPath = normalizePath(path);

  while (Date.now() - startTime < timeoutMs) {
    const folder = plugin.app.vault.getAbstractFileByPath(normalizedPath);
    if (!(folder instanceof TFolder)) {
      return true; // 文件夹已经不存在了，也算成功
    }

    if (folder.children.length === 0) {
      return true; // 文件夹已空
    }

    dump(`Waiting for folder to be empty: ${normalizedPath} (${folder.children.length} items remaining)`);
    await sleep(100); // 等待 200ms 后重试
  }

  dump(`Timeout waiting for folder to be empty: ${normalizedPath}`);
  return false;
}

/**
 * =============================================================================
 * 网络与 URL 相关 (Network & URL)
 * =============================================================================
 */

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url)
}

export function isWsUrl(url: string): boolean {
  return /^wss?:\/\/.+/i.test(url)
}

/**
 * 为 URL 增加随机参数以防止缓存
 */
export function addRandomParam(url: string): string {
  const separator = url.includes("?") ? "&" : "?"
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${url}${separator}_t=${Date.now()}&_r=${randomStr}`
}

/**
 * 生成 UUID v4 (兼性更好的版本)
 */
export function generateUUID(): string {
  // 优先使用标准 API
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // 兼容性回退方案 (使用 getRandomValues)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }

  // 最后的兜底方案 (Math.random)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * =============================================================================
 * 日志与调试相关 (Logging & Debug)
 * =============================================================================
 */

let isLogEnabled = false

/**
 * 设置是否启用日志
 */
export const setLogEnabled = (enabled: boolean) => {
  isLogEnabled = enabled
}

/**
 * 打印普通日志
 */
export const dump = function (...message: unknown[]): void {
  if (isLogEnabled) {
    console.log(...message)
  }
}

/**
 * 以表格形式打印日志
 */
export const dumpTable = function (message: any): void {
  if (isLogEnabled) {
    console.table(message)
  }
}

/**
 * =============================================================================
 * 其他 UI 相关 (Other UI)
 * =============================================================================
 */

/**
 * 显示错误消息通知
 */
export const showErrorDialog = function (message: string): void {
  new Notice(message)
}

/**
 * 格式化文件大小
 */
export const formatFileSize = function (bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes)) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
