import { normalizePath, Plugin } from "obsidian";

import { CONFIG_PLUGIN_FILES_TO_WATCH, CONFIG_ROOT_FILES_TO_WATCH, CONFIG_THEME_FILES_TO_WATCH, configModify, configDelete, configAddPathExcluded, configIsPathExcluded, configAllPaths } from "./config_operator";
import { dump, getFileName, getDirName, getDirNameOrEmpty } from "./helps";
import type FastSync from "../main";


export class ConfigManager {
  private plugin: FastSync
  private pluginDir: string = ""
  private pluginRealDir: string = ""
  private fileStates: Map<string, number> = new Map()
  private rootFilesToWatch: string[] = []
  private pluginFilesToWatch: string[] = []
  private themeFilesToWatch: string[] = []
  public enabledPlugins: Set<string> = new Set()

  constructor(plugin: FastSync) {
    this.plugin = plugin
    this.rootFilesToWatch = CONFIG_ROOT_FILES_TO_WATCH
    this.pluginFilesToWatch = CONFIG_PLUGIN_FILES_TO_WATCH
    this.themeFilesToWatch = CONFIG_THEME_FILES_TO_WATCH
    this.pluginRealDir = this.plugin.manifest.dir ?? ""
    this.pluginDir = this.pluginRealDir.replace(this.plugin.app.vault.configDir + "/", "")

    configAddPathExcluded("plugins/hot-reload/data.json", this.plugin)
    configAddPathExcluded("plugins/hot-reload/main.js", this.plugin)

    this.loadEnabledPlugins()
    this.initializeFileStates()
  }

  private async initializeFileStates() {
    if (!this.plugin.settings.configSyncEnabled) return

    const configDir = this.plugin.app.vault.configDir
    const paths = await configAllPaths(configDir, this.plugin)

    for (const relPath of paths) {
      const fullPath = normalizePath(`${configDir}/${relPath}`)
      try {
        const stat = await this.plugin.app.vault.adapter.stat(fullPath)
        if (stat && stat.type === "file") {
          this.fileStates.set(fullPath, stat.mtime)
        }
      } catch (e) {
        // 忽略读取不到的单个文件
      }
    }
    dump("ConfigManager: Initialized fileStates with", this.fileStates.size, "files")
  }

  public async handleRawEvent(path: string, eventEnter: boolean = false) {
    if (!this.plugin.settings.configSyncEnabled || !this.plugin.getWatchEnabled()) return

    const configDir = this.plugin.app.vault.configDir
    if (path.includes("/.git") || path.includes("/.DS_Store")) return
    if (!path.startsWith(configDir + "/")) return
    //相对目录
    const relativePath = path.replace(configDir + "/", "")
    if (configIsPathExcluded(relativePath, this.plugin)) return
    if (this.plugin.settings.logEnabled && relativePath.startsWith(this.pluginDir)) {
      dump("plugin.settings.logEnabled true Skip", relativePath)
      return
    }
    // 功能目录
    const topDir = getDirName(relativePath)
    // 文件名
    const fileName = getFileName(path)

    const parts = relativePath.split("/")
    // 名称目录
    const nameDir = getDirNameOrEmpty(parts[1])

    // 使用 stat 确定真实类型

    let shouldCheck = false

    if (parts.length === 1) {
      // 根配置
      if (this.rootFilesToWatch.includes(fileName)) shouldCheck = true
    } else if (topDir === "plugins" || topDir === "themes") {
      // 插件或主题
      if (parts.length === 2 && nameDir != "" && fileName == "") {
        // 目录变动
        shouldCheck = true
      } else if (parts.length === 3 && nameDir != "" && fileName != "") {
        // 受监控文件变动
        const isPluginFile = topDir === "plugins" && this.pluginFilesToWatch.includes(fileName)
        const isThemeFile = topDir === "themes" && this.themeFilesToWatch.includes(fileName)
        if (isPluginFile || isThemeFile) shouldCheck = true
      }
    } else if (topDir === "snippets" && nameDir == "" && fileName.endsWith(".css")) {
      shouldCheck = true
    }

    if (shouldCheck) {
      this.checkFileChange(path, eventEnter)
    }
  }

  async loadEnabledPlugins() {
    try {
      const filePath = normalizePath(`${this.plugin.app.vault.configDir}/community-plugins.json`)
      if (await this.plugin.app.vault.adapter.exists(filePath)) {
        const plugins = JSON.parse(await this.plugin.app.vault.adapter.read(filePath))
        if (Array.isArray(plugins)) this.enabledPlugins = new Set(plugins)
      }
    } catch (e) { }
  }

  private async checkFileChange(filePath: string, eventEnter: boolean = false, isFolder: boolean = false) {
    const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "")
    if (this.plugin.ignoredConfigFiles.has(relativePath)) return

    try {
      const stat = await this.plugin.app.vault.adapter.stat(filePath)

      // 1. 处理删除 (包括目录递归删除)
      if (!stat) {
        const prefix = filePath + "/"
        let foundMatch = false
        for (const cachedPath of this.fileStates.keys()) {
          if (cachedPath === filePath || cachedPath.startsWith(prefix)) {
            const rel = cachedPath.replace(this.plugin.app.vault.configDir + "/", "")
            this.fileStates.delete(cachedPath)
            configDelete(rel, this.plugin, eventEnter)
            dump("Config Delete", rel)
            foundMatch = true
          }
        }
        return
      }

      // 2. 目录变动不直接处理文件同步逻辑，仅作为触发点
      if (stat.type === "folder") {
        dump("Config Folder create skip", relativePath)
        return
      }

      // 3. 处理文件同步逻辑
      const lastMtime = this.fileStates.get(filePath)
      if (lastMtime === undefined) {
        this.fileStates.set(filePath, stat.mtime)
        // 初始同步或新文件
        configModify(relativePath, this.plugin, eventEnter)
        dump("Config Modify", relativePath)
        return
      }

      if (stat.mtime !== lastMtime) {
        this.fileStates.set(filePath, stat.mtime)
        // 初始同步或新文件
        configModify(relativePath, this.plugin, eventEnter)
        dump("Config Modify", relativePath)
      }
      dump("Config Modify mtime no change, skip", relativePath)
    } catch (e) { }
  }
}
