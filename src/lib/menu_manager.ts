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
    this.ribbonIcon = this.plugin.addRibbonIcon("wifi", "Fast Note Sync:" + $("同步全部笔记"), (event: MouseEvent) => {
      this.showRibbonMenu(event);
    });
    setIcon(this.ribbonIcon, "wifi-off");

    // 初始化状态栏进度
    this.statusBarItem = this.plugin.addStatusBarItem();

    // 初始化 笔记历史 状态栏入口
    this.historyStatusBarItem = this.plugin.addStatusBarItem();
    this.historyStatusBarItem.addClass("mod-clickable");
    setIcon(this.historyStatusBarItem, "history");
    this.historyStatusBarItem.setAttribute("aria-label", $("笔记历史"));
    this.historyStatusBarItem.addEventListener("click", () => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === "md") {
        new NoteHistoryModal(this.plugin.app, this.plugin, activeFile.path).open();
      } else {
        new Notice($("仅支持 Markdown 文件"));
      }
    });

    // 注册命令
    this.plugin.addCommand({
      id: "start-sync",
      name: $("同步全部笔记"),
      callback: () => startupSync(this.plugin),
    });

    this.plugin.addCommand({
      id: "start-full-sync",
      name: $("同步全部笔记(完整比对)"),
      callback: () => startupFullSync(this.plugin),
    });

    this.plugin.addCommand({
      id: "clean-local-sync-time",
      name: $("清理本地同步时间"),
      callback: () => resetSettingSyncTime(this.plugin),
    });
  }

  updateRibbonIcon(status: boolean) {
    this.ribbonIconStatus = status;
    if (!this.ribbonIcon) return;
    if (status) {
      setIcon(this.ribbonIcon, "wifi");
      this.ribbonIcon.setAttribute("aria-label", "Fast Note Sync: " + $("同步全部笔记") + " (" + $("服务已连接") + ")");
    } else {
      setIcon(this.ribbonIcon, "wifi-off");
      this.ribbonIcon.setAttribute("aria-label", "Fast Note Sync: " + $("同步全部笔记") + " (" + $("服务已断开") + ")");
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

      const percentage = Math.min(100, Math.round((current / total) * 100));
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

    if (this.plugin.settings.syncEnabled) {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("pause")
          .setTitle($("关闭自动同步"))
          .onClick(async () => {
            this.plugin.settings.syncEnabled = false;
            await this.plugin.saveSettings();
            new Notice($("启用笔记自动同步描述"));
          });
      });
    } else {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("play")
          .setTitle($("启动自动同步"))
          .onClick(async () => {
            this.plugin.settings.syncEnabled = true;
            await this.plugin.saveSettings();
            new Notice($("启动自动同步"));
          });
      });
    }
    menu.addSeparator();

    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloud")
        .setTitle($("同步全部笔记"))
        .onClick(async () => {
          startupSync(this.plugin);
        });
    });
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloudy")
        .setTitle($("同步全部笔记(完整比对)"))
        .onClick(async () => {
          startupFullSync(this.plugin);
        });
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





    if (this.plugin.settings.apiVersion) {
      menu.addSeparator();
      menu.addItem((item: MenuItem) => {
        item
          .setTitle($("服务端版本") + ": v" + this.plugin.settings.apiVersion)
          .setDisabled(true);
      });
    }

    menu.showAtMouseEvent(event);
  }
}
