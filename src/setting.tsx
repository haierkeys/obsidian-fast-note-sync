import { App, PluginSettingTab, Notice, Setting, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { SettingsView, SupportView } from "./views/settings-view";
import { KofiImage, WXImage } from "./lib/icons";
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
  //  [propName: string]: any;

  serverVersion: string
  serverVersionIsNew: boolean
  serverVersionNewName: string
  serverVersionNewLink: string

  pluginVersionIsNew: boolean
  pluginVersionNewName: string
  pluginVersionNewLink: string

  configExclude: string
  startupDelay: number
  offlineSyncStrategy: string
  syncExcludeFolders: string
  syncExcludeExtensions: string
  syncExcludeWhitelist: string
  configExcludeWhitelist: string
  pdfSyncEnabled: boolean
  cloudPreviewEnabled: boolean
  cloudPreviewTypeRestricted: boolean
  cloudPreviewRemoteUrl: string
  cloudPreviewAutoDeleteLocal: boolean
  offlineDeleteSyncEnabled: boolean
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
  vault: "",
  serverVersion: "",
  serverVersionIsNew: false,
  serverVersionNewName: "",
  serverVersionNewLink: "",

  pluginVersionIsNew: false,
  pluginVersionNewName: "",
  pluginVersionNewLink: "",

  configExclude: "",
  startupDelay: 500,
  offlineSyncStrategy: "",
  syncExcludeFolders: "",
  syncExcludeExtensions: "",
  syncExcludeWhitelist: "",
  configExcludeWhitelist: "",
  pdfSyncEnabled: true,
  cloudPreviewEnabled: false,
  cloudPreviewTypeRestricted: true,
  cloudPreviewRemoteUrl: "",
  cloudPreviewAutoDeleteLocal: false,
  offlineDeleteSyncEnabled: false,
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

    new Setting(set)
      .setName("| " + $("setting.remote.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const apiSet = set.createDiv()
    apiSet.addClass("fast-note-sync-settings")

    this.root = createRoot(apiSet)
    this.root.render(<SettingsView plugin={this.plugin} />)

    new Setting(set).setName($("setting.remote.api_url")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.api_url_placeholder"))
        .setValue(this.plugin.settings.api)
        .onChange(async (value) => {
          if (value != this.plugin.settings.api) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.api = value
            this.plugin.localStorageManager.setMetadata("isInitSync", false)
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.api_url_desc"))

    new Setting(set).setName($("setting.remote.api_token")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.api_token_placeholder"))
        .setValue(this.plugin.settings.apiToken)
        .onChange(async (value) => {
          if (value != this.plugin.settings.apiToken) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.apiToken = value
            this.plugin.localStorageManager.setMetadata("isInitSync", false)
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.api_token_desc"))

    new Setting(set).setName($("setting.remote.vault_name")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.vault_name"))
        .setValue(this.plugin.settings.vault)
        .onChange(async (value) => {
          this.plugin.wsSettingChange = true
          this.plugin.settings.vault = value
          this.plugin.localStorageManager.setMetadata("isInitSync", false)
          await this.plugin.saveSettings()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.vault_name"))

    new Setting(set).setName($("setting.remote.client_name")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.client_name_placeholder"))
        .setValue(this.plugin.localStorageManager.getMetadata("clientName"))
        .onChange(async (value) => {
          const trimmedValue = value.trim()
          if (trimmedValue != this.plugin.localStorageManager.getMetadata("clientName")) {
            this.plugin.localStorageManager.setMetadata("clientName", trimmedValue)
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.client_name_desc"))

    new Setting(set)
      .setName("| " + $("setting.sync.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")
    // new Setting(set).setName("Fast Note Sync").setDesc($("Fast sync")).setHeading()

    new Setting(set).setName($("setting.sync.auto_note")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.syncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.syncEnabled) {
          this.plugin.wsSettingChange = true
          this.plugin.settings.syncEnabled = value
          this.display()
          await this.plugin.saveSettings("syncEnabled")
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.auto_note_desc"))

    new Setting(set).setName($("setting.sync.auto_config")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.configSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.configSyncEnabled) {
          this.plugin.settings.configSyncEnabled = value
          await this.plugin.saveSettings("configSyncEnabled")
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.auto_config_desc"))

    new Setting(set).setName($("setting.sync.pdf_state")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.pdfSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.pdfSyncEnabled) {
          this.plugin.settings.pdfSyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.pdf_state_desc"))

    new Setting(set).setName($("setting.sync.offline_delete")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.offlineDeleteSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.offlineDeleteSyncEnabled) {
          this.plugin.settings.offlineDeleteSyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.offline_delete_desc"))


    new Setting(set).setName($("setting.sync.exclude")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.exclude_placeholder"))
        .setValue(this.plugin.settings.syncExcludeFolders)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeFolders) {
            this.plugin.settings.syncExcludeFolders = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_desc"))

    new Setting(set).setName($("setting.sync.exclude_extensions")).addTextArea((text) =>
      text
        .setPlaceholder(".tmp\n.log")
        .setValue(this.plugin.settings.syncExcludeExtensions)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeExtensions) {
            this.plugin.settings.syncExcludeExtensions = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_extensions_desc"))

    new Setting(set).setName($("setting.sync.exclude_whitelist")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.exclude_placeholder"))
        .setValue(this.plugin.settings.syncExcludeWhitelist)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeWhitelist) {
            this.plugin.settings.syncExcludeWhitelist = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_whitelist_desc"))

    new Setting(set).setName($("setting.sync.config_exclude")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.config_exclude_placeholder"))
        .setValue(this.plugin.settings.configExclude)
        .onChange(async (value) => {
          if (value != this.plugin.settings.configExclude) {
            this.plugin.settings.configExclude = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_exclude_desc"))

    new Setting(set).setName($("setting.sync.config_exclude_whitelist")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.config_exclude_placeholder"))
        .setValue(this.plugin.settings.configExcludeWhitelist)
        .onChange(async (value) => {
          if (value != this.plugin.settings.configExcludeWhitelist) {
            this.plugin.settings.configExcludeWhitelist = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_exclude_whitelist_desc"))

    new Setting(set).setName($("setting.sync.startup_delay")).addText((text) =>
      text
        .setPlaceholder($("setting.sync.startup_delay_placeholder"))
        .setValue(this.plugin.settings.startupDelay.toString())
        .onChange(async (value) => {
          const numValue = parseInt(value)
          if (!isNaN(numValue) && numValue >= 0) {
            this.plugin.settings.startupDelay = numValue
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.startup_delay_desc"))


    new Setting(set).setName($("setting.sync.merge_strategy")).addDropdown((dropdown) =>
      dropdown
        .addOption("", $("setting.sync.strategy_default"))
        .addOption("newTimeMerge", $("setting.sync.strategy_new"))
        .addOption("ignoreTimeMerge", $("setting.sync.strategy_force"))
        .setValue(this.plugin.settings.offlineSyncStrategy || "")
        .onChange(async (value) => {
          this.plugin.settings.offlineSyncStrategy = value
          await this.plugin.saveSettings("offlineSyncStrategy")
          // 立即发送 ClientInfo 到服务端，使设置立即生效
          this.plugin.websocket.sendClientInfo()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.merge_strategy_desc"))

    new Setting(set)
      .setName("| " + $("setting.cloud.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    new Setting(set).setName($("setting.cloud.title")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.cloudPreviewEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.cloudPreviewEnabled) {
          this.plugin.settings.cloudPreviewEnabled = value
          await this.plugin.saveSettings()
          this.display()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.desc"))

    if (this.plugin.settings.cloudPreviewEnabled) {
      new Setting(set).setName($("setting.cloud.type_limit")).addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cloudPreviewTypeRestricted).onChange(async (value) => {
          if (value != this.plugin.settings.cloudPreviewTypeRestricted) {
            this.plugin.settings.cloudPreviewTypeRestricted = value
            await this.plugin.saveSettings()
          }
        }),
      )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.type_limit_desc"))

      new Setting(set).setName($("setting.cloud.remote_source")).addTextArea((text) =>
        text
          .setPlaceholder("prefix@.jpg$.png#http://domain.com/{path}")
          .setValue(this.plugin.settings.cloudPreviewRemoteUrl)
          .onChange(async (value) => {
            if (value != this.plugin.settings.cloudPreviewRemoteUrl) {
              this.plugin.settings.cloudPreviewRemoteUrl = value
              await this.plugin.saveSettings()
            }
          })
          .inputEl.addClass("fast-note-sync-remote-url-area"),
      )
      const remoteUrlSetting = set.lastElementChild as HTMLElement
      remoteUrlSetting.addClass("fast-note-sync-remote-url-setting")
      this.setDescWithBreaks(remoteUrlSetting, $("setting.cloud.remote_source_desc"))

      new Setting(set).setName($("setting.cloud.delete_after_upload")).addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cloudPreviewAutoDeleteLocal).onChange(async (value) => {
          if (value != this.plugin.settings.cloudPreviewAutoDeleteLocal) {
            this.plugin.settings.cloudPreviewAutoDeleteLocal = value
            await this.plugin.saveSettings()
          }
        }),
      )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.delete_after_upload_desc"))
    }

    new Setting(set)
      .setName("| " + $("setting.support.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const supportSet = set.createDiv()
    const supportRoot = createRoot(supportSet)
    supportRoot.render(<SupportView plugin={this.plugin} />)
    new Setting(set).setName($("setting.support.log")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.logEnabled).onChange(async (value) => {
        this.plugin.settings.logEnabled = value
        await this.plugin.saveSettings()
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.support.log_desc"))
    const debugDiv = set.createDiv()
    debugDiv.addClass("fast-note-sync-settings-debug")

    const debugButton = debugDiv.createEl("button")

    debugButton.setText($("setting.support.debug_copy"))
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
              lastNoteSyncTime: this.plugin.localStorageManager.getMetadata("lastNoteSyncTime"),
              lastFileSyncTime: this.plugin.localStorageManager.getMetadata("lastFileSyncTime"),
              lastConfigSyncTime: this.plugin.localStorageManager.getMetadata("lastConfigSyncTime"),
              clientName: this.plugin.localStorageManager.getMetadata("clientName"),
              isInitSync: this.plugin.localStorageManager.getMetadata("isInitSync"),
            },
            pluginVersion: this.plugin.manifest.version,
          },
          null,
          4,
        ),
      )
      new Notice($("setting.support.debug_desc"))
    }

    const feedbackButton = debugDiv.createEl("button")
    feedbackButton.setText($("setting.support.feedback"))
    feedbackButton.onclick = () => {
      window.open("https://github.com/haierkeys/obsidian-fast-note-sync/issues", "_blank")
    }

    const telegramButton = debugDiv.createEl("button")
    telegramButton.setText($("setting.support.telegram"))
    telegramButton.onclick = () => {
      window.open("https://t.me/obsidian_users", "_blank")
    }

    if (Platform.isDesktopApp) {
      const info = debugDiv.createDiv()
      info.setText($("setting.support.console_tip"))

      const keys = debugDiv.createDiv()
      keys.addClass("custom-shortcuts")
      if (Platform.isMacOS === true) {
        keys.createEl("kbd", { text: $("setting.support.console_mac") })
      } else {
        keys.createEl("kbd", { text: $("setting.support.console_win") })
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
            parts.forEach((p) => {
              const th = tr.createEl("th")
              th.innerHTML = p
            })
            tbody = table.createEl("tbody")
            fragment.appendChild(table)
          } else {
            // 检查是否为对齐行 (如 | --- | --- |)
            if (parts.every((p) => p.match(/^-+$/))) {
              return
            }
            if (tbody) {
              const tr = tbody.createEl("tr")
              parts.forEach((p) => {
                const td = tr.createEl("td")
                td.innerHTML = p
              })
            }
          }
        } else {
          // 退出表格模式
          inTable = false
          const lineSpan = document.createElement("span")
          lineSpan.innerHTML = line
          fragment.appendChild(lineSpan)
          fragment.appendChild(document.createElement("br"))
        }
      })
      descEl.appendChild(fragment)
    }
  }
}
