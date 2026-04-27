import { ItemView, WorkspaceLeaf, moment, setIcon, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import { SyncLogManager, SyncLog } from "../lib/sync_log_manager";
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

const SyncLogComponent = ({ plugin }: { plugin: FastSync }) => {
    const [logs, setLogs] = React.useState<SyncLog[]>([]);
    const [isConnected, setIsConnected] = React.useState<boolean>(plugin.websocket.isConnected());
    const [hasUpgrade, setHasUpgrade] = React.useState<boolean>(
        plugin.localStorageManager.getMetadata("pluginVersionIsNew") ||
        plugin.localStorageManager.getMetadata("serverVersionIsNew")
    );
    const [showUpgradeBadge, setShowUpgradeBadge] = React.useState<boolean>(plugin.settings.showUpgradeBadge);

    // 筛选与分页状态
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    const [typeFilter, setTypeFilter] = React.useState<string>('all');
    const [showMobileFilters, setShowMobileFilters] = React.useState<boolean>(false);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const pageSize = 20;

    React.useEffect(() => {
        const handleSettingsChange = () => {
            setShowUpgradeBadge(plugin.settings.showUpgradeBadge);
        };
        (plugin.app.workspace as any).on('fns:settings-change', handleSettingsChange);
        return () => {
            (plugin.app.workspace as any).off('fns:settings-change', handleSettingsChange);
        };
    }, [plugin]);

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const throttleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingLogsRef = React.useRef<SyncLog[] | null>(null);

    React.useEffect(() => {
        const checkUpgrade = () => {
            const hasNew = plugin.localStorageManager.getMetadata("pluginVersionIsNew") ||
                plugin.localStorageManager.getMetadata("serverVersionIsNew");
            setHasUpgrade(hasNew);
        };
        checkUpgrade();
        const timer = setInterval(checkUpgrade, 3000); // 每3秒检查一次
        return () => clearInterval(timer);
    }, [plugin.localStorageManager]);

    React.useEffect(() => {
        const manager = SyncLogManager.getInstance();
        const unsubscribe = manager.subscribe((newLogs) => {
            // 节流更新:每100ms最多更新一次UI
            pendingLogsRef.current = newLogs;

            if (!throttleTimerRef.current) {
                throttleTimerRef.current = setTimeout(() => {
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
                clearTimeout(throttleTimerRef.current);
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
    }, [currentPage, categoryFilter, typeFilter]);

    // 筛选逻辑
    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
            const matchType = typeFilter === 'all' || log.type === typeFilter;
            return matchCategory && matchType;
        });
    }, [logs, categoryFilter, typeFilter]);

    // 分页逻辑
    const paginatedLogs = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, currentPage]);

    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

    // 当筛选条件改变时重置页码
    React.useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, typeFilter]);

    const clearLogs = () => {
        SyncLogManager.getInstance().clearLogs();
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

        const { Menu } = require("obsidian");
        const menu = new Menu();

        // 类别筛选子菜单
        menu.addItem((item: any) => {
            item.setTitle($("ui.log.filter_category"))
                .setIcon("layers")
                .setSection("category");
            
            const subMenu = item.setSubmenu();
            categories.forEach(cat => {
                subMenu.addItem((subItem: any) => {
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
        menu.addItem((item: any) => {
            item.setTitle($("ui.log.filter_type"))
                .setIcon("arrow-up-down")
                .setSection("type");
            
            const subMenu = item.setSubmenu();
            types.forEach(t => {
                subMenu.addItem((subItem: any) => {
                    subItem.setTitle(t.label)
                        .setChecked(typeFilter === t.id)
                        .onClick(() => setTypeFilter(t.id));
                    
                    if (t.id !== 'all') {
                        subItem.setIcon(`fns-dot-${t.id}`);
                    }
                });
            });
        });

        menu.addSeparator();
        menu.addItem((item: any) => {
            item.setTitle($("ui.button.reset"))
                .setIcon("rotate-ccw")
                .onClick(() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                });
        });

        menu.showAtMouseEvent(e.nativeEvent as MouseEvent);
    };

    return (
        <div className="fns-sync-log-container">
            <div className="fns-sync-log-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0 }}>{$("ui.log.title")}</h3>
                    <div
                        className="connection-status-container clickable-icon fns-ribbon-container"
                        onClick={(e) => plugin.menuManager.showRibbonMenu(e.nativeEvent as MouseEvent)}
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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => {
                            (plugin.app as any).setting.open();
                            (plugin.app as any).setting.openTabById(plugin.manifest.id);
                        }}
                        className="fns-sync-log-clear-btn clickable-icon"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        title={$("ui.menu.settings")}
                    >
                        <ObsidianIcon icon="settings" />
                    </button>
                    <button
                        onClick={showFilterMenu}
                        className={`fns-sync-log-clear-btn clickable-icon ${showMobileFilters ? 'is-active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        title={$("ui.log.filter")}
                    >
                        <ObsidianIcon icon="filter" />
                    </button>
                    <button onClick={clearLogs} className="fns-sync-log-clear-btn">
                        {$("ui.log.clear")}
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
                    <div className="filter-footer">
                        <button 
                            className="filter-reset-btn"
                            onClick={() => {
                                setCategoryFilter('all');
                                setTypeFilter('all');
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
                    paginatedLogs.map((log) => (
                        <div key={log.id} className={`fns-sync-log-item fns-sync-log-category-${log.category} fns-sync-log-status-${log.status} fns-sync-log-type-${log.type}`}>
                            <div className="fns-sync-log-item-header">
                                <span className="fns-sync-log-time">{moment(log.timestamp).format("HH:mm:ss")}</span>
                                <span className="fns-sync-log-action">{$(`ui.log.action.${log.action}` as any)}</span>
                                <span className="fns-sync-log-type-tag">
                                    {log.type === 'send' ? (
                                        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                                    ) : log.type === 'receive' ? (
                                        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                                    ) : null}
                                    {$(`ui.log.type_${log.type}` as any)}
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
                            {log.path && <div className="fns-sync-log-path">{log.path}</div>}
                            {log.message && !['成功', 'success'].includes(log.message.toLowerCase()) && <div className="fns-sync-log-message">{log.message}</div>}
                        </div>
                    ))
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
        </div>
    );
};
