import { ItemView, WorkspaceLeaf, moment, setIcon, Platform, MenuItem, Menu, TFile, Notice, FileView, normalizePath } from "obsidian";
import { ConflictResolveModal } from "./conflict-resolve-modal";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

const safeMoment = moment as unknown as (inp?: unknown) => { format(format: string): string };

import { SyncLogManager, SyncLog } from "../lib/sync/sync_log_manager";
import { MenuItemWithInternal } from "../lib/utils/types";
import { $ } from "../i18n/lang";
import FastSync from "../main";


export const SYNC_LOG_VIEW_TYPE = "fns-sync-log-view";

export class SyncLogView extends ItemView {
    root: Root | null = null;
    plugin: FastSync;

    constructor(leaf: WorkspaceLeaf, plugin: FastSync) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return SYNC_LOG_VIEW_TYPE;
    }

    getDisplayText(): string {
        return $("ui.log.title");
    }

    getIcon(): string {
        return "arrow-down-up";
    }

    async onOpen() {
        this.root = createRoot(this.containerEl.children[1]);
        this.root.render(
            <SyncLogComponent plugin={this.plugin} />
        );
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
        }
    }
}

const ObsidianIcon = ({ icon, className, style }: { icon: string, className?: string, style?: React.CSSProperties }) => {
    const ref = React.useRef<HTMLSpanElement>(null);
    React.useEffect(() => {
        if (ref.current) {
            ref.current.empty();
            setIcon(ref.current, icon);
        }
    }, [icon]);
    return <span ref={ref} className={className} style={{ display: 'flex', alignItems: 'center', ...style }} />;
};

interface SyncSummaryStats {
    syncType?: string;
    hasChanges?: boolean;
    note?: { upload: number; modify: number; delete: number };
    file?: { upload: number; modify: number; delete: number };
    config?: { upload: number; modify: number; delete: number };
}

const SyncSummaryCard = ({ log }: { log: SyncLog }) => {
    let stats: SyncSummaryStats | null = null;
    try {
        stats = JSON.parse(log.message || '{}') as SyncSummaryStats;
    } catch {
        return null;
    }

    if (!stats) return null;

    const {
        syncType,
        note = { upload: 0, modify: 0, delete: 0 },
        file = { upload: 0, modify: 0, delete: 0 },
        config = { upload: 0, modify: 0, delete: 0 },
        hasChanges
    } = stats;

    // 辅助渲染每一行，如果该类别没有任何变更，则不显示它（符合“只展示有变化的行”）
    // Helper to render each row. If there are no changes in the category, do not display it (matching "only show changed rows")
    const renderRow = (iconClass: string, title: string, counts: { upload: number; modify: number; delete: number }) => {
        const total = counts.upload + counts.modify + counts.delete;
        if (total === 0) return null;

        return (
            <div className="fns-summary-row">
                <div className="fns-summary-label">
                    <span className={`fns-summary-dot ${iconClass}`} />
                    <span>{title}</span>
                </div>
                <div className="fns-summary-badges">
                    {counts.upload > 0 && (
                        <span 
                            className="fns-summary-badge badge-upload"
                            title={`${$("ui.log.type_send")}: ${counts.upload}`}
                        >
                            ↑{counts.upload}
                        </span>
                    )}
                    {counts.modify > 0 && (
                        <span 
                            className="fns-summary-badge badge-modify"
                            title={`${$("ui.log.type_receive")}: ${counts.modify}`}
                        >
                            ↓{counts.modify}
                        </span>
                    )}
                    {counts.delete > 0 && (
                        <span 
                            className="fns-summary-badge badge-delete"
                            title={`${($("ui.history.deleted") || $("ui.button.delete"))}: ${counts.delete}`}
                        >
                            ✗{counts.delete}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const timeStr = safeMoment(log.timestamp).format("HH:mm:ss");
    const isCancelled = log.status === 'cancelled';
    const titleText = isCancelled
        ? (syncType === 'full' 
            ? ($("ui.log.summary.title_cancelled_full") || "同步已取消 (全量)") 
            : ($("ui.log.summary.title_cancelled_inc") || "同步已取消 (增量)"))
        : (syncType === 'full' 
            ? ($("ui.log.summary.title_full") || "同步完成 (全量)") 
            : ($("ui.log.summary.title_inc") || "同步完成 (增量)"));

    return (
        <div className={`fns-sync-summary-card ${isCancelled ? 'is-cancelled-card' : ''} ${(!hasChanges || isCancelled) ? 'no-changes-card' : ''}`}>
            <div className={`fns-summary-header ${(hasChanges && !isCancelled) ? 'has-border' : ''}`}>
                <div className="fns-summary-title">
                    <ObsidianIcon icon={isCancelled ? "x-circle" : "check-circle-2"} />
                    <span>{titleText}</span>
                    {!hasChanges && !isCancelled && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '6px' }}>
                            ({$("ui.log.summary.no_changes") || "无内容变更"})
                        </span>
                    )}
                </div>
                <div className="fns-summary-meta">
                    <span className="fns-summary-type-tag">{$(`ui.log.type_${log.type}`)}</span>
                    <span>{timeStr}</span>
                </div>
            </div>
            {hasChanges && !isCancelled && (
                <div className="fns-summary-rows">
                    {renderRow("dot-note", $("ui.log.category_note") || "笔记", note)}
                    {renderRow("dot-attachment", $("ui.log.category_attachment") || "附件", file)}
                    {renderRow("dot-config", $("ui.log.category_config") || "配置", config)}
                </div>
            )}
        </div>
    );
};

const VaultScanningSummaryCard = ({ log }: { log: SyncLog }) => {
    const noteMatch = log.message?.match(/笔记:\s*(\d+)/);
    const fileMatch = log.message?.match(/附件:\s*(\d+)/);
    const configMatch = log.message?.match(/配置:\s*(\d+)/);

    const noteCount = noteMatch ? parseInt(noteMatch[1]) : 0;
    const fileCount = fileMatch ? parseInt(fileMatch[1]) : 0;
    const configCount = configMatch ? parseInt(configMatch[1]) : 0;

    const timeStr = safeMoment(log.timestamp).format("HH:mm:ss");
    
    // 根据 action 区分全量和增量并调用新增的翻译键
    // Distinguish between full and incremental action and load new translation keys
    const actionKey = log.action === "VaultScanning_full"
        ? "ui.log.action.VaultScanningSummary_full"
        : "ui.log.action.VaultScanningSummary_incremental";
    const titleText = $(actionKey) || log.action;

    return (
        <div className="fns-sync-summary-card">
            <div className="fns-summary-header has-border">
                <div className="fns-summary-title">
                    <ObsidianIcon icon="circle-chevron-right" />
                    <span>{titleText}</span>
                </div>
                <div className="fns-summary-meta">
                    <span className="fns-summary-type-tag">{$(`ui.log.type_${log.type}`)}</span>
                    <span>{timeStr}</span>
                </div>
            </div>
            <div className="fns-summary-rows">
                <div className="fns-summary-row">
                    <div className="fns-summary-label">
                        <span className="fns-summary-dot dot-note" />
                        <span>{$("ui.log.category_note") || "笔记"}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginLeft: '4px' }}>{noteCount}</span>
                </div>
                <div className="fns-summary-row">
                    <div className="fns-summary-label">
                        <span className="fns-summary-dot dot-attachment" />
                        <span>{$("ui.log.category_attachment") || "附件"}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginLeft: '4px' }}>{fileCount}</span>
                </div>
                <div className="fns-summary-row">
                    <div className="fns-summary-label">
                        <span className="fns-summary-dot dot-config" />
                        <span>{$("ui.log.category_config") || "配置"}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginLeft: '4px' }}>{configCount}</span>
                </div>
            </div>
        </div>
    );
};

interface SyncProgressState {
    pct: number;
    detail: string;
    phase: 'hash' | 'upload' | 'download' | 'idle';
    visible: boolean;
}

interface SyncProgressPayload {
    pct: number;
    detail: string;
    phase: SyncProgressState['phase'];
}

const SyncProgressBanner = ({ plugin }: { plugin: FastSync }) => {
    const [progress, setProgress] = React.useState<SyncProgressState>({
        pct: 0, detail: '', phase: 'idle', visible: false
    });

    React.useEffect(() => {
        let hideTimer: number | null = null;

        const handler = (data: SyncProgressPayload) => {
            if (hideTimer) window.clearTimeout(hideTimer);
            setProgress({ ...data, visible: true });

            if (data.pct === 100) {
                // Auto-hide 2s after completion / 完成后 2 秒自动隐藏
                hideTimer = window.setTimeout(() => {
                    setProgress(prev => ({ ...prev, visible: false }));
                }, 2000);
            }
        };

        (plugin.app.workspace as unknown as { on: (name: string, cb: (data: SyncProgressPayload) => void) => void })
            .on('fns:sync-progress', handler);

        return () => {
            if (hideTimer) window.clearTimeout(hideTimer);
            (plugin.app.workspace as unknown as { off: (name: string, cb: (data: SyncProgressPayload) => void) => void })
                .off('fns:sync-progress', handler);
        };
    }, [plugin]);

    if (!progress.visible) return null;

    const phaseIcon = progress.phase === 'hash' ? '\uD83D\uDD0D' : progress.phase === 'upload' ? '\u2191' : '\u2193';
    const isComplete = progress.pct === 100;

    return (
        <div className={`fns-mobile-progress-banner${isComplete ? ' is-complete' : ''}`}>
            <div className="fns-mobile-progress-header">
                <span className="fns-mobile-progress-phase">{isComplete ? '\u2713' : phaseIcon}</span>
                <div className="fns-mobile-progress-bar-wrap">
                    <div className="fns-mobile-progress-fill" style={{ width: `${progress.pct}%` }} />
                </div>
                <span className="fns-mobile-progress-pct">{progress.pct}%</span>
            </div>
        </div>
    );
};

const SyncLogComponent = ({ plugin }: { plugin: FastSync }) => {
    const [logs, setLogs] = React.useState<SyncLog[]>([]);

    const handleConflictLogClick = async (log: SyncLog) => {
        try {
            const data = JSON.parse(log.message || '{}');
            const file = plugin.app.vault.getFileByPath(normalizePath(log.path || ""));
            if (file) {
                const localContent = await plugin.app.vault.read(file);
                new ConflictResolveModal(
                    plugin.app,
                    plugin,
                    file,
                    localContent,
                    data.serverContent,
                    data.baseContent || "",
                    data.serverHash
                ).open();
            } else {
                new Notice($("ui.log.file_not_found") || "文件未找到");
            }
        } catch (e) {
            console.error("Failed to open ConflictResolveModal from log click:", e);
        }
    };

    const handlePathClick = async (path: string, category: string) => {
        if (category !== 'note' && category !== 'attachment') {
            return;
        }
        const file = plugin.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            // 检查文件是否已经在某个叶子（Tab）中打开，如果是则直接切换到该 Tab
            // Check if the file is already open in any leaf (Tab), if so, switch to that Tab directly
            let existingLeaf: WorkspaceLeaf | null = null;
            plugin.app.workspace.iterateAllLeaves((leaf) => {
                const view = leaf.view;
                if (view instanceof FileView && view.file && view.file.path === path) {
                    existingLeaf = leaf;
                }
            });

            if (existingLeaf) {
                plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                return;
            }

            try {
                const leaf = plugin.app.workspace.getLeaf(Platform.isMobile ? false : 'tab');
                await leaf.openFile(file);
            } catch (e) {
                console.error("Failed to open file in preferred leaf, fallback to active leaf:", e);
                const leaf = plugin.app.workspace.getLeaf(false);
                await leaf.openFile(file);
            }
        } else {
            new Notice($("ui.log.file_not_found"));
        }
    };



    const [isConnected, setIsConnected] = React.useState<boolean>(plugin.websocket.isConnected());
    const [hasUpgrade, setHasUpgrade] = React.useState<boolean>(
        plugin.versionManager.hasNewVersion()
    );
    const [showUpgradeBadge, setShowUpgradeBadge] = React.useState<boolean>(plugin.settings.showUpgradeBadge);

    // 筛选与分页状态
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    const [typeFilter, setTypeFilter] = React.useState<string>('all');
    // "仅看失败"：懒初始化时消费一次 SyncLogManager 上挂起的标记（状态栏点红点跳转时设置）
    // "Failed only": lazily consume the pending flag set on SyncLogManager once (set when jumping
    // in from the status bar red dot)
    const [onlyFailed, setOnlyFailed] = React.useState<boolean>(
        () => SyncLogManager.getInstance().consumePendingOnlyFailedFilter()
    );
    const [showMobileFilters, setShowMobileFilters] = React.useState<boolean>(false);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const pageSize = 20;

    React.useEffect(() => {
        if (onlyFailed) {
            SyncLogManager.getInstance().markFailedSeen();
        }
    }, [onlyFailed]);

    React.useEffect(() => {
        // 已挂载状态下，状态栏点击红点跳转也走此事件切到"仅看失败"
        // While already mounted, clicking the status bar red dot also switches via this event
        const handler = () => setOnlyFailed(true);
        (plugin.app.workspace as unknown as { on: (name: string, cb: () => void) => void })
            .on('fns:log-view-set-only-failed', handler);
        return () => {
            (plugin.app.workspace as unknown as { off: (name: string, cb: () => void) => void })
                .off('fns:log-view-set-only-failed', handler);
        };
    }, [plugin]);

    React.useEffect(() => {
        const handleSettingsChange = () => {
            setShowUpgradeBadge(plugin.settings.showUpgradeBadge);
        };
        (plugin.app.workspace as unknown as { on: (name: string, cb: () => void) => void }).on('fns:settings-change', handleSettingsChange);
        return () => {
            (plugin.app.workspace as unknown as { off: (name: string, cb: () => void) => void }).off('fns:settings-change', handleSettingsChange);
        };
    }, [plugin]);

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const throttleTimerRef = React.useRef<number | null>(null);
    const pendingLogsRef = React.useRef<SyncLog[] | null>(null);

    React.useEffect(() => {
        const checkUpgrade = () => {
            setHasUpgrade(plugin.versionManager.hasNewVersion());
        };
        checkUpgrade();
        // 移除 3秒一次的定时器，仅在打开视图时检查。这符合 Obsidian 审核要求，避免不必要的后台数据查询。
        // const timer = setInterval(checkUpgrade, 3000); 
        // return () => clearInterval(timer);
    }, [plugin.localStorageManager]);

    React.useEffect(() => {
        const manager = SyncLogManager.getInstance();
        const unsubscribe = manager.subscribe((newLogs) => {
            // 节流更新:每100ms最多更新一次UI
            pendingLogsRef.current = newLogs;

            if (!throttleTimerRef.current) {
                throttleTimerRef.current = window.setTimeout(() => {
                    if (pendingLogsRef.current) {
                        setLogs(pendingLogsRef.current);
                        pendingLogsRef.current = null;
                    }
                    throttleTimerRef.current = null;
                }, 100);
            }
        });

        return () => {
            unsubscribe();
            if (throttleTimerRef.current) {
                window.clearTimeout(throttleTimerRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        const listener = (status: boolean) => {
            setIsConnected(status);
        };

        plugin.websocket.addStatusListener(listener);
        return () => {
            plugin.websocket.removeStatusListener(listener);
        };
    }, [plugin.websocket]);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // 切换筛选/分页时回到顶部
        }
    }, [currentPage, categoryFilter, typeFilter, onlyFailed]);

    // 筛选逻辑
    const filteredLogs = React.useMemo(() => {
        const list = logs.filter(log => {
            const matchVault = !log.vault || log.vault === plugin.settings.vault;
            if (!matchVault) return false;

            // "仅看失败"独立于类别/方向筛选：只看失败项，跳过小结/扫描等非失败卡片
            // "Failed only" is independent of category/direction filters: only failed items,
            // skipping non-failure cards like summaries/scans
            if (onlyFailed) {
                return log.status === 'error';
            }

            if (log.category === 'summary') {
                const showSummary = (categoryFilter === 'all' || categoryFilter === 'other') && typeFilter === 'all';
                if (!showSummary) return false;
            } else {
                const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
                const matchType = typeFilter === 'all' || log.type === typeFilter;
                if (!matchCategory || !matchType) return false;
            }
            return true;
        });

        return list.sort((a, b) => {
            // 如果两个日志的时间差在 2 秒（2000ms）之内，且其中一个是同步完成小结卡片，则强制将小结卡片排在前面（即降序排序的最上方）
            // If the time difference is within 2s and one of them is the sync summary card, force summary card to be sorted first
            if (Math.abs(a.timestamp - b.timestamp) <= 2000) {
                if (a.category === 'summary' && b.category !== 'summary') return -1;
                if (b.category === 'summary' && a.category !== 'summary') return 1;
            }
            return b.timestamp - a.timestamp;
        });
    }, [logs, categoryFilter, typeFilter, onlyFailed, plugin.settings.vault]);

    // 分页逻辑
    const paginatedLogs = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, currentPage]);

    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

    // 当筛选条件改变时重置页码
    React.useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, typeFilter, onlyFailed]);

    const clearLogs = () => {
        void SyncLogManager.getInstance().clearLogs();
        setCurrentPage(1);
    };

    const categories = [
        { id: 'all', label: $("ui.log.filter_all") },
        { id: 'note', label: $("ui.log.category_note") },
        { id: 'attachment', label: $("ui.log.category_attachment") },
        { id: 'folder', label: $("ui.log.category_folder") },
        { id: 'config', label: $("ui.log.category_config") },
        { id: 'other', label: $("ui.log.category_other") },
    ];

    const types = [
        { id: 'all', label: $("ui.log.filter_all") },
        { id: 'send', label: $("ui.log.type_send") },
        { id: 'receive', label: $("ui.log.type_receive") },
    ];

    const showFilterMenu = (e: React.MouseEvent) => {
        if (Platform.isMobile) {
            setShowMobileFilters(!showMobileFilters);
            return;
        }

        const menu = new Menu();

        // 类别筛选子菜单
        menu.addItem((item: MenuItem) => {
            const internalItem = item as MenuItemWithInternal;
            internalItem.setTitle($("ui.log.filter_category"))
                .setIcon("layers")
                .setSection("category");
            
            const subMenu = internalItem.setSubmenu();
            categories.forEach(cat => {
                subMenu.addItem((subItem: MenuItem) => {
                    subItem.setTitle(cat.label)
                        .setChecked(categoryFilter === cat.id)
                        .onClick(() => setCategoryFilter(cat.id));
                    
                    if (cat.id !== 'all') {
                        subItem.setIcon(`fns-dot-${cat.id}`);
                    }
                });
            });
        });

        // 类型筛选子菜单
        menu.addItem((item: MenuItem) => {
            const internalItem = item as MenuItemWithInternal;
            internalItem.setTitle($("ui.log.filter_type"))
                .setIcon("arrow-up-down")
                .setSection("type");
            
            const subMenu = internalItem.setSubmenu();
            types.forEach(t => {
                subMenu.addItem((subItem: MenuItem) => {
                    subItem.setTitle(t.label)
                        .setChecked(typeFilter === t.id)
                        .onClick(() => setTypeFilter(t.id));
                    
                    if (t.id !== 'all') {
                        subItem.setIcon(`fns-dot-${t.id}`);
                    }
                });
            });
        });

        // "仅看失败"独立开关
        // "Failed only" standalone toggle
        menu.addSeparator();
        menu.addItem((item: MenuItem) => {
            item.setTitle($("ui.log.filter_only_failed"))
                .setIcon("octagon-alert")
                .setChecked(onlyFailed)
                .onClick(() => setOnlyFailed(prev => !prev));
        });

        menu.addSeparator();
        menu.addItem((item: MenuItem) => {
            item.setTitle($("ui.button.reset"))
                .setIcon("rotate-ccw")
                .onClick(() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                    setOnlyFailed(false);
                });
        });

        (menu as unknown as { showAtMouseEvent(e: MouseEvent): void }).showAtMouseEvent(e.nativeEvent);
    };

    return (
        <div className="fns-sync-log-container">
            <div className="fns-sync-log-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <h3 style={{ margin: 0 }}>{$("ui.log.title")}</h3>
                    <div
                        className="connection-status-container clickable-icon fns-ribbon-container"
                        onClick={(e) => plugin.menuManager.showRibbonMenu(e.nativeEvent)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                        <ObsidianIcon 
                            icon={isConnected ? "wifi" : "wifi-off"} 
                            className="connection-status-icon"
                            style={{ color: isConnected ? '#4caf50' : '#f44336' }}
                        />
                        {hasUpgrade && showUpgradeBadge && <span className="fns-ribbon-badge" style={{ display: 'block', top: '5px', right: '3px' }} />}
                    </div>
                </div>
                <div className="fns-sync-log-header-actions" style={{ display: 'flex', gap: '2px' }}>
                    <button
                        onClick={() => {
                        (plugin.app as unknown as { setting: { open: () => void, openTabById: (id: string) => void } }).setting.open();
                        (plugin.app as unknown as { setting: { open: () => void, openTabById: (id: string) => void } }).setting.openTabById(plugin.manifest.id);
                    }}
                        className="fns-sync-log-clear-btn clickable-icon"
                        title={$("ui.menu.settings")}
                    >
                        <ObsidianIcon icon="settings" />
                    </button>
                    <button
                        onClick={showFilterMenu}
                        className={`fns-sync-log-clear-btn clickable-icon ${(showMobileFilters || onlyFailed) ? 'is-active' : ''}`}
                        title={$("ui.log.filter")}
                    >
                        <ObsidianIcon icon="filter" />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="fns-sync-log-clear-btn clickable-icon"
                        title={$("ui.log.clear")}
                    >
                        <ObsidianIcon icon="brush-cleaning" />
                    </button>
                </div>
            </div>

            {/* 移动端筛选面板 */}
            {Platform.isMobile && showMobileFilters && (
                <div className="fns-sync-log-filter-panel">
                    <div className="filter-group">
                        <div className="filter-label">{$("ui.log.filter_category")}</div>
                        <div className="filter-chips">
                            {categories.map(cat => (
                                <div
                                    key={cat.id}
                                    className={`filter-chip ${categoryFilter === cat.id ? 'is-active' : ''}`}
                                    onClick={() => setCategoryFilter(cat.id)}
                                >
                                    {cat.id !== 'all' && <span className={`fns-dot-${cat.id}`} style={{ marginRight: '6px' }} />}
                                    {cat.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="filter-group">
                        <div className="filter-label">{$("ui.log.filter_type")}</div>
                        <div className="filter-chips">
                            {types.map(t => (
                                <div
                                    key={t.id}
                                    className={`filter-chip ${typeFilter === t.id ? 'is-active' : ''}`}
                                    onClick={() => setTypeFilter(t.id)}
                                >
                                    {t.id !== 'all' && <span className={`fns-dot-${t.id}`} style={{ marginRight: '6px' }} />}
                                    {t.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="filter-group">
                        <div className="filter-chips">
                            <div
                                className={`filter-chip ${onlyFailed ? 'is-active' : ''}`}
                                onClick={() => setOnlyFailed(prev => !prev)}
                            >
                                {$("ui.log.filter_only_failed")}
                            </div>
                        </div>
                    </div>
                    <div className="filter-footer">
                        <button
                            className="filter-reset-btn"
                            onClick={() => {
                                setCategoryFilter('all');
                                setTypeFilter('all');
                                setOnlyFailed(false);
                            }}
                        >
                            {$("ui.button.reset")}
                        </button>
                        <button 
                            className="filter-close-btn"
                            onClick={() => setShowMobileFilters(false)}
                        >
                            {$("ui.button.collapse")}
                        </button>
                    </div>
                </div>
            )}

            <div className="fns-sync-log-list" ref={scrollRef}>
                {paginatedLogs.length === 0 ? (
                    <div className="fns-sync-log-empty">{$("ui.log.empty")}</div>
                ) : (
                    paginatedLogs.map((log) => {
                        // 如果是同步小结卡片，则就地以卡片形式渲染，使其随时间线滚动
                        // If it is a sync summary card, render it as a card in place so it rolls with timeline
                        if (log.category === 'summary') {
                            return <SyncSummaryCard key={log.id} log={log} />;
                        }
                        // 如果是成功完成的哈希扫描，以卡片形式渲染
                        // If it is a successfully completed hash scan, render it as a card
                        if (log.action.startsWith('VaultScanning') && log.status === 'success') {
                            return <VaultScanningSummaryCard key={log.id} log={log} />;
                        }
                        // 判断是否为删除操作或配置日志。如果是，则点击时复制路径；否则打开文件。
                        // Determine if it is a delete operation or configuration log. If so, copy the path on click; otherwise, open the file.
                        const isDeleteType = log.action.toLowerCase().includes('delete');
                        const isConfigType = log.category === 'config';
                        const isCopyable = isDeleteType || isConfigType;
                        const isNoteOrAttachment = ['note', 'attachment'].includes(log.category);
                        const isOpenable = isNoteOrAttachment && !isDeleteType;

                        // 如果是 NoteManualMergeConflict 类型的日志，显示特别样式并支持点击解决
                        if (log.action === 'NoteManualMergeConflict') {
                            let data: any = {};
                            try {
                                data = JSON.parse(log.message || '{}');
                            } catch {}
                            
                            const displayMessage = data.message || $("ui.log.error_code.530") || "检测到同步冲突，需要手动处理";
                            
                            return (
                                <div key={log.id} className="fns-sync-log-item fns-sync-log-category-note fns-sync-log-status-error fns-sync-log-type-receive">
                                    <div className="fns-sync-log-item-header">
                                        <span className="fns-sync-log-time">{safeMoment(log.timestamp).format("HH:mm:ss")}</span>
                                        <span className="fns-sync-log-action" style={{ color: 'var(--text-error)', fontWeight: 'bold' }}>
                                            {$("ui.log.action.NoteManualMergeConflict") || "手动合并冲突"}
                                        </span>
                                        <span className="fns-sync-log-type-tag">
                                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                                            {$("ui.log.type_receive")}
                                        </span>
                                        <div className="fns-sync-log-header-right">
                                            <span 
                                                className="fns-sync-log-status-tag status-error clickable" 
                                                style={{ 
                                                    background: 'var(--text-error)', 
                                                    color: 'var(--text-on-accent)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleConflictLogClick(log)}
                                            >
                                                {$("ui.conflict.menu_item") || "解决冲突"}
                                            </span>
                                        </div>
                                    </div>
                                    {log.path && (
                                        <div 
                                            className="fns-sync-log-path is-clickable"
                                            onClick={() => handleConflictLogClick(log)}
                                        >
                                            <span style={{ wordBreak: 'break-all', flex: 1, fontWeight: 'bold' }}>{log.path}</span>
                                            <ObsidianIcon icon="external-link" className="fns-path-open-icon" />
                                        </div>
                                    )}
                                    <div className="fns-sync-log-message" style={{ color: 'var(--text-muted)' }}>
                                        {displayMessage}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={log.id} className={`fns-sync-log-item fns-sync-log-category-${log.category} fns-sync-log-status-${log.status} fns-sync-log-type-${log.type}`}>
                                <div className="fns-sync-log-item-header">
                                    <span className="fns-sync-log-time">{safeMoment(log.timestamp).format("HH:mm:ss")}</span>
                                    <span className="fns-sync-log-action">{$(`ui.log.action.${log.action}` as Parameters<typeof $>[0])}</span>
                                    <span className="fns-sync-log-type-tag">
                                        {log.type === 'send' ? (
                                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                                        ) : log.type === 'receive' ? (
                                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                                        ) : null}
                                        {$(`ui.log.type_${log.type}`)}
                                    </span>
                                    <div className="fns-sync-log-header-right">
                                        {log.progress !== undefined && (log.status === 'pending' || (log.status === 'success' && log.progress === 100)) && (
                                            <span className="fns-sync-log-progress-percentage">{log.progress}%</span>
                                        )}
                                        <span className={`fns-sync-log-status-tag status-${log.status}`}>
                                            {log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '...'}
                                        </span>
                                    </div>
                                </div>
                                {log.path && (
                                    <div 
                                        className={`fns-sync-log-path ${(['note', 'attachment'].includes(log.category) || isCopyable) ? 'is-clickable' : ''}`}
                                        onClick={() => {
                                            if (!log.path) return;
                                            if (isCopyable) {
                                                void navigator.clipboard.writeText(log.path);
                                                new Notice($("ui.log.path_copied") || "File path copied");
                                            } else {
                                                void handlePathClick(log.path, log.category);
                                            }
                                        }}
                                    >
                                        <span style={{ wordBreak: 'break-all', flex: 1 }}>{log.path}</span>
                                        {isCopyable && (
                                            <ObsidianIcon icon="copy" className="fns-path-copy-icon" />
                                        )}
                                        {isOpenable && (
                                            <ObsidianIcon icon="external-link" className="fns-path-open-icon" />
                                        )}
                                    </div>
                                )}
                                {log.message && !['成功', 'success'].includes(log.message.toLowerCase()) && <div className="fns-sync-log-message">{log.message}</div>}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 分页栏 */}
            {totalPages > 1 && (
                <div className="fns-sync-log-pagination">
                    <button
                        className="pagination-btn clickable-icon"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        title={$("ui.history.page_first")}
                    >
                        <ObsidianIcon icon="chevrons-left" />
                    </button>
                    <button
                        className="pagination-btn clickable-icon"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        title={$("ui.history.page_prev")}
                    >
                        <ObsidianIcon icon="chevron-left" />
                    </button>
                    <div className="pagination-info">
                        <span className="page-current">{currentPage}</span>
                        <span className="page-separator">/</span>
                        <span className="page-total">{totalPages}</span>
                    </div>
                    <button
                        className="pagination-btn clickable-icon"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        title={$("ui.history.page_next")}
                    >
                        <ObsidianIcon icon="chevron-right" />
                    </button>
                    <button
                        className="pagination-btn clickable-icon"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        title={$("ui.history.page_last")}
                    >
                        <ObsidianIcon icon="chevrons-right" />
                    </button>
                </div>
            )}

            {/* 移动端同步进度横幅（仅移动端渲染，位于底部）*/}
            {/* Mobile sync progress banner, only rendered on mobile, at the bottom */}
            {Platform.isMobile && <SyncProgressBanner plugin={plugin} />}
        </div>
    );
};
