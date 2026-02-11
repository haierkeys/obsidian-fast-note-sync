import { ItemView, WorkspaceLeaf, moment, setIcon } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import { SyncLogManager, SyncLog } from "../lib/sync_log_manager";
import { $ } from "../lang/lang";
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
        return "scroll-text";
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

const SyncLogComponent = ({ plugin }: { plugin: FastSync }) => {
    const [logs, setLogs] = React.useState<SyncLog[]>([]);
    const [isConnected, setIsConnected] = React.useState<boolean>(plugin.websocket.isConnected());
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const iconRef = React.useRef<HTMLSpanElement>(null);
    const settingsIconRef = React.useRef<HTMLSpanElement>(null);
    const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const pendingLogsRef = React.useRef<SyncLog[] | null>(null);

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
        if (iconRef.current) {
            iconRef.current.empty();
            setIcon(iconRef.current, isConnected ? "wifi" : "wifi-off");
        }
    }, [isConnected]);

    React.useEffect(() => {
        if (settingsIconRef.current) {
            settingsIconRef.current.empty();
            setIcon(settingsIconRef.current, "settings");
        }
    }, []);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // 最新在顶部
        }
    }, [logs]);

    const clearLogs = () => {
        SyncLogManager.getInstance().clearLogs();
    };

    return (
        <div className="fns-sync-log-container">
            <div className="fns-sync-log-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0 }}>{$("ui.log.title")}</h3>
                    <div
                        className="connection-status-container clickable-icon"
                        onClick={(e) => plugin.menuManager.showRibbonMenu(e.nativeEvent as MouseEvent)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                        <span
                            ref={iconRef}
                            className="connection-status-icon"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                color: isConnected ? '#4caf50' : '#f44336'
                            }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => {
                            (plugin.app as any).setting.open();
                            (plugin.app as any).setting.openTabById(plugin.manifest.id);
                        }}
                        className="fns-sync-log-clear-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={$("ui.menu.settings")}
                    >
                        <span ref={settingsIconRef} style={{ display: 'flex', alignItems: 'center' }}></span>
                        {$("ui.menu.settings")}
                    </button>
                    <button onClick={clearLogs} className="fns-sync-log-clear-btn">
                        {$("ui.log.clear")}
                    </button>
                </div>
            </div>
            <div className="fns-sync-log-list" ref={scrollRef}>
                {logs.length === 0 ? (
                    <div className="fns-sync-log-empty">{$("ui.log.empty")}</div>
                ) : (
                    logs.map((log) => (
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
                            {log.message && !['成功', 'success'].includes(log.message) && <div className="fns-sync-log-message">{log.message}</div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
