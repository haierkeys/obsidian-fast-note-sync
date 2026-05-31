import { Notice, normalizePath, TFolder, Platform, App, PluginManifest } from "obsidian";
import { $ } from "../i18n/lang";

import FastSync from "../main";
import { SyncLogManager } from "./sync_log_manager";
import { nativeFetch, vaultDelete, dump, dumpError, setLogEnabled, logLevel } from "./helps_obsidian_bypass";

export { nativeFetch, vaultDelete, dump, dumpError, setLogEnabled, logLevel };


/**
 * 获取插件真实目录 (处理手动重命名文件夹的情况)
 * Get the real plugin directory (handles manually renamed folders)
 */
export const getPluginDir = function (plugin: FastSync): string {
  return (plugin.manifest as PluginManifest & { dir?: string }).dir || `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`
}

/**
 * 同步规则结构
 */
export interface SyncRule {
  pattern: string
  caseSensitive: boolean
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
  const lastSlashIndex = path.replace(/\\/g, "/").lastIndexOf("/")

  // 如果找不到斜杠，说明路径只包含文件名（在当前目录下），返回空字符串
  if (lastSlashIndex === -1) return ""

  const parts = path.split("/")
  return parts[0] || ""
}

/**
 * 获取目录名或空
 */
export const getDirNameOrEmpty = function (path: string): string {
  return path != undefined && path.includes(".") ? "" : path
}

/**
 * 清洗文件名中的非法字符 (Sanitize illegal characters in file name)
 * Obsidian 不允许在文件名中使用: \ / : * ? " < > |
 */
export const sanitizeFileName = function (name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-");
}

/**
 * 清洗完整路径中的非法字符 (Sanitize illegal characters in full path)
 * 保留路径分隔符 /，但清洗每一段的名称
 */
export const sanitizePath = function (path: string): string {
  if (!path) return path;
  // 先统一斜杠
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const sanitizedParts = parts.map((part, index) => {
    // 如果是最后一部分且为空（以/结尾的情况），保持原样
    if (index === parts.length - 1 && part === "") return part;
    return sanitizeFileName(part);
  });
  return sanitizedParts.join("/");
}

/**
 * 正则表达式缓存，避免重复编译
 * Regex cache to avoid redundant compilation
 */
const regexCache = new Map<string, RegExp>()

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
    const flags = caseSensitive ? "" : "i"
    const cacheKey = `${flags}:${pattern}`
    let regex = regexCache.get(cacheKey)

    if (!regex) {
      // 检查 pattern 是否已经包含前后斜杠 (如果是纯正则模式)
      // 这里保持原逻辑：强制从头匹配 ^
      regex = new RegExp("^" + pattern, flags)
      regexCache.set(cacheKey, regex)
    }

    if (regex.test(path)) return true
  } catch {
    // 如果正则非法，则忽略错误，继续后续的路径匹配逻辑
  }

  // 2. 传统路径前缀匹配 (支持 Windows 分隔符兼容)
  const normalizedPath = path.replace(/\\/g, "/")
  const normalizedPattern = pattern.replace(/\\/g, "/")

  // 如果不区分大小写，统一转小写进行匹配
  const p1 = caseSensitive ? normalizedPath : normalizedPath.toLowerCase()
  const p2 = caseSensitive ? normalizedPattern : normalizedPattern.toLowerCase()

  const p = p2.endsWith("/") ? p2.slice(0, -1) : p2

  if (p1 === p) return true
  if (p1.startsWith(p + "/")) return true

  return false
}

/**
 * 规则解析结果缓存
 * Rule parsing result cache
 */
const parsedRulesCache = new Map<string, SyncRule[]>()

/**
 * 将设置中的字符串解析为规则数组
 * 支持旧版 (换行分隔) 和新版 (JSON)
 */
export const parseRules = function (setting: string): SyncRule[] {
  if (!setting || setting.trim() === "") return []

  // 尝试从缓存获取
  const cached = parsedRulesCache.get(setting)
  if (cached) return cached

  const trimmed = setting.trim()
  let rules: SyncRule[] = []

  let isJsonParsed = false
  // 检查是否为 JSON 格式
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown[]
      if (Array.isArray(parsed)) {
        isJsonParsed = true
        rules = parsed
          .map((item) => {
            const ruleItem = item as { pattern?: string; caseSensitive?: boolean }
            return {
              pattern: typeof item === "string" ? item : ruleItem.pattern || "",
              caseSensitive: !!ruleItem.caseSensitive,
            }
          })
          .filter((item) => item.pattern !== "")
      }
    } catch {
      // 解析失败，视为普通文本
    }
  }

  // 如果不是合法的 JSON 格式，则走旧版逻辑：换行分隔
  if (!isJsonParsed && rules.length === 0) {
    rules = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => ({ pattern: line, caseSensitive: false }))
  }

  // 存入缓存
  parsedRulesCache.set(setting, rules)
  return rules
}

/**
 * 将规则数组序列化为 JSON 字符串
 */
export const stringifyRules = function (rules: SyncRule[]): string {
  if (!rules || rules.length === 0) return ""
  return JSON.stringify(rules)
}

/**
 * 检查路径是否被排除 (针对笔记和附件)
 */
export const isPathExcluded = function (path: string, plugin: FastSync): boolean {
  const { syncExcludeFolders, syncExcludeExtensions, syncExcludeWhitelist } = plugin.settings
  const normalizedPath = path.replace(/\\/g, "/")

  // 0. 检查白名单 (优先级最高)
  if (syncExcludeWhitelist) {
    const whitelist = parseRules(syncExcludeWhitelist)
    if (whitelist.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return false
    }
  }

  // 1. 检查扩展名排除
  if (syncExcludeExtensions) {
    const extList = parseRules(syncExcludeExtensions)
    const dotIndex = normalizedPath.lastIndexOf(".")
    const ext = dotIndex !== -1 ? normalizedPath.substring(dotIndex).toLowerCase() : ""

    if (
      ext &&
      extList.some((rule) => {
        const e = rule.pattern.toLowerCase()
        // 扩展名匹配目前强制不区分大小写，因为系统文件扩展名通常被视为同类
        return ext === e || (e.startsWith(".") && ext === e) || (!e.startsWith(".") && ext === "." + e)
      })
    ) {
      return true
    }
  }

  // 2. 检查目录/路径排除 (共享设置)
  if (syncExcludeFolders) {
    const folderList = parseRules(syncExcludeFolders)
    if (folderList.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return true
    }
  }

  return false
}

/**
 * 排除监听文件的集合 (缓存)
 */
const CONFIG_EXCLUDE_SET = new Set<string>()

/**
 * 检查路径是否显式命中白名单（共享设置 syncExcludeWhitelist）
 * Check if a path explicitly hits the whitelist (shared setting syncExcludeWhitelist)
 * 返回 true 表示该路径已被用户主动加入白名单，应跳过所有后续排除规则
 * Returns true if the path is explicitly in the whitelist and should bypass all exclude rules
 */
export const isInWhitelist = function (path: string, plugin: FastSync): boolean {
  const { syncExcludeWhitelist } = plugin.settings
  if (!syncExcludeWhitelist) return false
  const normalizedPath = path.replace(/\\/g, "/")
  const whitelist = parseRules(syncExcludeWhitelist)
  return whitelist.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))
}

/**
 * 检查配置文件路径是否被排除
 */
export const configIsPathExcluded = function (relativePath: string, plugin: FastSync): boolean {
  const normalizedPath = relativePath.replace(/\\/g, "/")
  const { syncExcludeFolders, syncExcludeWhitelist } = plugin.settings

  // 0. 检查白名单 (优先级最高 - 使用共享设置)
  if (syncExcludeWhitelist) {
    const whitelist = parseRules(syncExcludeWhitelist)
    if (whitelist.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return false
    }
  }

  // 1. 检查内部排除集合 (支持左匹配) - 重要逻辑保留
  if (Array.from(CONFIG_EXCLUDE_SET).some((p) => isPathMatch(normalizedPath, p, false))) {
    return true
  }

  // 2. 检查用户设置的排除 (使用共享设置)
  if (syncExcludeFolders) {
    const rules = parseRules(syncExcludeFolders)
    if (rules.some((rule) => isPathMatch(normalizedPath, rule.pattern, rule.caseSensitive))) {
      return true
    }
  }

  return false
}

/**
 * 获取用户自定义的配置同步目录列表
 */
export const getConfigSyncCustomDirs = function (plugin: FastSync): string[] {
  const setting = plugin.settings.configSyncOtherDirs || ""
  // 支持 JSON 格式（UI 保存格式）和旧版换行分隔格式
  const rules = parseRules(setting)
  return rules
    .map((r) => r.pattern.trim().replace(/\/+$/, "")) // 提取 pattern 并移除尾部斜杠
    .filter((p) => p !== "")
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
  if (customDirs.some((dir) => normalizedPath === dir || normalizedPath.startsWith(dir + "/"))) return true

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
/**
 * 对字符串内容进行哈希 (同步版本，适用于小字符串如路径)
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
 * 对字符串内容进行异步哈希 (支持大字符串分段处理，防止 UI 挂起)
 * Async version of hashContent that yields the thread for large strings
 */
export const hashContentAsync = async function (content: string): Promise<string> {
  let hash = 0
  const len = content.length
  // 每 256K 字符让出一次主线程
  const yieldSize = 256 * 1024

  for (let i = 0; i < len; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash

    if (i > 0 && i % yieldSize === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  return String(hash)
}

const FILE_HASH_THRESHOLD = 10 * 1024 * 1024 // 10MB
const FILE_HASH_SLICE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * 对 ArrayBuffer 进行哈希 (统一采用 JS 数字滚动哈希以保持一致性)
 * 对于超过 10MB 的数据，仅计算前 5MB 和后 5MB 的哈希值。
 * 分段计算并适时让出主线程，防止大文件导致 UI 卡顿 (Processed in chunks to yield main thread)
 */
export const hashArrayBuffer = async function (buffer: ArrayBuffer): Promise<string> {
  const size = buffer.byteLength
  let view: Uint8Array | null

  if (size <= FILE_HASH_THRESHOLD) {
    view = new Uint8Array(buffer)
  } else {
    // 大文件优化：拼接前 5MB 和后 5MB (Optimize for large files: slice first and last 5MB)
    view = new Uint8Array(FILE_HASH_SLICE_SIZE * 2)
    const fullView = new Uint8Array(buffer)

    // 添加边界保护：确保 subarray 不会超出 view 的预留空间 (Boundary protection: ensure subarray fits in view)
    const headLen = Math.min(size, FILE_HASH_SLICE_SIZE)
    const tailLen = Math.min(size, FILE_HASH_SLICE_SIZE)
    const tailStart = Math.max(0, size - tailLen)

    view.set(fullView.subarray(0, headLen), 0)
    view.set(fullView.subarray(tailStart, size), FILE_HASH_SLICE_SIZE)
  }

  return await computeRollingHash(view)
}

/**
 * 内部工具函数：使用 fetch + Range 协议读取文件的指定范围 (Internal helper: Read file range using fetch + Range)
 */
async function readRange(app: App, path: string, offset: number, length: number): Promise<ArrayBuffer> {
  const url = app.vault.adapter.getResourcePath(path)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 5000) // 5 秒超时

  try {
    const response = await nativeFetch(url, {
      headers: {
        'Range': `bytes=${offset}-${offset + length - 1}`
      },
      signal: controller.signal
    })

    if (response.status === 206 || response.status === 200) {
      let buffer = await response.arrayBuffer()
      // 如果服务器不支持 206 返回了 200 (全量)，或返回数据量超过预期，则进行截取以保持一致性
      // If server doesn't support 206 (returns 200) or returns more data than expected, slice to maintain consistency
      if (buffer.byteLength > length) {
        return buffer.slice(0, length)
      }
      return buffer
    }
    throw new Error(`Failed to read file range via fetch: ${response.status}`)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Read file range timeout (5s) for: ${path}`)
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/**
 * 直接通过文件路径计算哈希 (优化：大文件仅读取首尾，避免 OOM)
 * Calculate hash directly from file path (Optimization: read only head/tail for large files to avoid OOM)
 */
export const hashFileAsync = async function (app: App, path: string): Promise<string> {
  const stat = await app.vault.adapter.stat(path)
  if (!stat) return "0"

  const size = stat.size
  let view: Uint8Array

  if (size <= FILE_HASH_THRESHOLD) {
    // 小文件直接读取 (Read small files directly)
    const buffer = await app.vault.adapter.readBinary(path)
    view = new Uint8Array(buffer)
  } else {
    // 大文件优化：优先使用 fetch + Range 仅读取前 5MB 和后 5MB (Large file optimization: try fetch first/last 5MB)
    try {
      const head = await readRange(app, path, 0, FILE_HASH_SLICE_SIZE)
      const tailOffset = Math.max(0, size - FILE_HASH_SLICE_SIZE)
      const tail = await readRange(app, path, tailOffset, FILE_HASH_SLICE_SIZE)

      view = new Uint8Array(FILE_HASH_SLICE_SIZE * 2)
      const headUint8 = new Uint8Array(head)
      const tailUint8 = new Uint8Array(tail)

      // 强制截断至标准切片大小，防止 Uint8Array.set 越界 (Force slice to standard size to prevent RangeError)
      view.set(headUint8.subarray(0, Math.min(headUint8.length, FILE_HASH_SLICE_SIZE)), 0)
      view.set(tailUint8.subarray(0, Math.min(tailUint8.length, FILE_HASH_SLICE_SIZE)), FILE_HASH_SLICE_SIZE)
    } catch (e) {
      dump(`hashFileAsync: readRange failed or timeout, falling back to full read for ${path}: ${(e as Error).message}`);
      // 兜底方案：加载完整文件内容 (Fallback: read full file)
      const buffer = await app.vault.adapter.readBinary(path)
      const fullView = new Uint8Array(buffer)
      view = new Uint8Array(FILE_HASH_SLICE_SIZE * 2)

      const headLen = Math.min(size, FILE_HASH_SLICE_SIZE)
      const tailLen = Math.min(size, FILE_HASH_SLICE_SIZE)
      const tailStart = Math.max(0, size - tailLen)

      view.set(fullView.subarray(0, headLen), 0)
      view.set(fullView.subarray(tailStart, size), FILE_HASH_SLICE_SIZE)
    }
  }

  const hash = await computeRollingHash(view)
  dump(`[HashFile] [Calc] path=${path} size=${formatFileSize(size)} hash=${hash}`)
  return hash
}

/**
 * 内部统一哈希计算逻辑 (Internal unified hashing logic)
 */
async function computeRollingHash(view: Uint8Array | null): Promise<string> {
  if (!view) return "0"
  let hash = 0
  const len = view.length
  const yieldSize = 512 * 1024 // 每 512KB 让出一次主线程 (Yield every 512KB)

  for (let i = 0; i < len; i++) {
    const byte = view[i]
    hash = (hash << 5) - hash + byte
    hash &= hash

    if (i > 0 && i % yieldSize === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  const result = String(hash)
  view = null // 显式释放引用 (Explicitly release reference)
  return result
}


export const MAX_IN_MEMORY_FILE_SYNC_BYTES = 128 * 1024 * 1024


export const isLargeBinarySyncRisk = function (size: number, plugin: FastSync): boolean {
  if (plugin.settings.binarySyncLimitEnabled === false) return false
  return typeof size === "number" && size > MAX_IN_MEMORY_FILE_SYNC_BYTES
}

export const describeBinarySyncLimit = function (): string {
  return formatFileSize(MAX_IN_MEMORY_FILE_SYNC_BYTES)
}

export const logMemorySnapshot = function (label: string): void {
  if (logLevel === "off") return
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (memory) {
    dump("[FastNoteSync][Memory]", label, {
      used: formatFileSize(memory.usedJSHeapSize),
      total: formatFileSize(memory.totalJSHeapSize),
      limit: formatFileSize(memory.jsHeapSizeLimit),
    })
  } else {
    dump("[FastNoteSync][Memory]", label)
  }
}

/**
 * 获取安全的 ctime (如果不存在则回退到 mtime)
 */
export const getSafeCtime = function (stat: { ctime?: number; mtime?: number }): number {
  return stat.ctime && stat.ctime > 0 ? stat.ctime : stat.mtime || Date.now()
}

/**
 * =============================================================================
 * 日期与时间相关 (Date & Time)
 * =============================================================================
 */



/**
 * 延迟执行 (让出主线程)
 */
export const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) window.clearTimeout(timeout)
    timeout = window.setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * 等待文件夹变为空
 */
export const waitForFolderEmpty = async function (path: string, plugin: FastSync, timeoutMs: number = 10000): Promise<boolean> {
  const startTime = Date.now()
  const normalizedPath = normalizePath(path)

  while (Date.now() - startTime < timeoutMs) {
    const folder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
    if (!(folder instanceof TFolder)) {
      return true // 文件夹已经不存在了，也算成功
    }

    if (folder.children.length === 0) {
      return true // 文件夹已空
    }

    dump(`Waiting for folder to be empty: ${normalizedPath} (${folder.children.length} items remaining)`)
    await sleep(100) // 等待 200ms 后重试
  }

  dump(`Timeout waiting for folder to be empty: ${normalizedPath}`)
  return false
}

/**
 * =============================================================================
 * 网络与 URL 相关 (Network & URL)
 * =============================================================================
 */



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
 * 生成 UUID v4 (兼容性更好的版本)
 */
export function generateUUID(): string {
  // 优先使用标准 API
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  // 兼容性回退方案 (使用 getRandomValues)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return (([1e7] as unknown as string) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) => {
      const cNum = parseInt(c);
      const randomValues = new Uint8Array(1);
      crypto.getRandomValues(randomValues);
      return (cNum ^ (randomValues[0] & (15 >> (cNum / 4)))).toString(16);
    })
  }

  // 最后的兜底方案 (Math.random)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
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
  showSyncNotice(message)
}

/**
 * 格式化文件大小
 */
export const formatFileSize = function (bytes: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "0 B"
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
/**
 * 检查版本是否有更新 (忽略后缀如 -alpha)
 * Check if version is new (ignore suffixes like -alpha)
 */
export const isVersionNew = function (current: string, latest: string): boolean {
  if (!current || !latest) return false
  const cleanCurrent = current.split("-")[0].split(".").map(Number)
  const cleanLatest = latest.split("-")[0].split(".").map(Number)

  for (let i = 0; i < Math.max(cleanCurrent.length, cleanLatest.length); i++) {
    const v1 = cleanCurrent[i] || 0
    const v2 = cleanLatest[i] || 0
    if (v2 > v1) return true
    if (v2 < v1) return false
  }
  return false
}


/**
 * 通知接口定义
 */
export interface SyncNotice {
  setMessage(message: string): void
  hide(): void
}

/**
 * 显示同步状态通知（桌面端用标准 Notice，移动端用右上角小型 toast）
 * Show sync status notification (desktop: standard Notice, mobile: compact floating toast)
 */
export function showSyncNotice(message: string, duration: number = 2500): SyncNotice {
  if (!Platform.isMobile) {
    const notice = new Notice(message, duration)
    return {
      setMessage: (msg: string) => notice.setMessage(msg),
      hide: () => notice.hide(),
    }
  }
  // 移除已有 toast 避免堆叠 / Remove existing toast to avoid stacking
  const existing = activeDocument.querySelector(".fns-mobile-toast")
  if (existing) existing.remove()

  const toast = activeDocument.body.createDiv()
  toast.className = "fns-mobile-toast"
  toast.textContent = message

  let hideTimeout: number | null = null;

  const startHide = () => {
    if (toast.parentElement) {
      toast.classList.add("fns-mobile-toast-hiding")
      toast.addEventListener("animationend", () => toast.remove(), { once: true })
    }
  }

  if (duration > 0) {
    hideTimeout = window.setTimeout(startHide, duration)
  }

  return {
    setMessage: (msg: string) => {
      toast.textContent = msg
    },
    hide: () => {
      if (hideTimeout) window.clearTimeout(hideTimeout)
      startHide()
    },
  }
}

/**
/**
 * =============================================================================
 * Token 管理 (Token Management) - 移除加密以增强兼容性
 * =============================================================================
 */

/**
 * 保存 ApiUrl：直接使用 LocalStorage 存储 (Save ApiUrl to LocalStorage)
 */
export async function saveApiUrl(app: App, plugin: FastSync, apiUrl: string): Promise<void> {
  plugin.localStorageManager.setMetadata("apiUrl", apiUrl)
}

/**
 * 获取 ApiUrl：从 LocalStorage 获取 (Load ApiUrl from LocalStorage)
 */
export async function loadApiUrl(app: App, plugin: FastSync, dataJsonApi?: string): Promise<string> {
  const apiUrl = plugin.localStorageManager.getMetadata("apiUrl")
  if (!apiUrl && dataJsonApi) {
    return dataJsonApi
  }
  return (apiUrl as string) || ""
}

/**
 * 保存 Vault：直接使用 LocalStorage 存储 (Save Vault name to LocalStorage)
 */
export async function saveVault(app: App, plugin: FastSync, vault: string): Promise<void> {
  plugin.localStorageManager.setMetadata("vault", vault)
}

/**
 * 获取 Vault：从 LocalStorage 获取 (Load Vault name from LocalStorage)
 */
export async function loadVault(app: App, plugin: FastSync, dataJsonVault?: string): Promise<string> {
  const vault = plugin.localStorageManager.getMetadata("vault")
  if (!vault && dataJsonVault) {
    return dataJsonVault
  }
  return (vault as string) || ""
}

/**
 * 保存 自动重定向设置：直接使用 LocalStorage 存储 (Save AutoRedirect setting to LocalStorage)
 */
export async function saveAutoRedirect(app: App, plugin: FastSync, enabled: boolean): Promise<void> {
  plugin.localStorageManager.setMetadata("autoRedirectEnabled", enabled)
}

/**
 * 获取 自动重定向设置：从 LocalStorage 获取 (Load AutoRedirect setting from LocalStorage)
 */
export async function loadAutoRedirect(app: App, plugin: FastSync, dataJsonEnabled?: boolean): Promise<boolean> {
  const enabled = plugin.localStorageManager.getMetadata("autoRedirectEnabled")
  if (enabled === "" && dataJsonEnabled !== undefined) {
    return dataJsonEnabled
  }
  return enabled === true || enabled === "true"
}

/**
 * 保存 WS连接前探测设置：直接使用 LocalStorage 存储 (Save WsPreProbe setting to LocalStorage)
 */
export async function saveWsPreProbe(app: App, plugin: FastSync, enabled: boolean): Promise<void> {
  plugin.localStorageManager.setMetadata("wsPreProbeEnabled", enabled)
}

/**
 * 获取 WS连接前探测设置：从 LocalStorage 获取 (Load WsPreProbe setting from LocalStorage)
 */
export async function loadWsPreProbe(app: App, plugin: FastSync, dataJsonEnabled?: boolean): Promise<boolean> {
  const enabled = plugin.localStorageManager.getMetadata("wsPreProbeEnabled")
  if (enabled === "" && dataJsonEnabled !== undefined) {
    return dataJsonEnabled
  }
  return enabled === "" || enabled === true || enabled === "true"
}

/**
 * 保存 ApiToken：直接使用 LocalStorage 明文存储
 */
export async function saveApiToken(app: App, plugin: FastSync, token: string): Promise<void> {
  dump(`[ApiToken] Saving token (length: ${token?.length}) to LocalStorage...`)
  plugin.localStorageManager.setMetadata("apiToken", token)
  dump("[ApiToken] Saved to LocalStorage (plain text)")
}

/**
 * 获取 ApiToken：从 LocalStorage 获取，支持从旧的加密格式平滑回退
 */
export async function loadApiToken(app: App, plugin: FastSync, dataJsonToken?: string): Promise<string> {
  // 1. 优先尝试从 LocalStorage 获取
  let token = plugin.localStorageManager.getMetadata("apiToken")

  if (!token && dataJsonToken) {
    token = dataJsonToken;
  }

  if (token) {
    const tokenStr = token as string;
    // 如果是旧的加密格式，由于已移除 SafeStorage 特性，将无法解密。
    // 返回空字符串引导用户重新输入，或直接返回（如果已经是明文）。
    if (tokenStr.startsWith("encrypted:")) {
      dump("[ApiToken] Found legacy encrypted token, but SafeStorage is removed. Please re-input token.");
      return "";
    }
    return tokenStr;
  }

  dump("[ApiToken] No token found in any storage")
  return ""
}

/**
 * 安全地将未知类型转换为字符串，避免 [object Object]
 * Safely convert unknown to string, avoiding [object Object]
 */
export function safeStringify(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === 'object' || typeof value === 'function') {
    try {
      return JSON.stringify(value)
    } catch {
      return "[Unserializable]"
    }
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'symbol' || typeof value === 'bigint') {
    return String(value)
  }
  return ""
}

/**
 * 检查错误是否为大小写冲突错误，如果是，则获取本地实际路径并高亮弹窗提示用户
 * Check if the error is a case-sensitivity conflict; if so, find the actual local path and prompt the user.
 *
 * @param error 捕获到的错误 / The caught error
 * @param relativePath 期望写入的文件/文件夹路径 / The expected file or folder path to write
 * @param plugin 插件实例 / The plugin instance
 * @param typeSync 同步的类型（如：'NoteModify' | 'FileDownload' | 'ConfigModify' | 'ConfigMtime'） / The sync type for logging
 * @returns boolean 如果是大小写冲突且已提示用户，返回 true；否则返回 false / Returns true if a case conflict was detected and notified; otherwise false.
 */
export const checkAndNotifyCaseConflict = function (
  error: unknown,
  relativePath: string,
  plugin: FastSync,
  typeSync: 'NoteModify' | 'NoteMtime' | 'NoteRename' | 'FileDownload' | 'FileMtime' | 'FileRename' | 'FolderModify' | 'FolderRename' | 'ConfigModify' | 'ConfigMtime'
): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.toLowerCase().includes("already exists")) {
    const normalizedPath = normalizePath(relativePath);
    const lowerPath = normalizedPath.toLowerCase();
    const files = plugin.app.vault.getAllLoadedFiles();
    const matchedFile = files.find(f => f.path.toLowerCase() === lowerPath);

    if (matchedFile && matchedFile.path !== normalizedPath) {
      const typeLabel = typeSync.startsWith('File') ? $('ui.log.category_attachment') : typeSync.startsWith('Config') ? $('ui.log.category_config') : typeSync.startsWith('Folder') ? $('ui.log.category_folder') : $('ui.log.category_note');
      const noticeMsg = $('ui.status.case_conflict.title', { type: typeLabel, expectedPath: normalizedPath, actualPath: matchedFile.path });
      showSyncNotice(noticeMsg, 15000); // 提示持续 15 秒 / Duration of 15 seconds
      SyncLogManager.getInstance().addLog('receive', typeSync, $('ui.status.case_conflict.log', { actualPath: matchedFile.path }), 'error', relativePath);
      return true;
    }
  }
  return false;
}
