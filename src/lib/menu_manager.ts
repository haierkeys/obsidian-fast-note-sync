import { Menu, MenuItem, Notice, setIcon, Platform } from 'obsidian';

import { startupSync, startupFullSync, resetSettingSyncTime } from './operator';
import { NoteHistoryModal } from '../views/note-history/history-modal';
import { $ } from '../lang/lang';
import FastSync from '../main';


export class MenuManager {
  private plugin: FastSync;

  public ribbonIcon: HTMLElement;
  public ribbonIconStatus: boolean = false;
  public statusBarItem: HTMLElement;
  public historyStatusBarItem: HTMLElement;

  private statusBarText: HTMLElement;
  private statusBarFill: HTMLElement;
  private statusBarProgressBar: HTMLElement;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
  }

  init() {
    // 初始化 Ribbon 图标
    this.ribbonIcon = this.plugin.addRibbonIcon("wifi", $("ui.menu.ribbon_title"), (event: MouseEvent) => {
      this.showRibbonMenu(event);
    });
    setIcon(this.ribbonIcon, "wifi-off");

    // 初始化状态栏进度
    this.statusBarItem = this.plugin.addStatusBarItem();

    // 初始化 笔记历史 状态栏入口
    this.historyStatusBarItem = this.plugin.addStatusBarItem();
    this.historyStatusBarItem.addClass("mod-clickable");
    setIcon(this.historyStatusBarItem, "history");
    this.historyStatusBarItem.setAttribute("aria-label", $("ui.history.title"));
    this.historyStatusBarItem.addEventListener("click", () => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === "md") {
        new NoteHistoryModal(this.plugin.app, this.plugin, activeFile.path).open();
      } else {
        new Notice($("ui.history.md_only"));
      }
    });

    this.plugin.addCommand({
      id: "start-full-sync",
      name: $("ui.menu.full_sync"),
      callback: () => startupFullSync(this.plugin),
    });

    this.plugin.addCommand({
      id: "clean-local-sync-time",
      name: $("ui.menu.clear_time"),
      callback: () => resetSettingSyncTime(this.plugin),
    });

    this.plugin.addCommand({
      id: "rebuild-file-hash-map",
      name: $("ui.menu.rebuild_hash"),
      callback: async () => {
        await this.plugin.fileHashManager.rebuildHashMap();
      },
    });
  }

  updateRibbonIcon(status: boolean) {
    this.ribbonIconStatus = status;
    if (!this.ribbonIcon) return;
    if (status) {
      setIcon(this.ribbonIcon, "wifi");
      this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.connected") + ")");
    } else {
      setIcon(this.ribbonIcon, "wifi-off");
      this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.disconnected") + ")");
    }
  }

  updateStatusBar(text: string, current?: number, total?: number) {
    if (!this.statusBarText) {
      this.statusBarItem.addClass("fast-note-sync-status-bar-progress");

      this.statusBarProgressBar = this.statusBarItem.createDiv("fast-note-sync-progress-bar");
      this.statusBarFill = this.statusBarProgressBar.createDiv("fast-note-sync-progress-fill");

      this.statusBarText = this.statusBarItem.createDiv("fast-note-sync-progress-text");
    }

    if (current !== undefined && total !== undefined && total > 0) {
      this.statusBarItem.style.display = "flex";
      this.statusBarProgressBar.style.display = "block";

      let percentage = Math.min(100, Math.round((current / total) * 100));

      // 确保进度不会回退
      if (percentage < this.plugin.lastStatusBarPercentage) {
        percentage = this.plugin.lastStatusBarPercentage;
      } else {
        this.plugin.lastStatusBarPercentage = percentage;
      }

      this.statusBarFill.style.width = `${percentage}%`;
      this.statusBarText.setText(`${percentage}%`);
      this.statusBarItem.setAttribute("aria-label", text);
    } else {
      if (text) {
        this.statusBarItem.style.display = "flex";
        this.statusBarProgressBar.style.display = "block";
        this.statusBarFill.style.width = "100%";
        this.statusBarText.setText(text);
      } else {
        this.statusBarItem.style.display = "none";
        this.statusBarText.setText("");
      }
    }
  }

  showRibbonMenu(event: MouseEvent) {
    const menu = new Menu();

    if (this.plugin.websocket.isRegister) {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("pause")
          .setTitle($("ui.menu.disable_sync"))
          .onClick(async () => {
            this.plugin.websocket.unRegister();
            new Notice($("ui.menu.disable_sync_desc"));
          });
        (item as any).dom.setAttribute("aria-label", $("ui.menu.disable_sync_desc"));
      });
    } else {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("play")
          .setTitle($("ui.menu.enable_sync"))
          .onClick(async () => {
            this.plugin.websocket.register((status) => this.updateRibbonIcon(status));
            new Notice($("ui.menu.enable_sync_desc"));
          });
        (item as any).dom.setAttribute("aria-label", $("ui.menu.enable_sync_desc"));
      });
    }
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloudy")
        .setTitle($("ui.menu.full_sync"))
        .onClick(async () => {
          startupFullSync(this.plugin);
        });
      (item as any).dom.setAttribute("aria-label", $("ui.menu.full_sync_desc"));
    });

    // menu.addSeparator();
    // menu.addItem((item: MenuItem) => {
    //   item
    //     .setIcon("cloudy")
    //     .setTitle($("TEST") + "TEST")
    //     .onClick(async () => {
    //       console.log("TESTqqqqq")
    //       console.table({
    //         isDesktop: Platform.isDesktop,
    //         isMobile: Platform.isMobile,
    //         isIosApp: Platform.isIosApp,
    //         isAndroidApp: Platform.isAndroidApp,
    //         isTablet: Platform.isTablet,
    //         isMacOS: Platform.isMacOS,
    //         isWindows: Platform.isWin,
    //         isLinux: Platform.isLinux,
    //         isPhone: Platform.isPhone,
    //         isMobileApp: Platform.isMobileApp,
    //         isDesktopApp: Platform.isDesktopApp,
    //       })
    //     });
    // });


    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      const title = $("ui.menu.plugin") + ": v" + this.plugin.manifest.version;
      item.setTitle(title);

      if (this.plugin.settings.pluginVersionIsNew) {
        item.onClick(() => {
          if (this.plugin.settings.pluginVersionNewLink) {
            window.open(this.plugin.settings.pluginVersionNewLink);
          }
        });
        const ariaLabel = $("ui.status.new_version", { version: this.plugin.settings.pluginVersionNewName || "" });
        (item as any).dom.setAttribute("aria-label", ariaLabel);

        const itemDom = (item as any).dom as HTMLElement;
        const titleEl = itemDom.querySelector(".menu-item-title");
        if (titleEl) {
          const iconSpan = titleEl.createSpan({ cls: "fast-note-sync-update-icon" });
          setIcon(iconSpan, "circle-arrow-up");
          iconSpan.style.color = "var(--text-success)";
          iconSpan.style.marginLeft = "4px";
          iconSpan.style.width = "14px";
          iconSpan.style.height = "14px";
          iconSpan.style.display = "inline-flex";
          iconSpan.style.verticalAlign = "top";
        }
      } else {
        item.setDisabled(true);
        (item as any).dom.setAttribute("aria-label", $("ui.menu.plugin_desc"));
      }
    });


    if (this.plugin.settings.serverVersion) {
      menu.addSeparator();
      menu.addItem((item: MenuItem) => {
        const title = $("ui.menu.server") + ": v" + this.plugin.settings.serverVersion;
        item.setTitle(title);

        if (this.plugin.settings.serverVersionIsNew) {
          item.onClick(() => {
            if (this.plugin.settings.serverVersionNewLink) {
              window.open(this.plugin.settings.serverVersionNewLink);
            }
          });
          const ariaLabel = $("ui.status.new_version", { version: this.plugin.settings.serverVersionNewName || "" });
          (item as any).dom.setAttribute("aria-label", ariaLabel);

          const itemDom = (item as any).dom as HTMLElement;
          const titleEl = itemDom.querySelector(".menu-item-title");
          if (titleEl) {
            const iconSpan = titleEl.createSpan({ cls: "fast-note-sync-update-icon" });
            setIcon(iconSpan, "circle-arrow-up");
            iconSpan.style.color = "var(--text-success)";
            iconSpan.style.marginLeft = "4px";
            iconSpan.style.width = "12px";
            iconSpan.style.height = "12px";
            iconSpan.style.display = "inline-flex";
            iconSpan.style.verticalAlign = "top";
          }
        } else {
          item.setDisabled(true);
          (item as any).dom.setAttribute("aria-label", $("ui.menu.server_desc"));
        }
      });
    }

    menu.showAtMouseEvent(event);
  }
}
