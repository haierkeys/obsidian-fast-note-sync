import { normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage } from "./types";
import { hashContent, hashArrayBuffer, dump, sleep } from "./helps";
import type FastSync from "../main";


/**
 * 排除监听文件的常量
 */
export const CONFIG_ROOT_FILES_TO_WATCH = ["app.json", "appearance.json", "backlink.json", "bookmarks.json", "command-palette.json", "community-plugins.json", "core-plugins.json", "core-plugins-migration.json", "graph.json", "hotkeys.json", "page-preview.json", "starred.json", "webviewer.json", "types.json"]
export const CONFIG_PLUGIN_FILES_TO_WATCH = ["data.json", "manifest.json", "main.js", "styles.css"]
export const CONFIG_THEME_FILES_TO_WATCH = ["theme.css", "manifest.json"]

/**
 * 排除监听文件的集合
 */
const CONFIG_EXCLUDE_SET = new Set<string>()

/**
 * 配置操作函数导出
 */

let reloadTimer: NodeJS.Timeout | null = null
const pendingConfigUpdates: Map<string, string> = new Map()

export const configModify = async function (path: string, plugin: FastSync, eventEnter: boolean = false) {

    if (plugin.settings.configSyncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.ignoredConfigFiles.has(path)) return
    if (configIsPathExcluded(path, plugin)) return

    plugin.addIgnoredConfigFile(path)

    const filePath = normalizePath(`${plugin.app.vault.configDir}/${path}`)
    let contentStr = ""
    let contentBuf: ArrayBuffer | null = null
    let mtime = 0
    let ctime = 0

    try {
        const exists = await plugin.app.vault.adapter.exists(filePath)
        if (exists) {
            const stat = await plugin.app.vault.adapter.stat(filePath)
            if (stat) {
                contentBuf = await plugin.app.vault.adapter.readBinary(filePath)
                contentStr = new TextDecoder().decode(contentBuf)
                mtime = stat.mtime
                ctime = stat.ctime
            }
        }
    } catch (error) {
        console.error("读取配置文件出错:", error)
    }

    if (!contentBuf || mtime === 0) {
        plugin.removeIgnoredConfigFile(path)
        return
    }

    const data = {
        vault: plugin.settings.vault,
        path: path,
        pathHash: hashContent(path),
        content: contentStr,
        contentHash: hashArrayBuffer(contentBuf),
        mtime: mtime,
        ctime: ctime,
    }
    plugin.websocket.MsgSend("SettingModify", data)
    plugin.removeIgnoredConfigFile(path)
}

export const configDelete = function (path: string, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.configSyncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.ignoredConfigFiles.has(path)) return
    if (configIsPathExcluded(path, plugin)) return

    plugin.addIgnoredConfigFile(path)
    const data = {
        vault: plugin.settings.vault,
        path: path,
        pathHash: hashContent(path),
    }
    plugin.websocket.MsgSend("SettingDelete", data)
    plugin.removeIgnoredConfigFile(path)
}

export const receiveConfigSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
    if (plugin.settings.configSyncEnabled == false) return
    if (configIsPathExcluded(data.path, plugin)) return
    if (plugin.ignoredConfigFiles.has(data.path)) return

    plugin.addIgnoredConfigFile(data.path)
    try {
        const folder = data.path.split("/").slice(0, -1).join("/")
        if (folder !== "") {
            const fullFolderPath = normalizePath(`${plugin.app.vault.configDir}/${folder}`)
            if (!(await plugin.app.vault.adapter.exists(fullFolderPath))) {
                await plugin.app.vault.adapter.mkdir(fullFolderPath)
            }
        }
        const filePath = normalizePath(`${plugin.app.vault.configDir}/${data.path}`)
        await plugin.app.vault.adapter.write(filePath, data.content, { ctime: data.ctime, mtime: data.mtime })
    } catch (e) {
        console.error("[writeConfigFile] error:", e)
    }

    await configReload(data.path, plugin, false, data.content)
    plugin.removeIgnoredConfigFile(data.path)

    if (plugin.settings.lastConfigSyncTime < data.lastTime) {
        plugin.settings.lastConfigSyncTime = data.lastTime
        await plugin.saveData(plugin.settings)
    }
}

export const receiveConfigUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
    if (plugin.settings.configSyncEnabled == false) return
    await configModify(data.path, plugin, false)
}

export const receiveConfigSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
    if (plugin.settings.configSyncEnabled == false) return
    if (configIsPathExcluded(data.path, plugin)) return
    if (plugin.ignoredConfigFiles.has(data.path)) return

    plugin.addIgnoredConfigFile(data.path)
    const filePath = normalizePath(`${plugin.app.vault.configDir}/${data.path}`)
    try {
        if (await plugin.app.vault.adapter.exists(filePath)) {
            const content = await plugin.app.vault.adapter.readBinary(filePath)
            await plugin.app.vault.adapter.writeBinary(filePath, content, { ctime: data.ctime, mtime: data.mtime })
        }
    } catch (e) {
        console.error("[updateConfigFileTime] error:", e)
    }
    plugin.removeIgnoredConfigFile(data.path)
}

export const receiveConfigSyncDelete = async function (data: ReceiveMessage, plugin: FastSync) {
    if (plugin.settings.configSyncEnabled == false) return
    if (configIsPathExcluded(data.path, plugin)) return
    if (plugin.ignoredConfigFiles.has(data.path)) return

    const fullPath = normalizePath(`${plugin.app.vault.configDir}/${data.path}`)
    if (await plugin.app.vault.adapter.exists(fullPath)) {
        await plugin.app.vault.adapter.remove(fullPath)
    }
}

export const receiveConfigSyncEnd = async function (data: ReceiveMessage, plugin: FastSync, checkCompletion: (plugin: FastSync) => void) {
    if (plugin.settings.configSyncEnabled == false) return
    plugin.settings.lastConfigSyncTime = data.lastTime
    await plugin.saveData(plugin.settings)
    plugin.syncTypeCompleteCount++
    checkCompletion(plugin)
}

/**
 * 辅助逻辑提取
 */

export const configAllPaths = async function (configDir: string, plugin: FastSync): Promise<string[]> {
    const paths: string[] = []
    const adapter = plugin.app.vault.adapter
    const isExcluded = (p: string) => configIsPathExcluded(p, plugin)

    try {
        for (const fileName of CONFIG_ROOT_FILES_TO_WATCH) {
            if (isExcluded(fileName)) continue
            if (await adapter.exists(normalizePath(`${configDir}/${fileName}`))) paths.push(fileName)
        }
        const pluginsPath = normalizePath(`${configDir}/plugins`)
        if (await adapter.exists(pluginsPath)) {
            const result = await adapter.list(pluginsPath)
            for (const folderPath of result.folders) {
                const folderName = folderPath.split("/").pop()
                for (const fileName of CONFIG_PLUGIN_FILES_TO_WATCH) {
                    const rel = `plugins/${folderName}/${fileName}`
                    if (!isExcluded(rel) && (await adapter.exists(normalizePath(`${folderPath}/${fileName}`)))) paths.push(rel)
                }
            }
        }
        const themesPath = normalizePath(`${configDir}/themes`)
        if (await adapter.exists(themesPath)) {
            const result = await adapter.list(themesPath)
            for (const folderPath of result.folders) {
                const folderName = folderPath.split("/").pop()
                for (const fileName of CONFIG_THEME_FILES_TO_WATCH) {
                    const rel = `themes/${folderName}/${fileName}`
                    if (!isExcluded(rel) && (await adapter.exists(normalizePath(`${folderPath}/${fileName}`)))) paths.push(rel)
                }
            }
        }
        const snippetsPath = normalizePath(`${configDir}/snippets`)
        if (await adapter.exists(snippetsPath)) {
            const result = await adapter.list(snippetsPath)
            for (const filePath of result.files) {
                if (filePath.endsWith(".css")) {
                    const rel = `snippets/${filePath.split("/").pop()}`
                    if (!isExcluded(rel)) paths.push(rel)
                }
            }
        }
    } catch (e) {
        dump("Error getting config paths:", e)
    }
    return paths
}

export const configEmptyFoldersClean = async function (configDir: string, plugin: FastSync) {
    if (plugin.settings.configSyncEnabled == false) return
    const folders = [normalizePath(`${configDir}/plugins`), normalizePath(`${configDir}/themes`)]
    for (const root of folders) {
        try {
            if (!(await plugin.app.vault.adapter.exists(root))) continue
            const res = await plugin.app.vault.adapter.list(root)
            for (const folder of res.folders) {
                const itemRes = await plugin.app.vault.adapter.list(folder)
                if (itemRes.files.length === 0 && itemRes.folders.length === 0) {
                    await plugin.app.vault.adapter.rmdir(normalizePath(folder), true)
                }
            }
        } catch (e) { }
    }
}

export const configReload = async function (path: string, plugin: FastSync, eventEnter: boolean = false, data: string = "") {
    // 将更新加入待处理列表

    pendingConfigUpdates.set(path, data)

    // 清除旧计时器
    if (reloadTimer) {
        clearTimeout(reloadTimer)
    }

    // 设置新计时器，延迟 1 秒

    reloadTimer = setTimeout(async () => {
        const app = plugin.app as any

        const updates = Array.from(pendingConfigUpdates.entries())
        pendingConfigUpdates.clear()
        reloadTimer = null

        if (app.vault.reloadConfig) await app.vault.reloadConfig()

        const pluginsToReload = new Set<string>()

        for (const [p, d] of updates) {
            if (p === "app.json" || p === "appearance.json") {
                try {
                    const config = JSON.parse(d)
                    // 仅在值确实改变时才设置，减少刷新频率
                    for (const key in config) {
                        if (app.vault.getConfig(key) !== config[key]) {
                            app.vault.setConfig(key, config[key])
                        }
                    }

                    if (p === "appearance.json" && app.customCss) {
                        // 修正属性名：社区主题使用的是 cssTheme
                        const targetTheme = config.cssTheme;
                        if (targetTheme !== undefined) {
                            // 核心检查：在切换主题前，先检查本地是否存在该主题文件
                            // 防止因为同步延迟导致主题文件夹还没下载完就切换，触发 Obsidian 的自动回落
                            const themes = (app.customCss as any).themes || {};
                            if (targetTheme === "" || themes.hasOwnProperty(targetTheme)) {
                                if (app.customCss.theme !== targetTheme) {
                                    app.customCss.setTheme(targetTheme)
                                    app.customCss.onConfigChange()
                                }
                            } else {
                                console.warn(`[Sync] 主题 "${targetTheme}" 本地尚未就绪，暂不切换以防重置为默认`);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Sync] 处理 ${p} 失败:`, e);
                }
            } else if (p === "community-plugins.json") {
                try {
                    const newP = JSON.parse(d)
                    const oldP = Array.from(plugin.configManager.enabledPlugins)
                    const toE = newP.filter((p: string) => !oldP.includes(p))
                    const toD = oldP.filter((p: string) => !newP.includes(p))
                    plugin.configManager.enabledPlugins = new Set(newP)
                    for (const id of toE) {
                        if (id != "hot-reload" && id != "fast-note-sync") {
                            pluginsToReload.add(id)
                        }
                    }
                    for (const id of toD) {
                        if (id != "hot-reload" && id != "fast-note-sync") await app.plugins.disablePlugin(id)
                    }
                } catch (e) { }
            } else if (p === "hotkeys.json") {
                if (app.hotkeys) await app.hotkeys.load()
            } else if (p.startsWith("snippets/") && p.endsWith(".css")) {
                if (app.customCss) await app.customCss.readSnippets()
            } else if (p.startsWith("plugins/")) {
                const parts = p.split("/")
                if (parts.length >= 3) {
                    const id = parts[1]
                    pluginsToReload.add(id)
                }
            }
        }

        // 统一处理插件重载
        for (const id of pluginsToReload) {
            if (id === "hot-reload") continue
            if (plugin.configManager.enabledPlugins.has(id)) {
                await app.plugins.disablePlugin(id)
                await app.plugins.enablePlugin(id)
            }
        }
        if (app.setting?.activeTab) app.setting.activeTab.display()
    }, 1000)
}

/**
 * 排除监听文件的逻辑
 */

export const configIsPathExcluded = function (relativePath: string, plugin: FastSync): boolean {

    if (CONFIG_EXCLUDE_SET.has(relativePath)) return true
    const setting = plugin.settings.configExclude || ""
    if (!setting.trim()) return false
    const paths = setting
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p !== "")
    return paths.some((p) => relativePath === p || relativePath.startsWith(p + "/"))
}

export const configAddPathExcluded = function (relativePath: string, plugin: FastSync): void {
    CONFIG_EXCLUDE_SET.add(relativePath)
}

/**
 * 提取 Operator 映射
 */
type ConfigOperator = (relativePath: string, plugin: FastSync, eventEnter?: boolean, data?: string) => void
const configOperators: Map<string, ConfigOperator> = new Map([
    ["ConfigModify", configModify],
    ["ConfigDelete", configDelete],
    ["ConfigEmptyFoldersClean", configEmptyFoldersClean],
    ["ConfigReload", configReload],
    ["ConfigAllPaths", configAllPaths],
    ["ConfigIsPathExcluded", configIsPathExcluded],
    ["ConfigAddPathExcluded", configAddPathExcluded],
])
