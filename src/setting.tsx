import { App, PluginSettingTab, Notice, Setting, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { SettingsView } from "./views/settings-view";
import { KofiImage } from "./lib/icons";
import { $ } from "./lang/lang";
import FastSync from "./main";


export interface PluginSettings {
  isInitSync: boolean
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
  offlineSyncStrategy: string
  syncExcludeFolders: string
  syncExcludeExtensions: string
  pdfSyncEnabled: boolean
  cloudPreviewEnabled: boolean
  cloudPreviewTypeRestricted: boolean
  cloudPreviewRemoteUrl: string
  cloudPreviewAutoDeleteLocal: boolean
}

/**
 *

![这是图片](https://markdown.com.cn/assets/img/philly-magic-garden.9c0b4415.jpg)

 */

// 默认插件设置
export const DEFAULT_SETTINGS: PluginSettings = {
  isInitSync: false,
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
  offlineSyncStrategy: "",
  syncExcludeFolders: "",
  syncExcludeExtensions: "",
  pdfSyncEnabled: true,
  cloudPreviewEnabled: true,
  cloudPreviewTypeRestricted: true,
  cloudPreviewRemoteUrl: "",
  cloudPreviewAutoDeleteLocal: false,
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
      .setName($("同步排除目录"))
      .setDesc($("同步排除目录描述"))
      .addTextArea((text) =>
        text
          .setPlaceholder("Folder1\nFolder2")
          .setValue(this.plugin.settings.syncExcludeFolders)
          .onChange(async (value) => {
            if (value != this.plugin.settings.syncExcludeFolders) {
              this.plugin.settings.syncExcludeFolders = value
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(set)
      .setName($("同步排除扩展名"))
      .setDesc($("同步排除扩展名描述"))
      .addTextArea((text) =>
        text
          .setPlaceholder(".tmp\n.log")
          .setValue(this.plugin.settings.syncExcludeExtensions)
          .onChange(async (value) => {
            if (value != this.plugin.settings.syncExcludeExtensions) {
              this.plugin.settings.syncExcludeExtensions = value
              await this.plugin.saveSettings()
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
      .setName($("开启 PDF 状态同步"))
      .setDesc($("开启 PDF 状态同步描述"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.pdfSyncEnabled).onChange(async (value) => {
          if (value != this.plugin.settings.pdfSyncEnabled) {
            this.plugin.settings.pdfSyncEnabled = value
            await this.plugin.saveSettings()
          }
        })
      )

    new Setting(set)
      .setName("| " + $("附件云预览"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    new Setting(set)
      .setName($("附件云预览"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cloudPreviewEnabled).onChange(async (value) => {
          if (value != this.plugin.settings.cloudPreviewEnabled) {
            this.plugin.settings.cloudPreviewEnabled = value;
            await this.plugin.saveSettings();
            this.display(); // 刷新以显示/隐藏子项
          }
        })
      )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("附件云预览描述"))

    if (this.plugin.settings.cloudPreviewEnabled) {
      new Setting(set)
        .setName($("附件云预览类型限制"))
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.cloudPreviewTypeRestricted).onChange(async (value) => {
            if (value != this.plugin.settings.cloudPreviewTypeRestricted) {
              this.plugin.settings.cloudPreviewTypeRestricted = value;
              await this.plugin.saveSettings();
            }
          })
        )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("附件云预览类型限制描述"))

      new Setting(set)
        .setName($("附件云预览远端源"))
        .addTextArea((text) =>
          text
            .setPlaceholder(".jpg;.png:http://domain.com/{path}")
            .setValue(this.plugin.settings.cloudPreviewRemoteUrl)
            .onChange(async (value) => {
              if (value != this.plugin.settings.cloudPreviewRemoteUrl) {
                this.plugin.settings.cloudPreviewRemoteUrl = value;
                await this.plugin.saveSettings();
              }
            })
            .inputEl.addClass("fast-note-sync-remote-url-area")
        )
      const remoteUrlSetting = set.lastElementChild as HTMLElement;
      remoteUrlSetting.addClass("fast-note-sync-remote-url-setting");
      this.setDescWithBreaks(remoteUrlSetting, $("附件云预览远端源描述"))

      new Setting(set)
        .setName($("附件云预览上传后删除"))
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.cloudPreviewAutoDeleteLocal).onChange(async (value) => {
            if (value != this.plugin.settings.cloudPreviewAutoDeleteLocal) {
              this.plugin.settings.cloudPreviewAutoDeleteLocal = value;
              await this.plugin.saveSettings();
            }
          })
        )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("附件云预览上传后删除描述"))
    }

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
              this.plugin.settings.isInitSync = false
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
              this.plugin.settings.isInitSync = false
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
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("启动延迟描述"))

    new Setting(set)
      .setName($("离线编辑合并策略"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("", $("策略选项_默认"))
          .addOption("newTimeMerge", $("策略选项_newTimeMerge"))
          .addOption("ignoreTimeMerge", $("策略选项_ignoreTimeMerge"))
          .setValue(this.plugin.settings.offlineSyncStrategy || "")
          .onChange(async (value) => {
            this.plugin.settings.offlineSyncStrategy = value
            await this.plugin.saveSettings("offlineSyncStrategy")
            // 立即发送 ClientInfo 到服务端，使设置立即生效
            this.plugin.websocket.sendClientInfo()
          })
      )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("离线编辑合并策略描述"))

    const strategyDesc = set.createDiv({ cls: "fast-note-sync-settings-strategy-desc fast-note-sync-settings" })
    const table = strategyDesc.createEl("table")
    const thead = table.createEl("thead")
    const headerRow = thead.createEl("tr")
    headerRow.createEl("th", { text: $("策略") })
    headerRow.createEl("th", { text: $("策略说明") })

    const tbody = table.createEl("tbody")

    const addRow = (strategy: string, desc: string) => {
      const row = tbody.createEl("tr")
      row.createEl("td", { text: strategy })
      row.createEl("td", { text: desc })
    }

    addRow($("策略选项_默认"), $("不合并_描述"))
    addRow($("策略选项_newTimeMerge"), $("newTimeMerge_描述"))
    addRow($("策略选项_ignoreTimeMerge"), $("ignoreTimeMerge_描述"))

    strategyDesc.createEl("div", { text: $("策略注意"), cls: "fast-note-sync-settings-strategy-notice" })


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
      const maskValue = (val: string) => {
        if (!val) return ""
        const parts = val.split("://")
        const protocol = parts.length > 1 ? parts[0] + "://" : ""
        const address = parts.length > 1 ? parts[1] : parts[0]

        // 处理端口号
        const lastColonIndex = address.lastIndexOf(":")
        let port = ""
        let host = address
        if (lastColonIndex !== -1 && !address.includes("/", lastColonIndex)) {
          host = address.slice(0, lastColonIndex)
          port = address.slice(lastColonIndex)
        }

        // 脱敏 Host 部分
        let maskedHost = host
        if (host.length > 4) {
          maskedHost = host[0] + "***" + host.slice(-1)
        } else if (host.length > 0) {
          maskedHost = host[0] + "***"
        }

        return protocol + maskedHost + port
      }

      await window.navigator.clipboard.writeText(
        JSON.stringify(
          {
            settings: {
              ...this.plugin.settings,
              api: maskValue(this.plugin.settings.api),
              wsApi: maskValue(this.plugin.settings.wsApi),
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

  private setDescWithBreaks(el: HTMLElement, desc: string) {
    const descEl = el.querySelector(".setting-item-description")
    if (descEl) {
      descEl.empty()
      const fragment = document.createDocumentFragment()
      const lines = desc.split("\n")

      let inTable = false
      let table: HTMLTableElement | null = null
      let tbody: HTMLTableSectionElement | null = null

      lines.forEach((line) => {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
          // 处理表格行
          const parts = trimmedLine
            .split("|")
            .filter((p, i, arr) => i > 0 && i < arr.length - 1)
            .map((p) => p.trim())

          if (!inTable) {
            inTable = true
            table = document.createElement("table")
            table.addClass("fast-note-sync-desc-table")
            const thead = table.createEl("thead")
            const tr = thead.createEl("tr")
            parts.forEach((p) => tr.createEl("th", { text: p }))
            tbody = table.createEl("tbody")
            fragment.appendChild(table)
          } else {
            // 检查是否为对齐行 (如 | --- | --- |)
            if (parts.every((p) => p.match(/^-+$/))) {
              return
            }
            if (tbody) {
              const tr = tbody.createEl("tr")
              parts.forEach((p) => tr.createEl("td", { text: p }))
            }
          }
        } else {
          // 退出表格模式
          inTable = false
          fragment.appendChild(document.createTextNode(line))
          fragment.appendChild(document.createElement("br"))
        }
      })
      descEl.appendChild(fragment)
    }
  }
}
