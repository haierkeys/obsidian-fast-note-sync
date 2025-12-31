import { App, PluginSettingTab, Notice, Setting, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { SettingsView } from "./views/settings-view";
import { KofiImage } from "./lib/icons";
import { $ } from "./lang/lang";
import FastSync from "./main";


export interface PluginSettings {
  //是否自动上传
  syncEnabled: boolean
  // 是否开启配置项同步
  configSyncEnabled: boolean
  // 是否开启日志
  logEnabled: boolean
  //API地址
  api: string
  wsApi: string
  //API Token
  apiToken: string
  vault: string
  lastNoteSyncTime: number
  lastFileSyncTime: number
  lastConfigSyncTime: number
  //  [propName: string]: any;
  apiVersion: string
  configExclude: string
  clientName: string
  startupDelay: number
}

/**
 *

![这是图片](https://markdown.com.cn/assets/img/philly-magic-garden.9c0b4415.jpg)

 */

// 默认插件设置
export const DEFAULT_SETTINGS: PluginSettings = {
  // 是否自动上传
  syncEnabled: true,
  configSyncEnabled: false,
  logEnabled: false,
  // API 网关地址
  api: "",
  wsApi: "",
  // API 令牌
  apiToken: "",
  lastNoteSyncTime: 0,
  lastFileSyncTime: 0,
  lastConfigSyncTime: 0,
  vault: "defaultVault",
  apiVersion: "",
  configExclude: "",
  clientName: "",
  startupDelay: 500,
}

export class SettingTab extends PluginSettingTab {
  plugin: FastSync
  root: Root | null = null

  constructor(app: App, plugin: FastSync) {
    super(app, plugin)
    this.plugin = plugin
  }

  hide(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
  }

  display(): void {
    const { containerEl: set } = this

    set.empty()

    // new Setting(set).setName("Fast Note Sync").setDesc($("Fast sync")).setHeading()

    new Setting(set)
      .setName($("启用笔记自动同步"))
      .setDesc($("启用笔记自动同步描述"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncEnabled).onChange(async (value) => {
          if (value != this.plugin.settings.syncEnabled) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.syncEnabled = value
            this.display()
            await this.plugin.saveSettings("syncEnabled")
          }
        })
      )

    new Setting(set)
      .setName($("启用配置项同步"))
      .setDesc($("启用配置项同步描述"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.configSyncEnabled).onChange(async (value) => {
          if (value != this.plugin.settings.configSyncEnabled) {
            this.plugin.settings.configSyncEnabled = value
            await this.plugin.saveSettings("configSyncEnabled")
          }
        })
      )
    new Setting(set)
      .setName($("配置同步排除"))
      .setDesc($("配置同步排除描述"))
      .addTextArea((text) =>
        text
          .setPlaceholder($("配置同步排除输入"))
          .setValue(this.plugin.settings.configExclude)
          .onChange(async (value) => {
            if (value != this.plugin.settings.configExclude) {
              this.plugin.settings.configExclude = value
              await this.plugin.saveSettings()
            }
          })
      )
    new Setting(set)
      .setName("| " + $("远端"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const apiSet = set.createDiv()
    apiSet.addClass("fast-note-sync-settings")

    this.root = createRoot(apiSet)
    this.root.render(<SettingsView plugin={this.plugin} />)

    new Setting(set)
      .setName($("远端服务地址"))
      .setDesc($("选择一个 Fast note sync service 服务地址"))
      .addText((text) =>
        text
          .setPlaceholder($("输入您的 Fast note sync service 服务地址"))
          .setValue(this.plugin.settings.api)
          .onChange(async (value) => {
            if (value != this.plugin.settings.api) {
              this.plugin.wsSettingChange = true
              this.plugin.settings.api = value
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(set)
      .setName($("远端服务令牌"))
      .setDesc($("用于远端服务的访问授权令牌"))
      .addText((text) =>
        text
          .setPlaceholder($("输入您的 API 访问令牌"))
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            if (value != this.plugin.settings.apiToken) {
              this.plugin.wsSettingChange = true
              this.plugin.settings.apiToken = value
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(set)
      .setName($("远端仓库名"))
      .setDesc($("远端仓库名"))
      .addText((text) =>
        text
          .setPlaceholder($("远端仓库名"))
          .setValue(this.plugin.settings.vault)
          .onChange(async (value) => {
            this.plugin.settings.vault = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(set)
      .setName($("客户端名称"))
      .setDesc($("客户端名称描述"))
      .addText((text) =>
        text
          .setPlaceholder($("输入客户端名称"))
          .setValue(this.plugin.settings.clientName)
          .onChange(async (value) => {
            const trimmedValue = value.trim()
            if (trimmedValue != this.plugin.settings.clientName) {
              this.plugin.settings.clientName = trimmedValue
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(set)
      .setName($("启动延迟"))
      .setDesc($("启动延迟描述"))
      .addText((text) =>
        text
          .setPlaceholder($("输入延迟毫秒数"))
          .setValue(this.plugin.settings.startupDelay.toString())
          .onChange(async (value) => {
            const numValue = parseInt(value)
            if (!isNaN(numValue) && numValue >= 0) {
              this.plugin.settings.startupDelay = numValue
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(set)
      .setName("| " + $("支持"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")
    new Setting(set)
      .setName($("捐赠"))
      .setDesc($("如果您喜欢这个插件，请考虑捐赠以支持继续开发。"))
      .setClass("fast-note-sync-settings-support")
      .settingEl.createEl("a", { href: "https://ko-fi.com/haierkeys" })
      .createEl("img", {
        attr: { src: KofiImage, height: "36", border: "0", alt: "Buy me a coffee at ko-fi.com", class: "ko-fi-logo" },
      })
    new Setting(set)
      .setName($("开启日志"))
      .setDesc($("开启后将在控制台打印日志"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.logEnabled).onChange(async (value) => {
          this.plugin.settings.logEnabled = value
          await this.plugin.saveSettings()
        })
      )
    const debugDiv = set.createDiv()
    debugDiv.addClass("fast-note-sync-settings-debug")

    const debugButton = debugDiv.createEl("button")

    debugButton.setText($("复制 Debug 信息"))
    debugButton.onclick = async () => {
      await window.navigator.clipboard.writeText(
        JSON.stringify(
          {
            settings: {
              ...this.plugin.settings,
              apiToken: this.plugin.settings.apiToken ? "***HIDDEN***" : "",
            },
            pluginVersion: this.plugin.manifest.version,
          },
          null,
          4
        )
      )
      new Notice($("将调试信息复制到剪贴板, 可能包含敏感信!"))
    }

    if (Platform.isDesktopApp) {
      const info = debugDiv.createDiv()
      info.setText($("通过快捷键打开控制台，你可以看到这个插件和其他插件的日志"))

      const keys = debugDiv.createDiv()
      keys.addClass("custom-shortcuts")
      if (Platform.isMacOS === true) {
        keys.createEl("kbd", { text: $("console_mac") })
      } else {
        keys.createEl("kbd", { text: $("console_win") })
      }
    }
  }
}
