import { App, Modal } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import type FastSync from "../main";
import { $ } from "../i18n/lang";
import { LucideIcon } from "./note-history/lucide-icon";

export class ConflictListModal extends Modal {
    private root: Root | null = null;
    private plugin: FastSync;
    public static activeInstance: ConflictListModal | null = null;

    constructor(app: App, plugin: FastSync) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        // 保证全局最多只打开一个冲突列表窗口，防抖避重叠
        if (ConflictListModal.activeInstance && ConflictListModal.activeInstance !== this) {
            try {
                ConflictListModal.activeInstance.close();
            } catch {
                // Ignore error on close // 忽略关闭时的异常
            }
        }
        ConflictListModal.activeInstance = this;

        const { contentEl } = this;
        this.titleEl.setText($("ui.menu.conflicts") || "笔记冲突");
        this.containerEl.addClass("fns-ws-clients-modal-container"); // 复用样式，保持一致

        this.root = createRoot(contentEl);
        this.root.render(
            <ConflictListView plugin={this.plugin} modal={this} />
        );
    }

    onClose() {
        if (ConflictListModal.activeInstance === this) {
            ConflictListModal.activeInstance = null;
        }
        this.containerEl.removeClass("fns-ws-clients-modal-container");
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        this.contentEl.empty();
    }
}

const ConflictListView = ({ plugin, modal }: { plugin: FastSync, modal: ConflictListModal }) => {
    // 动态同步 conflictedPaths 列表，检测到发生解决或新增时刷新
    const [conflicts, setConflicts] = React.useState<string[]>(Array.from(plugin.syncState.conflictedPaths));

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            const current = Array.from(plugin.syncState.conflictedPaths);
            if (current.length !== conflicts.length || current.some((val, idx) => val !== conflicts[idx])) {
                setConflicts(current);
            }
        }, 300);
        return () => window.clearInterval(timer);
    }, [conflicts]);

    const handleResolve = async (path: string) => {
        // 在去解决冲突时不再提前强制关闭列表页，以便用户回到列表页时能继续解决其他文件的冲突
        await plugin.menuManager.openConflictResolverForPath(path);
    };

    return (
        <div className="fns-ws-clients-view">
            <div className="fns-ws-clients-header">
                <div className="fns-ws-clients-title-group">
                    <LucideIcon icon="alert-triangle" size={20} style={{ color: 'var(--text-warning)' }} />
                    {$("ui.menu.conflicts") || "笔记冲突"}
                </div>
                <div className="fns-ws-clients-stats-group">
                    {conflicts.length > 0 && (
                        <span className="fns-ws-clients-count-badge">
                            {$("ui.conflict.list_count", { count: conflicts.length })}
                        </span>
                    )}
                </div>
            </div>

            <div className="fns-ws-clients-list">
                {conflicts.length === 0 ? (
                    <div className="fns-ws-clients-empty-state">
                        <div className="fns-empty-state fns-padding-60 fns-text-center fns-muted-text">
                            <div className="fns-margin-b-15 fns-opacity-6" style={{ color: 'var(--text-success)' }}>
                                <LucideIcon icon="check-circle" size={48} />
                            </div>
                            <div className="fns-font-lg">
                                {$("ui.conflict.list_empty")}
                            </div>
                        </div>
                    </div>
                ) : (
                    conflicts.map((path) => {
                        const fileName = path.split(/[\\/]/).pop() || "";
                        return (
                            <div 
                                key={path} 
                                className="fns-ws-clients-item mod-clickable"
                                onClick={() => { void handleResolve(path); }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="fns-ws-clients-item-top">
                                    <div className="fns-ws-clients-item-main">
                                        <div className="fns-ws-clients-item-icon-wrapper">
                                            <LucideIcon icon="file-warning" size={16} style={{ color: 'var(--text-warning)' }} />
                                        </div>
                                        <div className="fns-ws-clients-item-identity">
                                            <div className="fns-ws-clients-item-name-row" style={{ fontWeight: 'bold' }}>
                                                {fileName}
                                            </div>
                                            <div className="fns-ws-clients-item-address-line">
                                                {path}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        className="fns-ws-clients-item-type-tag"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleResolve(path);
                                        }}
                                        style={{ 
                                            background: 'var(--interactive-accent)', 
                                            color: 'var(--text-on-accent)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {$("ui.conflict.menu_item")}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
