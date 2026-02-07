import { Notice, moment, normalizePath, TFolder } from "obsidian";

import FastSync from "../main";


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
export const isPathMatch = function (path: string, pattern: string): boolean {
  // 1. 尝试正则匹配 (默认忽略大小写)2
  try {
    const regex = new RegExp("^" + pattern, "i");
    if (regex.test(path)) return true;
  } catch (e) {
    // 如果正则非法，则忽略错误，继续后续的路径匹配逻辑
  }

  // 2. 传统路径前缀匹配 (支持 Windows 分隔符兼容)
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const p = normalizedPattern.endsWith("/") ? normalizedPattern.slice(0, -1) : normalizedPattern;

  if (normalizedPath === p) return true;
  if (normalizedPath.startsWith(p + "/")) return true;

  return false;
}

/**
 * 检查路径是否被排除 (针对笔记和附件)
 */
export const isPathExcluded = function (path: string, plugin: FastSync): boolean {
  const { syncExcludeFolders, syncExcludeExtensions, syncExcludeWhitelist } = plugin.settings;
  const normalizedPath = path.replace(/\\/g, "/");

  // 0. 检查白名单 (优先级最高)
  if (syncExcludeWhitelist) {
    const whitelist = syncExcludeWhitelist.split(/\r?\n/).map(p => p.trim()).filter(p => p !== "");
    if (whitelist.some(p => isPathMatch(normalizedPath, p))) {
      return false;
    }
  }

  // 1. 检查扩展名排除
  if (syncExcludeExtensions) {
    const extList = syncExcludeExtensions.split(/\r?\n/).map(e => e.trim().toLowerCase()).filter(e => e !== "");
    const ext = "." + normalizedPath.split(".").pop()?.toLowerCase();
    if (extList.some(e => ext === e || (e.startsWith(".") && ext === e) || (!e.startsWith(".") && ext === "." + e))) {
      return true;
    }
  }

  // 2. 检查目录排除
  if (syncExcludeFolders) {
    const folderList = syncExcludeFolders.split(/\r?\n/).map(f => f.trim()).filter(f => f !== "");
    if (folderList.some(f => isPathMatch(normalizedPath, f))) {
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
  // 0. 检查白名单 (优先级最高)
  const whitelistSetting = plugin.settings.configExcludeWhitelist || ""
  if (whitelistSetting.trim()) {
    const whitelist = whitelistSetting.split(/\r?\n/).map((p) => p.trim()).filter((p) => p !== "")
    if (whitelist.some((p) => isPathMatch(normalizedPath, p))) {
      return false
    }
  }

  if (CONFIG_EXCLUDE_SET.has(relativePath)) return true
  const setting = plugin.settings.configExclude || ""
  if (!setting.trim()) return false
  const paths = setting
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "")
  return paths.some((p) => isPathMatch(normalizedPath, p))
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
export const hashArrayBuffer = function (buffer: ArrayBuffer): string {
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
  return `${url}${separator}_t=${Date.now()}`
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
