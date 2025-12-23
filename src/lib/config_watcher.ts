import { Stat, normalizePath, Platform } from "obsidian";

import { ConfigModify, ConfigDelete } from "./fs";
import FastSync from "../main";
import { dump } from "./helps";


/**
 * 排除监听文件的集合（相对路径）
 */
export const CONFIG_EXCLUDE_SET: Set<string> = new Set()

/**
 * 判断配置路径是否被排除
 * @param relativePath - 相对于 .obsidian 目录的路径
 * @param plugin - 插件实例
 */
export function isConfigPathExcluded(relativePath: string, plugin: FastSync): boolean {
    if (CONFIG_EXCLUDE_SET.has(relativePath)) return true

    const excludeSetting = plugin.settings.configExclude || ""
    if (!excludeSetting.trim()) return false

    const excludePaths = excludeSetting
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p !== "")

    return excludePaths.some((p) => relativePath === p || relativePath.startsWith(p + "/"))
}

/**
 * Obsidian 配置目录结构说明 (.obsidian/)
 * 此文件仅作为开发参考，描述了插件需要关注或同步的核心配置文件。
 *
 * .obsidian/
 * ├── themes/                      # 【主题目录】存放下载的第三方主题
 * │   └── Minimal/                 # 具体主题文件夹（以主题名命名）
 * │       ├── manifest.json        # 主题元数据（版本、作者、更新日志）
 * │       └── theme.css            # 主题的核心样式代码
 * │
 * ├── plugins/                     # 【插件目录】存放第三方插件
 * │   └── dataview/                # 具体插件文件夹
 * │       ├── main.js              # 插件逻辑代码
 * │       ├── manifest.json        # 插件配置与依赖信息
 * │       └── styles.css           # 插件自带的样式
 * │
 * ├── snippets/                    # 【代码片段】存放自定义的 .css 片段文件
 * │   ├── custom-font.css
 * │   └── dashboard-tweak.css
 * │
 * ├── appearance.json              # 【外观配置】记录当前选中的主题、字体、CSS片段开关状态
 * ├── app.json                     # 【核心配置】内部核心设置（附件位置、Wiki链接格式、编辑器偏好等）
 * ├── community-plugins.json       # 【社区插件】已启用的第三方插件列表
 * ├── core-plugins.json            # 【核心插件】系统内置插件的开关状态
 * ├── hotkeys.json                 # 【快捷键】用户自定义的快捷键配置
 * ├── workspace.json               # 【工作区-桌面端】记录打开的页签、窗体布局及侧边栏状态
 * ├── workspace-mobile.json        # 【工作区-移动端】记录移动端特有的页签与布局状态
 * ├── types.json                   # 【属性类型】记录文档属性（Properties）的全局元数据与类型定义
 * ├── command-palette.json         # 【命令面板】记录命令面板中置顶（PIN）的命令
 * └── graph.json                   # 【关系图谱】记录关系图谱视图的显示设置、筛选条件等配置
 */

/**
 * [根目录] 需要监听的核心配置文件列表
 */
export const ROOT_FILES_TO_WATCH = ["app.json", "appearance.json", "backlink.json", "bookmarks.json", "command-palette.json", "community-plugins.json", "core-plugins.json", "core-plugins-migration.json", "graph.json", "hotkeys.json", "page-preview.json", "starred.json", "webviewer.json", "types.json"]

/**
 * [插件目录] 需要监听的插件内部核心文件
 */
export const PLUGIN_FILES_TO_WATCH = ["data.json", "manifest.json", "main.js", "styles.css"]

/**
 * [主题目录] 需要监听的主题内部核心文件
 */
export const THEME_FILES_TO_WATCH = ["theme.css", "manifest.json"]

/**
 * ConfigWatcher 类
 * 用于监听 Obsidian 配置目录（.obsidian/）下的文件变化。
 * 通过轮询（Polling）机制检测文件的修改时间（mtime），并在检测到变化时触发同步。
 */
export class ConfigWatcher {
    private plugin: FastSync
    private intervalId: number | null = null
    private isScanning: boolean = false
    private nativeWatcher: any = null

    /**
     * 记录文件路径及其上一次已知的修改时间戳
     * 用于对比判断文件是否发生了内容更新
     */
    private fileStates: Map<string, number> = new Map()

    /**
     * [根目录] 需要监听的核心配置文件列表
     * 这些文件直接位于 .obsidian/ 目录下
     */
    private rootFilesToWatch = ROOT_FILES_TO_WATCH

    /**
     * [插件目录] 需要监听的插件内部核心文件
     * 位于 .obsidian/plugins/{plugin-id}/ 目录下
     */
    private pluginFilesToWatch = PLUGIN_FILES_TO_WATCH

    /**
     * [主题目录] 需要监听的主题内部核心文件
     * 位于 .obsidian/themes/{theme-name}/ 目录下
     */
    private themeFilesToWatch = THEME_FILES_TO_WATCH

    constructor(plugin: FastSync) {
        this.plugin = plugin
        const manifest = this.plugin.manifest.dir ?? ""

        const relativePath = manifest.replace(this.plugin.app.vault.configDir + "/", "") + "/data.json"
        CONFIG_EXCLUDE_SET.add(relativePath)
    }

    /**
     * 检查路径是否被排除
     * @param relativePath - 相对于 .obsidian 目录的路径
     */
    private isPathExcluded(relativePath: string): boolean {
        return isConfigPathExcluded(relativePath, this.plugin)
    }

    /**
     * 启动配置监听器
     * 首先执行一次全量初始化扫描，标记当前文件状态，然后开启 3 秒一次的轮询
     */
    start() {
        this.stop() // 确保在启动新定时器前清理旧定时器，防止泄露

        dump("ConfigWatcher: 开始全量监听 (设置 + 插件 + 主题 + 片段)...")

        // 初始化扫描：仅记录状态，不触发上传
        this.scanAll(true)

        // 针对 MAC 和 Windows 系统使用原生文件监听
        if (Platform.isMacOS || Platform.isWin) {
            this.startNativeWatcher()
        } else {
            // 设置轮询定时器
            this.intervalId = window.setInterval(() => {
                this.scanAll(false)
            }, 3000)
        }
    }

    /**
     * 启动原生文件监听 (Node.js fs.watch)
     * 仅适用于桌面端 (macOS/Windows)
     */
    private startNativeWatcher() {
        try {
            const fs = require("fs")
            const configDir = normalizePath(`${(this.plugin.app.vault.adapter as any).getBasePath()}/${this.plugin.app.vault.configDir}`)

            dump(`[ConfigWatcher] Node Watcher: ${configDir}`)

            this.nativeWatcher = fs.watch(configDir, { recursive: true }, (eventType: string, filename: string) => {
                if (!filename) return

                // 将 Windows 反斜杠转换为正斜杠
                const normalizedFilename = filename.replace(/\\/g, "/")
                const parts = normalizedFilename.split("/")
                const fileName = parts.pop() || ""
                const subDir = parts[0] // plugins, themes, snippets or undefined (root)

                let shouldCheck = false

                if (parts.length === 0) {
                    // 根目录下的文件
                    if (this.rootFilesToWatch.includes(fileName)) {
                        shouldCheck = true
                    }
                } else if (subDir === "plugins" && parts.length === 2) {
                    // plugins/{plugin-id}/{filename}
                    if (this.pluginFilesToWatch.includes(fileName)) {
                        shouldCheck = true
                    }
                } else if (subDir === "themes" && parts.length === 2) {
                    // themes/{theme-name}/{filename}
                    if (this.themeFilesToWatch.includes(fileName)) {
                        shouldCheck = true
                    }
                } else if (subDir === "snippets" && fileName.endsWith(".css")) {
                    // snippets/{filename}.css
                    shouldCheck = true
                }

                if (isConfigPathExcluded(normalizedFilename, this.plugin)) return

                if (shouldCheck) {
                    const filePath = normalizePath(`${this.plugin.app.vault.configDir}/${normalizedFilename}`)
                    // 原生监听可能会瞬间触发多个重复事件，checkFileChange 内部的时间戳对比已足够过滤
                    this.checkFileChange(filePath, false)
                }
            })

            this.nativeWatcher.on("error", (err: any) => {
                dump("[ConfigWatcher] Node Watcher error:", err)
                this.stopNativeWatcher()
                // 降级回轮询
                this.intervalId = window.setInterval(() => {
                    this.scanAll(false)
                }, 3000)
            })
        } catch (e) {
            dump("[ConfigWatcher] Node Watcher error, fallback to polling:", e)
            this.intervalId = window.setInterval(() => {
                this.scanAll(false)
            }, 3000)
        }
    }

    private stopNativeWatcher() {
        if (this.nativeWatcher) {
            try {
                this.nativeWatcher.close()
            } catch (e) {
                // 忽略关闭错误
            }
            this.nativeWatcher = null
            dump("[ConfigWatcher] Node Watcher stopped")
        }
    }

    /**
     * 手动更新文件状态（用于在接收服务器同步后同步本地状态，防止触发回环同步）
     * @param relativePath - 配置文件相对路径 (相对于 .obsidian/)
     * @param mtime - 新的修改时间戳
     */
    updateFileState(relativePath: string, mtime: number) {
        const filePath = normalizePath(`${this.plugin.app.vault.configDir}/${relativePath}`)
        this.fileStates.set(filePath, mtime)
        dump(`[ConfigWatcher] update file state: ${relativePath} -> ${mtime}`)
    }

    /**
     * 停止配置监听器
     * 清除轮询定时器，停止检测
     */
    stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId)
            this.intervalId = null
            dump("ConfigWatcher: stop polling ...")
        }
        this.stopNativeWatcher()
    }

    /**
     * 执行一次全量扫描
     * 依次扫描根配置、插件目录、主题目录以及 CSS 代码片段
     * @param isInit - 是否为初始化扫描。初次扫描仅记录 mtime，不做同步触发。
     */
    private async scanAll(isInit: boolean) {
        if (this.isScanning) {
            dump("[ConfigWatcher] scan is in progress, skip this scan")
            return
        }
        this.isScanning = true

        try {
            const configDir = this.plugin.app.vault.configDir

            // --- 1. 扫描根配置文件 ---
            for (const fileName of this.rootFilesToWatch) {
                if (this.isPathExcluded(fileName)) continue
                const filePath = normalizePath(`${configDir}/${fileName}`)
                await this.checkFileChange(filePath, isInit)
            }

            // --- 2. 扫描插件 (Plugins) ---
            // 遍历 .obsidian/plugins/ 下的所有子目录
            await this.scanSubFolders(normalizePath(`${configDir}/plugins`), this.pluginFilesToWatch, isInit)

            // --- 3. 扫描主题 (Themes) ---
            // 遍历 .obsidian/themes/ 下的所有子目录
            await this.scanSubFolders(normalizePath(`${configDir}/themes`), this.themeFilesToWatch, isInit)

            // --- 4. 扫描 CSS 片段 (Snippets) ---
            // 扫描 .obsidian/snippets/ 目录下的所有 .css 文件
            await this.scanSnippets(normalizePath(`${configDir}/snippets`), isInit)
        } catch (e) {
            dump("[ConfigWatcher] scan error:", e)
        } finally {
            this.isScanning = false
        }
    }

    /**
     * 辅助方法：扫描包含子文件夹的目录
     * 适用于插件和主题目录的深度扫描
     * @param rootPath - 扫描的根路径（如 plugins 目录）
     * @param filesToWatch - 每个子文件夹中需要关注的文件名列表
     * @param isInit - 是否为初始化扫描
     */
    private async scanSubFolders(rootPath: string, filesToWatch: string[], isInit: boolean) {
        try {
            if (!(await this.plugin.app.vault.adapter.exists(rootPath))) {
                return
            }
            const result = await this.plugin.app.vault.adapter.list(rootPath)
            for (const folderPath of result.folders) {
                const folderName = folderPath.split("/").pop()
                for (const fileName of filesToWatch) {
                    const relativePath = `${rootPath.split("/").pop()}/${folderName}/${fileName}`
                    if (this.isPathExcluded(relativePath)) continue
                    const filePath = normalizePath(`${folderPath}/${fileName}`)
                    await this.checkFileChange(filePath, isInit)
                }
            }
        } catch (e) {
            // 忽略目录不存在或无访问权限的情况
        }
    }

    /**
     * 辅助方法：扫描 Snippets 目录
     * 该目录下的 .css 文件直接作为片段存在，不需要进一步进入子目录
     * @param rootPath - snippets 目录路径
     * @param isInit - 是否为初始化扫描
     */
    private async scanSnippets(rootPath: string, isInit: boolean) {
        try {
            if (!(await this.plugin.app.vault.adapter.exists(rootPath))) {
                return
            }
            const result = await this.plugin.app.vault.adapter.list(rootPath)
            for (const filePath of result.files) {
                // 仅监听以 .css 结尾的文件
                if (filePath.endsWith(".css")) {
                    const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")
                    if (this.isPathExcluded(relativePath)) continue
                    await this.checkFileChange(filePath, isInit)
                }
            }
        } catch (e) {
            dump("[ConfigWatcher] scan snippets error:", e)
        }
    }

    /**
     * 核心检测逻辑：基于文件修改时间 (mtime) 的变化检测
     * @param filePath - 待检测的文件路径
     * @param isInit - 是否为初始化扫描
     */
    private async checkFileChange(filePath: string, isInit: boolean) {
        const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")

        // 如果该配置正处于写入状态，跳过本次轮询检测，防止读取到中间状态的时间戳
        if (this.plugin.ignoredConfigFiles.has(relativePath)) {
            return
        }

        try {
            const stat = await this.plugin.app.vault.adapter.stat(filePath)

            // 如果文件不存在
            if (!stat) {
                if (this.fileStates.has(filePath)) {
                    this.fileStates.delete(filePath)
                    if (!isInit) {
                        const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")
                        dump(`[ConfigWatcher] deleted: ${relativePath}`)

                        const handler = configWatcherHandlers.get("delete")
                        if (handler) {
                            handler(relativePath, this.plugin)
                        }
                        // 预留：此处可扩展删除同步逻辑
                    }
                }
                return
            }

            // 对比修改时间戳
            const lastMtime = this.fileStates.get(filePath)
            if (stat.mtime !== lastMtime) {
                const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")
                dump("[ConfigWatcher] modified:", relativePath, lastMtime, stat.mtime)
                this.fileStates.set(filePath, stat.mtime)
                // 非初始化阶段检测到变化，触发同步
                if (!isInit) {
                    this.triggerSync(filePath)
                }
            }
        } catch (e) {
            // 忽略读取状态错误
        }
    }

    /**
     * 触发同步动作（防抖处理，防止频繁写入导致重复上传）
     * 设置为 2 秒防抖，并且在首个调用时立即触发
     */
    private triggerSync = (filePath: string) => {
        const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")
        if (isConfigPathExcluded(relativePath, this.plugin)) {
            return
        }
        dump(`[ConfigWatcher] sync: ${relativePath}`)

        const handler = configWatcherHandlers.get("sync")
        if (handler) {
            handler(relativePath, this.plugin)
        }
    }
}

/**
 * ConfigWatcher 事件处理器类型
 */
export type ConfigWatcherHandler = (relativePath: string, plugin: FastSync) => void

/**
 * ConfigWatcher 外部注册表
 * 模仿 syncReceiveMethodHandlers 的实现
 */
export const configWatcherHandlers: Map<string, ConfigWatcherHandler> = new Map()

configWatcherHandlers.set("sync", (path: string, plugin: FastSync) => {
    ConfigModify(path, plugin, true)
})
configWatcherHandlers.set("delete", (path: string, plugin: FastSync) => {
    ConfigDelete(path, plugin, true)
})

/**
 * 调试辅助：读取特定配置文件内容
 * @param plugin - 插件实例
 */

interface ConfigFile {
    content: string
    stat: Stat | null
}

interface FileTimeStat {
    ctime: number
    mtime: number
}

export async function readConfigFile(path: string, plugin: FastSync): Promise<ConfigFile> {
    const filePath = normalizePath(`${plugin.app.vault.configDir}/${path}`)

    try {
        const exists = await plugin.app.vault.adapter.exists(filePath)
        if (!exists) {
            return { content: "", stat: null }
        }
        const stat = await plugin.app.vault.adapter.stat(filePath)
        const content = await plugin.app.vault.adapter.read(filePath)
        return { content: content, stat: stat }
    } catch (error) {
        console.error("读取配置文件出错:", error)
    }
    return { content: "", stat: null }
}

/**
 * 调试辅助：将数据写入配置文件（覆盖写）
 * @param plugin - 插件实例
 * @param data - 要写入的 JSON 数据
 */
export async function writeConfigFile(path: string, content: any, time: FileTimeStat, plugin: FastSync) {
    // 1. 锁定配置文件，防止 ConfigWatcher 在写入期间触发同步

    try {
        // 确保父目录存在
        const folder = path.split("/").slice(0, -1).join("/")
        if (folder !== "") {
            const fullFolderPath = normalizePath(`${plugin.app.vault.configDir}/${folder}`)
            if (!(await plugin.app.vault.adapter.exists(fullFolderPath))) {
                await plugin.app.vault.adapter.mkdir(fullFolderPath)
            }
        }

        const filePath = normalizePath(`${plugin.app.vault.configDir}/${path}`)

        // 2. 更新内存中记录的状态，防止写完后监听器认为文件变了
        plugin.configWatcher.updateFileState(path, time.mtime)

        // 3. 执行写入
        await plugin.app.vault.adapter.write(filePath, content, { ctime: time.ctime, mtime: time.mtime })
        dump(`[writeConfigFile] ${path}, mtime: ${time.mtime}`)
    } catch (e) {
        console.error("[writeConfigFile] error:", e)
    }
}

/**
 * 调试辅助：更新配置文件的时间戳 (mtime/ctime)
 * @param path - 相对路径
 * @param time - 时间对象
 * @param plugin - 插件实例
 */
export async function updateConfigFileTime(path: string, time: FileTimeStat, plugin: FastSync) {
    const filePath = normalizePath(`${plugin.app.vault.configDir}/${path}`)

    try {
        if (await plugin.app.vault.adapter.exists(filePath)) {
            // 读取现有二进制内容
            const content = await plugin.app.vault.adapter.readBinary(filePath)

            // 手动同步监听器状态，防止触发回环上传
            plugin.configWatcher.updateFileState(path, time.mtime)

            // 重新写入，仅为了更新元数据 (ctime/mtime)
            await plugin.app.vault.adapter.writeBinary(filePath, content, {
                ctime: time.ctime,
                mtime: time.mtime,
            })

            dump(`[updateConfigFileTime] ${path}, mtime: ${time.mtime}`)
        }
    } catch (e) {
        console.error("[updateConfigFileTime] error:", e)
    }
}

/**
 * 调试辅助：删除配置文件
 * @param path - 相对路径
 * @param plugin - 插件实例
 */
export async function removeConfigFile(path: string, plugin: FastSync) {
    const filePath = normalizePath(`${plugin.app.vault.configDir}/${path}`)

    try {
        const exists = await plugin.app.vault.adapter.exists(filePath)
        if (exists) {
            await plugin.app.vault.adapter.remove(filePath)
            dump(`[removeConfigFile] deleted: ${filePath}`)
        } else {
            dump(`[removeConfigFile] not exists: ${filePath}`)
        }
    } catch (e) {
        console.error("[removeConfigFile] error:", e)
    }
}

/**
 * 调试辅助：清理配置目录下的空目录（如空插件或空主题目录）
 * @param plugin - 插件实例
 */
export async function cleanEmptyConfigFolders(plugin: FastSync) {
    const configDir = plugin.app.vault.configDir
    const foldersToClean = [normalizePath(`${configDir}/plugins`), normalizePath(`${configDir}/themes`)]

    for (const rootPath of foldersToClean) {
        try {
            if (!(await plugin.app.vault.adapter.exists(rootPath))) continue

            const result = await plugin.app.vault.adapter.list(rootPath)
            for (const folderPath of result.folders) {
                const folderResult = await plugin.app.vault.adapter.list(folderPath)
                // 如果文件夹内没有任何文件和子文件夹
                if (folderResult.files.length === 0 && folderResult.folders.length === 0) {
                    await plugin.app.vault.adapter.rmdir(folderPath, true)
                    dump(`[ConfigWatcher] 已清理空配置目录: ${folderPath}`)
                }
            }
        } catch (e) {
            // 忽略错误
        }
    }
}

/**
 * 调试辅助：获取配置目录下所有【受监听】的文件路径
 * @param plugin - 插件实例
 * @returns 相对路径列表
 */
export async function getAllConfigPaths(plugin: FastSync): Promise<string[]> {
    const configDir = plugin.app.vault.configDir
    const paths: string[] = []

    const adapter = plugin.app.vault.adapter

    const isPathExcluded = (relativePath: string) => isConfigPathExcluded(relativePath, plugin)

    try {
        // 1. 根目录文件
        for (const fileName of ROOT_FILES_TO_WATCH) {
            if (isPathExcluded(fileName)) continue
            const filePath = normalizePath(`${configDir}/${fileName}`)
            if (await adapter.exists(filePath)) {
                paths.push(fileName)
            }
        }

        // 2. 插件文件
        const pluginsPath = normalizePath(`${configDir}/plugins`)
        if (await adapter.exists(pluginsPath)) {
            const result = await adapter.list(pluginsPath)
            for (const folderPath of result.folders) {
                const pluginFolderName = folderPath.split("/").pop()
                for (const fileName of PLUGIN_FILES_TO_WATCH) {
                    const relativePath = `plugins/${pluginFolderName}/${fileName}`
                    if (isPathExcluded(relativePath)) continue
                    const filePath = normalizePath(`${folderPath}/${fileName}`)
                    if (await adapter.exists(filePath)) {
                        paths.push(relativePath)
                    }
                }
            }
        }

        // 3. 主题文件
        const themesPath = normalizePath(`${configDir}/themes`)
        if (await adapter.exists(themesPath)) {
            const result = await adapter.list(themesPath)
            for (const folderPath of result.folders) {
                const themeFolderName = folderPath.split("/").pop()
                for (const fileName of THEME_FILES_TO_WATCH) {
                    const relativePath = `themes/${themeFolderName}/${fileName}`
                    if (isPathExcluded(relativePath)) continue
                    const filePath = normalizePath(`${folderPath}/${fileName}`)
                    if (await adapter.exists(filePath)) {
                        paths.push(relativePath)
                    }
                }
            }
        }

        // 4. CSS 片段
        const snippetsPath = normalizePath(`${configDir}/snippets`)
        if (await adapter.exists(snippetsPath)) {
            const result = await adapter.list(snippetsPath)
            for (const filePath of result.files) {
                if (filePath.endsWith(".css")) {
                    const relativePath = `snippets/${filePath.split("/").pop()}`
                    if (isPathExcluded(relativePath)) continue
                    paths.push(relativePath)
                }
            }
        }
    } catch (e) {
        dump("Error getting config paths:", e)
    }

    return paths
}

/**
 * 重新加载特定配置
 * @param path - 相对路径
 * @param content - 文件内容 (字符串)
 * @param plugin - 插件实例
 */
export async function reloadConfig(path: string, content: string, plugin: FastSync) {
    const app = plugin.app as any

    // 1. 基础数据重载
    if (app.vault.reloadConfig) {
        await app.vault.reloadConfig()
        dump(`[reloadConfig] vault config reloaded from disk`)
    }

    // 2. 核心设置/外观设置应用
    if (path === "app.json" || path === "appearance.json") {
        try {
            const config = JSON.parse(content)
            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key)) {
                    // 对于有些设置，setConfig 会触发内部的 change 事件
                    app.vault.setConfig(key, config[key])
                }
            }

            if (path === "appearance.json") {
                // 处理主题切换
                if (config.theme && app.customCss) {
                    app.customCss.setTheme(config.theme)
                    app.customCss.onConfigChange()
                }
            }
            dump(`[reloadConfig] ${path} details applied`)
        } catch (e) {
            console.error(`Failed to apply details for ${path}`, e)
        }
    } else if (path === "hotkeys.json") {
        if (app.hotkeys) {
            await app.hotkeys.load()
            dump(`[reloadConfig] hotkeys reloaded`)
        }
    } else if (path.startsWith("snippets/") && path.endsWith(".css")) {
        if (app.customCss) {
            await app.customCss.readSnippets()
            dump(`[reloadConfig] snippets reloaded`)
        }
    }

    // 3. 刷新设置界面 (最重要的 UI 交互改进)
    // 如果用户正打开着设置面板，强制刷新当前选项卡以显示同步后的新值
    if (app.setting?.activeTab) {
        try {
            app.setting.activeTab.display()
            dump(`[reloadConfig] settings UI refreshed`)
        } catch (e) {
            // 忽略刷新失败
        }
    }
}
