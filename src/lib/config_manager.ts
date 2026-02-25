import { normalizePath, Plugin } from "obsidian";

import { dump, getFileName, getDirName, getDirNameOrEmpty, configAddPathExcluded, configIsPathExcluded, isPathInConfigSyncDirs, getConfigSyncCustomDirs } from "./helps";
import { CONFIG_PLUGIN_EXTS_TO_WATCH, CONFIG_ROOT_FILES_TO_WATCH, CONFIG_THEME_EXTS_TO_WATCH, configModify, configDelete, configAllPaths } from "./config_operator";
import type FastSync from "../main";


export class ConfigManager {
  private plugin: FastSync
  private pluginDir: string = ""
  private pluginRealDir: string = ""
  private fileStates: Map<string, number> = new Map()
  private rootFilesToWatch: string[] = []
  private pluginExtsToWatch: string[] = []
  private themeExtsToWatch: string[] = []
  public enabledPlugins: Set<string> = new Set()

  constructor(plugin: FastSync) {
    this.plugin = plugin
    this.rootFilesToWatch = CONFIG_ROOT_FILES_TO_WATCH
    this.pluginExtsToWatch = CONFIG_PLUGIN_EXTS_TO_WATCH
    this.themeExtsToWatch = CONFIG_THEME_EXTS_TO_WATCH
    this.pluginRealDir = this.plugin.manifest.dir ?? ""
    const configDir = this.plugin.app.vault.configDir
    this.pluginDir = this.pluginRealDir

    configAddPathExcluded(`${configDir}/plugins/hot-reload/`, this.plugin)

    this.loadEnabledPlugins()
    this.initializeFileStates()
  }

  private async initializeFileStates() {
    if (!this.plugin.settings.configSyncEnabled) return

    const configDir = this.plugin.app.vault.configDir
    const customDirs = getConfigSyncCustomDirs(this.plugin)
    const paths = await configAllPaths([configDir, ...customDirs], this.plugin)

    for (const relPath of paths) {
      const fullPath = normalizePath(relPath)
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

    // 检查路径是否属于配置同步范畴
    if (!isPathInConfigSyncDirs(path, this.plugin)) return

    // 相对目录
    const relativePath = path
    if (configIsPathExcluded(relativePath, this.plugin)) return
    if (this.plugin.settings.logEnabled && relativePath.startsWith(this.pluginDir)) {
      dump("plugin.settings.logEnabled true Skip", relativePath)
      return
    }

    const fileName = getFileName(path)
    let shouldCheck = false

    // 如果路径不在核心配置目录内 (即自定义同步目录或虚拟路径)，则全量放行（除非被排除）
    if (!path.startsWith(configDir + "/")) {
      shouldCheck = true
    } else {
      // 核心配置目录内的路径，按照原有精细化规则分发
      const relativePathInConfig = path.replace(configDir + "/", "")
      const parts = relativePathInConfig.split("/")
      const topDir = parts[0]

      if (parts.length === 1) {
        // 根配置
        if (this.rootFilesToWatch.includes(fileName)) shouldCheck = true
      } else if (topDir === "plugins" || topDir === "themes") {
        const nameDir = getDirNameOrEmpty(parts[1])
        // 插件或主题
        if (parts.length === 2 && nameDir != "" && fileName == "") {
          // 目录变动
          shouldCheck = true
        } else if (parts.length === 3 && nameDir != "" && fileName != "") {
          // 受监控文件变动
          const isPluginFile = topDir === "plugins" && this.pluginExtsToWatch.some(ext => fileName.endsWith(ext))
          const isThemeFile = topDir === "themes" && this.themeExtsToWatch.some(ext => fileName.endsWith(ext))
          if (isPluginFile || isThemeFile) shouldCheck = true
        }
      } else if (topDir === "snippets" && parts.length === 2 && fileName.endsWith(".css")) {
        shouldCheck = true
      }
    }

    if (shouldCheck) {
      // 特殊处理本插件的 manifest.json 更新 (本地修改场景)
      if (fileName === "manifest.json" && relativePath === `${this.pluginDir}/manifest.json`) {
        setTimeout(async () => {
          try {
            const content = await this.plugin.app.vault.adapter.read(path)
            const manifest = JSON.parse(content)
            if (manifest.version && manifest.version !== this.plugin.manifest.version) {
              this.plugin.manifest.version = manifest.version
              dump(`[FastNoteSync] Local manifest updated to ${this.plugin.manifest.version}`)
            }
          } catch (e) {
            console.error("[FastNoteSync] Failed to read local manifest:", e)
          }
        }, 500) // 延迟读取确保写入完成
      }

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
    const relativePath = filePath
    if (this.plugin.ignoredConfigFiles.has(relativePath)) return

    try {
      const stat = await this.plugin.app.vault.adapter.stat(filePath)

      // 1. 处理删除 (包括目录递归删除)
      if (!stat) {
        const prefix = filePath + "/"
        let foundMatch = false
        for (const cachedPath of this.fileStates.keys()) {
          if (cachedPath === filePath || cachedPath.startsWith(prefix)) {
            const rel = cachedPath
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

  public updateFileState(filePath: string, mtime: number) {
    this.fileStates.set(filePath, mtime)
  }

  public removeFileState(filePath: string) {
    this.fileStates.delete(filePath)
    // 同时尝试删除目录前缀的缓存（如果有）
    const prefix = filePath + "/"
    for (const cachedPath of this.fileStates.keys()) {
      if (cachedPath.startsWith(prefix)) {
        this.fileStates.delete(cachedPath)
      }
    }
  }
}
