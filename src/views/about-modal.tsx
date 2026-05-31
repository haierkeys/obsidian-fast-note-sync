import { App, Modal, MarkdownRenderer, Component } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import type FastSync from "../main";
import { dumpError } from "../lib/helps";
import { showSyncNotice } from "../lib/helps";
import { $ } from "../i18n/lang";
import { LucideIcon } from "./note-history/lucide-icon";


/**
 * 版本信息及升级弹窗
 */
export class AboutModal extends Modal {
    private root: Root | null = null;

    constructor(app: App, private plugin: FastSync, private type: 'plugin' | 'server') {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        this.containerEl.addClass("fns-about-modal-container");
        this.titleEl.setText(this.type === 'plugin' ? "插件版本" : "服务器版本");

        this.root = createRoot(contentEl);
        this.root.render(
            <AboutView plugin={this.plugin} type={this.type} closeModal={() => this.close()} />
        );
    }

    onClose() {
        this.containerEl.removeClass("fns-about-modal-container");
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        this.contentEl.empty();
    }
}

const AboutView = ({ plugin, type, closeModal }: { plugin: FastSync; type: 'plugin' | 'server'; closeModal: () => void }) => {
    const [isUpgrading, setIsUpgrading] = React.useState(false);
    const [upgradeStatus, setUpgradeStatus] = React.useState("");

    const versionData = React.useMemo(() => plugin.versionManager.getVersionData(), [plugin]);
    const { plugin: pluginInfo, server: serverInfo } = versionData;

    const pluginCurrent = pluginInfo.current;
    const pluginNew = pluginInfo.latest;
    const pluginIsNew = pluginInfo.isNew;
    const pluginNewChangelog = pluginInfo.newChangelog;
    const pluginCurrentChangelog = pluginInfo.currentChangelog;
    const pluginHistory = pluginInfo.history;

    const serverCurrent = serverInfo.current;
    const serverNew = serverInfo.latest;
    const serverIsNew = serverInfo.isNew;
    const serverNewChangelog = serverInfo.newChangelog;
    const serverCurrentChangelog = serverInfo.currentChangelog;
    const serverBaseChangelog = serverInfo.baseChangelog;
    const serverHistory = serverInfo.history;

    const [isAdmin, setIsAdmin] = React.useState(false);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const isMounted = React.useRef(true);

    React.useEffect(() => {
        isMounted.current = true;
        abortControllerRef.current = new AbortController();
        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    React.useEffect(() => {
        if (type === 'server') {
            void plugin.api.checkAdmin(abortControllerRef.current?.signal).then(res => {
                if (isMounted.current) setIsAdmin(res);
            });
        }
    }, [type, plugin.api]);

    const handleUpgrade = async () => {
        setIsUpgrading(true);
        try {
            await plugin.versionManager.upgradeServer((status) => {
                if (isMounted.current) setUpgradeStatus(status);
            }, abortControllerRef.current?.signal);
            
            if (isMounted.current) setUpgradeStatus("");
        } catch (e) {
            dumpError("Upgrade server error:", e);
            showSyncNotice($("ui.version.upgrade_fail") + ": " + (e instanceof Error ? e.message : String(e)));
        } finally {
            if (isMounted.current) setIsUpgrading(false);
        }
    };

    const handlePluginUpgrade = async () => {
        setIsUpgrading(true);
        try {
            await plugin.versionManager.upgradePlugin((status) => {
                if (isMounted.current) setUpgradeStatus(status);
            }, abortControllerRef.current?.signal);

            if (isMounted.current) {
                closeModal();
            }
        } catch (e) {
            dumpError("Upgrade plugin error:", e);
            showSyncNotice($("ui.version.upgrade_fail") + ": " + (e instanceof Error ? e.message : String(e)));
        } finally {
            if (isMounted.current) setIsUpgrading(false);
        }
    };

    return (
        <div className="fns-about-view">
            <div className="fns-version-section">
                {type === 'plugin' && (
                    <VersionItem
                        title="Fast Note Sync For Obsidian"
                        isPlugin={true}
                        current={pluginCurrent}
                        latest={pluginIsNew ? pluginNew : pluginCurrent}
                        isNew={pluginIsNew}
                        changelog={pluginNewChangelog || pluginCurrentChangelog}
                        history={pluginHistory}
                        canUpgrade={pluginIsNew}
                        onUpgrade={() => { void handlePluginUpgrade(); }}
                        isUpgrading={isUpgrading}
                        status={upgradeStatus}
                        app={plugin.app}
                    />
                )}

                {type === 'server' && (
                    <VersionItem
                        title="Fast Note Sync Service"
                        isPlugin={false}
                        current={serverCurrent || "0.0.0"}
                        latest={serverIsNew ? serverNew : serverCurrent}
                        isNew={serverIsNew}
                        changelog={serverNewChangelog || serverCurrentChangelog || serverBaseChangelog}
                        history={serverHistory}
                        canUpgrade={serverIsNew && isAdmin}
                        onUpgrade={() => { void handleUpgrade(); }}
                        isUpgrading={isUpgrading}
                        status={upgradeStatus}
                        app={plugin.app}
                    />
                )}
            </div>
        </div>
    );
};

/**
 * 独立的 Markdown 更新日志渲染组件 (Standalone Markdown Changelog Renderer)
 */
const ChangelogRenderer = ({ app, content }: { app: App; content: string }) => {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (content && ref.current) {
            ref.current.empty();
            const component = new Component();
            void MarkdownRenderer.render(
                app,
                content,
                ref.current,
                "",
                component
            );
        }
    }, [content, app]);

    return <div ref={ref} className="fns-changelog-content markdown-rendered" />;
};

/**
 * 历史版本折叠项组件 (Collapsible Changelog History Item)
 */
const ChangelogHistoryItem = ({
    app, version, content, defaultOpen, isOpenControlled
}: {
    app: App; version: string; content: string; defaultOpen: boolean;
    isOpenControlled?: boolean;
}) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    // 监听外部受控的打开状态，以支持从提示框点击一键强开
    // Listen to external controlled open state, supporting one-click expand from hint bar
    React.useEffect(() => {
        if (isOpenControlled !== undefined) {
            setIsOpen(isOpenControlled);
        }
    }, [isOpenControlled]);

    return (
        <div className={`fns-changelog-history-item ${isOpen ? 'is-expanded' : 'is-collapsed'}`}>
            <div 
                className="fns-changelog-history-header fns-clickable" 
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <span className="fns-changelog-history-version">v{version}</span>
                <LucideIcon 
                    icon={isOpen ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    className="fns-changelog-history-toggle"
                />
            </div>
            {isOpen && (
                <div className="fns-changelog-history-body" style={{ marginTop: '10px' }}>
                    <ChangelogRenderer app={app} content={content} />
                </div>
            )}
        </div>
    );
};

const VersionItem = ({
    title, current, latest, isNew, changelog, history, canUpgrade, onUpgrade, isUpgrading, status, isPlugin, app
}: {
    title: string; current: string; latest: string; isNew: boolean; changelog?: string;
    history?: { version: string; changelogContent: string }[];
    canUpgrade?: boolean; onUpgrade?: () => void; isUpgrading?: boolean; status?: string; isPlugin: boolean;
    app: App;
}) => {
    const [firstHistoryOpen, setFirstHistoryOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // 点击提示词：一键强制展开第一个历史版本，并极其平滑地滚动对齐该卡片头部
    // Click hint: one-key expand the first intermediate version, and smooth scroll into view
    const handleHintClick = () => {
        setFirstHistoryOpen(true);
        window.setTimeout(() => {
            const firstHistoryItem = containerRef.current?.querySelector('.fns-changelog-history-item');
            if (firstHistoryItem) {
                firstHistoryItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    return (
        <div className="fns-version-item" ref={containerRef}>
            <div className="fns-version-header">
                <h3>{title}</h3>
                {isNew && <span className="fns-tag fns-tag-new">New</span>}
            </div>

            <div className="fns-version-info">
                <div className="fns-version-row fns-version-row-between">
                    <div className="fns-version-left">
                        <span>{$("ui.version.current")}:</span>
                        <span className="fns-version-number">v{current}</span>
                    </div>

                    {isNew ? (
                        <div className="fns-version-right">
                            <span>{$("ui.version.latest")}:</span>
                            <span className="fns-version-number fns-new-v">v{latest}</span>
                        </div>
                    ) : (
                        !canUpgrade && (
                            <div className="fns-version-uptodate">
                                <span className="fns-icon-check">✓</span> {$("ui.version.up_to_date")}
                            </div>
                        )
                    )}
                </div>
            </div>

            {((history && history.length > 0) || changelog) && (
                <div className="fns-changelog-scroll-area">
                    {(() => {
                        const cleanVer = (v: string) => v ? v.replace(/^v/i, '').trim() : '';
                        const latestClean = cleanVer(latest);
                        const latestHistoryItem = history?.find(h => cleanVer(h.version) === latestClean);
                        const latestChangelog = latestHistoryItem ? latestHistoryItem.changelogContent : changelog;
                        
                        // 版本对比降序排序函数 (Version comparison descending sort function)
                        const compareVersions = (v1: string, v2: string) => {
                            const parts1 = cleanVer(v1).split('.').map(Number);
                            const parts2 = cleanVer(v2).split('.').map(Number);
                            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                                const p1 = parts1[i] || 0;
                                const p2 = parts2[i] || 0;
                                if (p1 !== p2) return p2 - p1;
                            }
                            return 0;
                        };

                        // 只有当有新版本要升级时（isNew === true）才提取显示中间历史版本并降序排序
                        // Only extract, show and sort intermediate versions when there is a new version to upgrade (isNew === true)
                        const intermediateVersions = (isNew && history)
                            ? history.filter(h => cleanVer(h.version) !== latestClean).sort((a, b) => compareVersions(a.version, b.version))
                            : [];

                        return (
                            <>
                                {latestChangelog && (
                                    <div className="fns-changelog-container">
                                        <ChangelogRenderer app={app} content={latestChangelog} />
                                    </div>
                                )}
                                {/* 
                                 * 如果存在中间历史版本，在最新版本卡片外部渲染一个独立的粘性滚动提示
                                 * If there are intermediate history versions, render an independent sticky scroll hint below the latest card
                                 */}
                                {latestChangelog && intermediateVersions.length > 0 && (
                                    <div 
                                        className="fns-changelog-scroll-hint"
                                        onClick={handleHintClick}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span>{$("ui.version.has_intermediate_versions_below") || "💡 下方还有中间历史版本，可滚动查看 🔽"}</span>
                                    </div>
                                )}
                                {intermediateVersions.length > 0 && (
                                    <div className="fns-changelog-intermediate-section">
                                        <div className="fns-changelog-intermediate-title">
                                            {$("ui.version.intermediate_versions") || "中间版本"}
                                        </div>
                                        <div className="fns-changelog-history-list">
                                            {intermediateVersions.map((item, index) => (
                                                <ChangelogHistoryItem 
                                                    key={item.version}
                                                    app={app}
                                                    version={item.version}
                                                    content={item.changelogContent}
                                                    defaultOpen={false}
                                                    isOpenControlled={index === 0 ? (firstHistoryOpen || undefined) : undefined}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {canUpgrade && (
                <div className="fns-upgrade-actions">
                    <button
                        className={`fns-upgrade-btn ${isUpgrading ? 'is-loading' : 'mod-cta'}`}
                        disabled={isUpgrading}
                        onClick={onUpgrade}
                    >
                        <LucideIcon 
                            icon={isUpgrading ? "refresh-cw" : "arrow-up-circle"} 
                            size={16} 
                            className={isUpgrading ? "is-spinning" : ""} 
                        />
                        {isUpgrading ? status : (isPlugin ? $("ui.version.upgrade_plugin") : $("ui.version.upgrade_server"))}
                    </button>
                </div>
            )}

        </div>
    );
};
