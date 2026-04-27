import { Menu, MenuItem, setIcon, Platform } from 'obsidian';

import { startupSync, startupFullSync, resetSettingSyncTime, rebuildAllHashes } from './operator';
import { showSyncNotice } from './helps';
import { NoteHistoryModal } from '../views/note-history/history-modal';
import { ShareModal } from '../views/share-modal';
import { RecycleBinModal } from '../views/recycle-bin-modal';
import { AboutModal } from '../views/about-modal';
import { $ } from '../i18n/lang';
import FastSync from '../main';


export class MenuManager {
  private plugin: FastSync;
  private activeMenu: Menu | null = null;

  public ribbonIcon: HTMLElement;
  public ribbonIconStatus: boolean = false;
  public badgeEl: HTMLElement | null = null;
  public statusBarItem: HTMLElement;
  public historyStatusBarItem: HTMLElement;
  public shareStatusBarItem: HTMLElement;
  public logStatusBarItem: HTMLElement;
  public recycleBinStatusBarItem: HTMLElement;
  public concurrencyStatusBarItem: HTMLElement;
  private mobileStatusDot: HTMLElement | null = null;
  private mobileHeaderIconStatus: boolean = false;
  private ribbonMutationTimer: ReturnType<typeof setTimeout> | null = null;

  private statusBarText: HTMLElement;
  private statusBarFill: HTMLElement;
  private statusBarProgressBar: HTMLElement;
  private statusBarCheck: HTMLElement;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
  }

  // 必须在 onLayoutReady 之前调用，确保 Obsidian 恢复 ribbon 排序时按钮已存在
  // Must be called before onLayoutReady so Obsidian can correctly restore ribbon order
  initRibbon() {
    const initialIcon = Platform.isMobile ? "wifi" : "wifi-off";
    this.ribbonIcon = this.plugin.addRibbonIcon(initialIcon, $("ui.menu.ribbon_title"), (event: MouseEvent) => {
      this.showRibbonMenu(event);
    });
    this.ribbonIcon.addClass("fns-ribbon-container");

    this.updateRibbonIcon(false);

    // 终极护城河：直接监听 ribbonIcon 自身的 DOM 变化。
    // Obsidian 拖动重新排序时，可能会清理该元素的 innerHTML 并重新应用初始注册的 wifi-off 图标，
    // 导致我们的动态状态和红点（badge）丢失。
    // 如果发现预期的图标或红点丢失，立刻自我修复。
    // Ultimate guard: directly observe DOM changes on the ribbonIcon element.
    // When Obsidian re-orders ribbon via drag, it may clear innerHTML and re-apply the initially registered icon,
    // causing our dynamic state and badge to be lost. Self-repair immediately if expected icon or badge is missing.
    const observer = new MutationObserver(() => {
      if (!this.ribbonIcon) return;
      if (this.ribbonMutationTimer) clearTimeout(this.ribbonMutationTimer);

      this.ribbonMutationTimer = setTimeout(() => {
        const expectedIconId = Platform.isMobile ? "wifi" : (this.ribbonIconStatus ? "wifi" : "wifi-off");
        const hasCorrectIcon = this.ribbonIcon.querySelector(`.lucide-${expectedIconId}`);
        const hasBadge = this.badgeEl && this.badgeEl.parentElement === this.ribbonIcon;

        // 只要预期图标和红点还在，就不干涉（比如 iconic 追加了另一个 SVG，不影响我们的存在）
        // Only repair if expected icon or badge is missing (e.g. iconic appending another SVG is fine)
        if (!hasCorrectIcon || !hasBadge) {
          this.updateRibbonIcon(this.ribbonIconStatus);
        }
        this.ribbonMutationTimer = null;
      }, 100);
    });
    observer.observe(this.ribbonIcon, { childList: true, subtree: true });
  }

  init() {
    // 初始化状态栏进度
    this.statusBarItem = this.plugin.addStatusBarItem();

    // 初始化并发控制状态栏指示器 / Initialize concurrency control status bar indicator
    this.concurrencyStatusBarItem = this.plugin.addStatusBarItem();
    setIcon(this.concurrencyStatusBarItem, "gauge");
    this.concurrencyStatusBarItem.addClass("mod-clickable");
    this.concurrencyStatusBarItem.addEventListener("click", () => {
      // 点击图标跳转到设置面板的相关位置? 暂时只是个提示
    });

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
        showSyncNotice($("ui.history.md_only"));
      }
    });

    // 初始化 分享 状态栏入口
    this.shareStatusBarItem = this.plugin.addStatusBarItem();
    this.shareStatusBarItem.addClass("mod-clickable");
    setIcon(this.shareStatusBarItem, "share-2");
    this.shareStatusBarItem.setAttribute("aria-label", $("ui.share.title"));
    this.shareStatusBarItem.addEventListener("click", () => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === "md") {
        new ShareModal(this.plugin.app, this.plugin, activeFile.path).open();
      } else {
        showSyncNotice($("ui.history.md_only"));
      }
    });

    // 监听活动文件切换，更新分享图标颜色
    // Listen for active file changes to update share icon color
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.updateShareIconColor();
        // 切换笔记时重新注入 menu-bar 图标 / Re-inject menu-bar icon on leaf change
        if (Platform.isMobile && this.plugin.settings.mobileStatusDotPosition === 'menu-bar') {
          this.updateMobileHeaderIcon(this.mobileHeaderIconStatus);
        }
      })
    );

    // 初始化 同步日志 状态栏入口
    this.logStatusBarItem = this.plugin.addStatusBarItem();
    this.logStatusBarItem.addClass("mod-clickable");
    setIcon(this.logStatusBarItem, "arrow-down-up");
    this.logStatusBarItem.setAttribute("aria-label", $("ui.log.view_log"));
    this.logStatusBarItem.addEventListener("click", () => {
      this.plugin.activateLogView();
    });

    // 初始化 回收站 状态栏入口
    this.recycleBinStatusBarItem = this.plugin.addStatusBarItem();
    this.recycleBinStatusBarItem.addClass("mod-clickable");
    setIcon(this.recycleBinStatusBarItem, "lucide-archive-x");
    this.recycleBinStatusBarItem.setAttribute("aria-label", $("ui.recycle_bin.title"));
    this.recycleBinStatusBarItem.addEventListener("click", () => {
      new RecycleBinModal(this.plugin.app, this.plugin).open();
    });
    
    this.refreshConcurrencyIndicator();

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
      callback: () => rebuildAllHashes(this.plugin),
    });

    // 注册命令
    this.plugin.addCommand({
      id: "open-sync-log",
      name: $("ui.log.view_log"),
      callback: () => {
        this.plugin.activateLogView()
      },
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "Q" }]
    })

    this.plugin.addCommand({
      id: "open-sync-menu",
      name: $("ui.menu.ribbon_title"),
      callback: () => {
        this.showRibbonMenu()
      },
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "W" }]
    })

    this.plugin.addCommand({
      id: "open-settings",
      name: $("ui.menu.settings"),
      callback: () => {
        const setting = (this.plugin.app as any).setting
        if (setting.containerEl.parentElement !== null) {
          setting.close()
        } else {
          setting.open()
          setting.openTabById(this.plugin.manifest.id)
        }
      },
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "S" }]
    })
  }

  updateRibbonIcon(status: boolean) {
    this.ribbonIconStatus = status;
    if (!this.ribbonIcon) return;

    // 手机端固定使用 wifi 图标，桌面端根据状态切换
    // Mobile uses "wifi" fixedly, desktop switches based on status
    const iconId = Platform.isMobile ? "wifi" : (status ? "wifi" : "wifi-off");

    // 更新手机端悬浮状态点 / Update mobile floating status dot
    if (Platform.isMobile) {
      this.updateMobileStatusDot(status);
    }

    // 性能优化：避免频繁触发（如 layout-change 引起的重复刷新导致闪烁）
    // 如果存在预期的 SVG 图标，且我们自己的红点没被 Obsidian 重排时清理掉，说明状态依然是对的，无需重绘
    const hasCorrectIcon = this.ribbonIcon.querySelector(`.lucide-${iconId}`);
    if (hasCorrectIcon && this.badgeEl && this.badgeEl.parentElement === this.ribbonIcon) {
      if (status) {
        this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.connected") + ")");
      } else {
        this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.disconnected") + ")");
      }
      return;
    }

    // 只移除我们自己的 SVG 和 badge，避免破坏 iconic 等插件的自定义内容
    this.ribbonIcon.querySelectorAll("svg").forEach(el => el.remove());
    if (this.badgeEl) {
      this.badgeEl.remove();
      this.badgeEl = null;
    }

    setIcon(this.ribbonIcon, iconId);

    // 重新创建红点 / Re-create badge
    this.badgeEl = this.ribbonIcon.createDiv("fns-ribbon-badge");

    if (status) {
      this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.connected") + ")");
    } else {
      this.ribbonIcon.setAttribute("aria-label", $("ui.menu.ribbon_title") + " (" + $("setting.remote.disconnected") + ")");
    }
    this.refreshUpgradeBadge();
  }

  /**
   * 更新手机端悬浮连接状态小点
   * Update mobile floating connection status dot
   */
  updateMobileStatusDot(status: boolean) {
    const pos = this.plugin.settings.mobileStatusDotPosition || 'top-right';

    // menu-bar 模式：注入到 view-actions，不使用浮动点 / Menu-bar mode: inject into view-actions, skip floating dot
    if (pos === 'menu-bar') {
      if (this.mobileStatusDot) {
        this.mobileStatusDot.remove();
        this.mobileStatusDot = null;
      }
      document.body.querySelectorAll(".fns-mobile-status-dot").forEach(el => el.remove());
      this.updateMobileHeaderIcon(status);
      return;
    }

    // 切换回其他模式时清理注入的按钮 / Clean up injected icons when switching to other modes
    this.cleanupMobileHeaderIcons();

    // 尝试寻找 DOM 中已经存在的点，防止重复创建 (Try to find existing dot in DOM to prevent duplicates)
    if (!this.mobileStatusDot) {
      this.mobileStatusDot = document.body.querySelector(".fns-mobile-status-dot") as HTMLElement;
    }

    if (pos === 'hidden') {
      if (this.mobileStatusDot) {
        this.mobileStatusDot.remove();
        this.mobileStatusDot = null;
      }
      // 确保彻底清理 DOM 中可能残留的其它的点 (Ensure thorough cleanup of any remaining dots in DOM)
      document.body.querySelectorAll(".fns-mobile-status-dot").forEach(el => el.remove());
      return;
    }

    if (!this.mobileStatusDot) {
      this.mobileStatusDot = document.body.createDiv("fns-mobile-status-dot");
    }

    // 检查是否有多个点存在（可能由于插件重载或意外情况产生），只保留一个
    // Check for multiple dots and keep only one
    const allDots = document.body.querySelectorAll(".fns-mobile-status-dot");
    if (allDots.length > 1) {
      allDots.forEach(el => {
        if (el !== this.mobileStatusDot) el.remove();
      });
    }

    // 更新位置类 / Update position classes
    // 注意：这里需要移除所有可能的位置类，而不仅仅是重置 className
    // Note: Need to remove all possible position classes, not just reset className
    this.mobileStatusDot.className = "fns-mobile-status-dot"; // 重置 / Reset
    const posClass = pos === 'top-right' ? 'pos-tr' :
      pos === 'top-left' ? 'pos-tl' :
        pos === 'bottom-right' ? 'pos-br' : 'pos-bl';
    this.mobileStatusDot.addClass(posClass);

    if (status) {
      this.mobileStatusDot.addClass("is-connected");
    } else {
      this.mobileStatusDot.removeClass("is-connected");
    }
  }

  /**
   * 注入或更新 view-actions 中的 FNS 状态图标（menu-bar 模式）
   * Inject or update FNS status icon in view-actions (menu-bar mode)
   */
  updateMobileHeaderIcon(status: boolean) {
    this.mobileHeaderIconStatus = status;
    this.plugin.app.workspace.iterateRootLeaves((leaf) => {
      // containerEl 通常是 .workspace-leaf-content，直接向下查询 .view-actions
      // containerEl is usually .workspace-leaf-content, query .view-actions downward
      const viewActions = (leaf.view.containerEl.querySelector('.view-actions')
        ?? leaf.view.containerEl.closest?.('.workspace-leaf-content')?.querySelector('.view-actions')) as HTMLElement | null;
      if (!viewActions) return;

      let btn = viewActions.querySelector('.fns-status-action') as HTMLElement | null;
      if (!btn) {
        btn = viewActions.createEl('button', {
          cls: 'clickable-icon view-action fns-status-action fns-ribbon-container',
          attr: { 'aria-label': $("ui.menu.ribbon_title") }
        });
        viewActions.prepend(btn);
      }

      btn.empty();
      setIcon(btn, status ? 'wifi' : 'wifi-off');
      btn.createDiv("fns-ribbon-badge");
      btn.onclick = (e) => this.showRibbonMenu(e as MouseEvent);
    });
    this.refreshUpgradeBadge();
  }

  /**
   * 清理所有注入到 view-actions 中的 FNS 状态图标
   * Remove all injected FNS status icons from view-actions
   */
  cleanupMobileHeaderIcons() {
    document.querySelectorAll('.fns-status-action').forEach(el => el.remove());
  }

  /**
   * 清理 UI 元素
   * Cleanup UI elements
   */
  unload() {
    this.ribbonIcon?.remove();
    this.statusBarItem?.remove();
    this.historyStatusBarItem?.remove();
    this.shareStatusBarItem?.remove();
    this.logStatusBarItem?.remove();
    this.recycleBinStatusBarItem?.remove();

    if (this.mobileStatusDot) {
      this.mobileStatusDot.remove();
      this.mobileStatusDot = null;
    }
    // 确保彻底清理 DOM 中可能残留的其它的点 (Ensure thorough cleanup of any remaining dots in DOM)
    document.body.querySelectorAll(".fns-mobile-status-dot").forEach(el => el.remove());
    // 清理注入到 view-actions 中的图标 (Clean up icons injected into view-actions)
    this.cleanupMobileHeaderIcons();
  }

  refreshUpgradeBadge() {
    const pluginNew = this.plugin.localStorageManager.getMetadata("pluginVersionIsNew");
    const serverNew = this.plugin.localStorageManager.getMetadata("serverVersionIsNew");
    const hasNew = (pluginNew || serverNew);
    const show = hasNew ? "block" : "none";

    // 只有在开启了显示红点设置时才在外部图标上显示 / Only show on external icons if setting is enabled
    const ribbonShow = (this.plugin.settings.showUpgradeBadge && hasNew) ? "block" : "none";

    if (this.badgeEl) {
      this.badgeEl.style.display = ribbonShow;
    }
    // 同步更新 view-actions 状态图标上的红点 / Sync badge on view-actions status icon
    document.querySelectorAll('.fns-status-action .fns-ribbon-badge').forEach((el) => {
      (el as HTMLElement).style.display = ribbonShow;
    });
  }

  updateStatusBar(text: string, current?: number, total?: number) {
    if (!this.statusBarText) {
      this.statusBarItem.addClass("fast-note-sync-status-bar-progress");

      this.statusBarProgressBar = this.statusBarItem.createDiv("fast-note-sync-progress-bar");
      this.statusBarFill = this.statusBarProgressBar.createDiv("fast-note-sync-progress-fill");

      this.statusBarCheck = this.statusBarItem.createSpan("fast-note-sync-progress-check");
      setIcon(this.statusBarCheck, "check");
      this.statusBarCheck.style.display = "none";

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

      if (percentage === 100) {
        this.statusBarProgressBar.style.display = "none";
        this.statusBarCheck.style.display = "block";
      } else {
        this.statusBarProgressBar.style.display = "block";
        this.statusBarCheck.style.display = "none";
      }
    } else {
      if (text) {
        this.statusBarItem.style.display = "flex";
        this.statusBarProgressBar.style.display = "none";
        if (text === $("ui.status.completed")) {
          this.statusBarCheck.style.display = "block";
        } else {
          this.statusBarCheck.style.display = "none";
        }
        this.statusBarText.setText(text);
      } else {
        this.statusBarItem.style.display = "none";
        this.statusBarText.setText("");
      }
    }
  }

  /**
   * 刷新并发控制状态栏指示器的显示状态
   * Refresh the visibility of the concurrency control status bar indicator
   */
  public refreshConcurrencyIndicator() {
    if (!this.concurrencyStatusBarItem) return;
    
    const isEnabled = this.plugin.settings.concurrencyControlEnabled;
    const isShow = this.plugin.settings.showConcurrencyIndicator;
    
    if (isEnabled && isShow) {
        this.concurrencyStatusBarItem.style.display = "inline-flex";
        const limit = this.plugin.settings.maxConcurrentUploads;
        this.concurrencyStatusBarItem.setAttribute("aria-label", $("setting.sync.concurrency_limit_tip", { count: limit }));
    } else {
        this.concurrencyStatusBarItem.style.display = "none";
    }
  }

  showRibbonMenu(event?: MouseEvent) {
    if (this.activeMenu) {
      this.activeMenu.hide();
      this.activeMenu = null;
      return;
    }

    const menu = new Menu();
    this.activeMenu = menu;

    // 监听菜单关闭事件以便重置引用
    const originalHide = menu.hide.bind(menu);
    menu.hide = () => {
      this.activeMenu = null;
      return originalHide();
    };

    if (this.plugin.websocket.isRegister) {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("pause")
          .setTitle($("ui.menu.disable_sync"))
          .onClick(async () => {
            this.plugin.websocket.unRegister();
            showSyncNotice($("ui.menu.disable_sync_desc"));
          });
        (item as any).dom.setAttribute("aria-label", $("ui.menu.disable_sync_desc"));
      });
    } else {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("play")
          .setTitle($("ui.menu.enable_sync"))
          .onClick(async () => {
            this.plugin.websocket.register();
            showSyncNotice($("ui.menu.enable_sync_desc"));
          });
        (item as any).dom.setAttribute("aria-label", $("ui.menu.enable_sync_desc"));
      });
    }
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloud")
        .setTitle($("ui.menu.default_sync"))
        .onClick(async () => {
          startupSync(this.plugin);
        });
      (item as any).dom.setAttribute("aria-label", $("ui.menu.default_sync_desc"));
    });
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

    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("arrow-down-up")
        .setTitle($("ui.log.title"))
        .onClick(async () => {
          this.plugin.activateLogView();
        });
      (item as any).dom.setAttribute("aria-label", $("ui.log.view_log"));
    });

    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("lucide-archive-x")
        .setTitle($("ui.recycle_bin.title"))
        .onClick(async () => {
          new RecycleBinModal(this.plugin.app, this.plugin).open();
        });
      (item as any).dom.setAttribute("aria-label", $("ui.recycle_bin.title"));
    });

    // 分享中（X）菜单项，仅在有分享笔记时显示
    // Sharing (X) menu item, only shown when there are shared notes
    const sharedCount = this.plugin.shareIndicatorManager?.getSharedCount() ?? 0;
    if (sharedCount > 0) {
      menu.addSeparator();
      menu.addItem((item: MenuItem) => {
        const isActive = this.plugin.shareIndicatorManager?.isFilterActive ?? false;
        item
          .setIcon("share-2")
          .setTitle($("ui.menu.sharing", { count: sharedCount }))
          .setChecked(isActive)
          .onClick(async () => {
            this.plugin.shareIndicatorManager?.toggleFilter();
            // 激活原生文件浏览器侧边栏（筛选仅作用于原生文件浏览器）
            // Reveal native file explorer sidebar (filter only applies to native file explorer)
            const leaves = this.plugin.app.workspace.getLeavesOfType("file-explorer");
            if (leaves.length > 0) {
              this.plugin.app.workspace.revealLeaf(leaves[0]);
            }
          });
        (item as any).dom.setAttribute("aria-label", $("ui.menu.sharing_desc"));
      });
    }

    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("settings")
        .setTitle($("ui.menu.settings"))
        .onClick(async () => {
          (this.plugin.app as any).setting.open();
          (this.plugin.app as any).setting.openTabById(this.plugin.manifest.id);
        });
      (item as any).dom.setAttribute("aria-label", $("ui.menu.settings"));
    });

    const showVersion = this.plugin.settings.showVersionInfo;
    const pluginNew = this.plugin.localStorageManager.getMetadata("pluginVersionIsNew");
    const serverVersion = this.plugin.localStorageManager.getMetadata("serverVersion");
    const serverNew = this.plugin.localStorageManager.getMetadata("serverVersionIsNew");

    const showPlugin = showVersion || pluginNew;
    const showServer = serverVersion && (showVersion || serverNew);

    menu.addSeparator();

    if (showPlugin) {
      const onPluginVersionClick = () => {
        new AboutModal(this.plugin.app, this.plugin, 'plugin').open();
      };

      menu.addItem((item: MenuItem) => {
        const title = $("ui.menu.plugin") + ": v" + this.plugin.manifest.version;
        item.setTitle(title)
          .setIcon("info")
          .onClick(onPluginVersionClick);

        if (pluginNew) {
          const ariaLabel = $("ui.status.new_version", { version: this.plugin.localStorageManager.getMetadata("pluginVersionNewName") || "" });
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

            // Add red dot after text (文字后面右上红点)
            titleEl.createSpan({ cls: "fns-menu-badge" });
          }
        } else {
          (item as any).dom.setAttribute("aria-label", $("ui.menu.plugin_desc"));
        }
      });
    }

    if (showServer) {
      if (showPlugin) {
        menu.addSeparator();
      }
      const onServerVersionClick = () => {
        new AboutModal(this.plugin.app, this.plugin, 'server').open();
      };

      menu.addItem((item: MenuItem) => {
        const title = $("ui.menu.server") + ": v" + serverVersion;
        item.setTitle(title)
          .setIcon("server")
          .onClick(onServerVersionClick);

        if (serverNew) {
          const ariaLabel = $("ui.status.new_version", { version: this.plugin.localStorageManager.getMetadata("serverVersionNewName") || "" });
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

            // Add red dot after text (文字后面右上红点)
            titleEl.createSpan({ cls: "fns-menu-badge" });
          }
        } else {
          (item as any).dom.setAttribute("aria-label", $("ui.menu.server_desc"));
        }
      });
    }

    if (event) {
      menu.showAtMouseEvent(event);
    } else if (this.ribbonIcon) {
      const rect = this.ribbonIcon.getBoundingClientRect();
      menu.showAtPosition({ x: rect.left, y: rect.bottom });
    } else {
      menu.showAtPosition({ x: 0, y: 0 });
    }
  }

  /**
   * 根据当前活动笔记的分享状态更新状态栏分享图标颜色
   * Update status bar share icon color based on active note's share status
   */
  updateShareIconColor(): void {
    if (!this.shareStatusBarItem) return;
    const activeFile = this.plugin.app.workspace.getActiveFile();
    const isShared = activeFile
      && this.plugin.shareIndicatorManager?.hasPath(activeFile.path);

    const svg = this.shareStatusBarItem.querySelector("svg");
    if (svg) {
      svg.style.color = isShared ? "#4caf50" : "";
    }
  }
}
