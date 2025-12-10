import { App, PluginSettingTab, Notice, Setting, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { SettingsView } from "./views/settings-view";
import { KofiImage } from "./lib/icons";
import { $ } from "./lang/lang";
import FastSync from "./main";


export interface PluginSettings {
  //是否自动上传
  syncEnabled: boolean
  //API地址
  api: string
  wsApi: string
  //API Token
  apiToken: string
  vault: string
  lastNoteSyncTime: number
  lastFileSyncTime: number
  //  [propName: string]: any;
  clipboardReadTip: string
}

/**
 *

![这是图片](https://markdown.com.cn/assets/img/philly-magic-garden.9c0b4415.jpg)

 */

// 默认插件设置
export const DEFAULT_SETTINGS: PluginSettings = {
  // 是否自动上传
  syncEnabled: true,
  // API 网关地址
  api: "",
  wsApi: "",
  // API 令牌
  apiToken: "",
  lastSyncTime: 0,
  vault: "defaultVault",
  // 剪贴板读取提示
  clipboardReadTip: "",
}

export class SettingTab extends PluginSettingTab {
  plugin: FastSync
  root: Root | null = null

  constructor(app: App, plugin: FastSync) {
    super(app, plugin)
    this.plugin = plugin
    this.plugin.clipboardReadTip = ""
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
      .setName($("启用同步"))
      .setDesc($("关闭后您的笔记将不做任何同步"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncEnabled).onChange(async (value) => {
          if (value != this.plugin.settings.syncEnabled) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.syncEnabled = value
            this.display()
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
        keys.createEl("kbd", { text: $("console_windows") })
      }
    }
  }
}
