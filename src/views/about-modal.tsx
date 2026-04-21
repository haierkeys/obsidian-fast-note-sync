import { App, Modal, Notice, MarkdownRenderer, Component } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import type FastSync from "../main";
import { $ } from "../i18n/lang";


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
        contentEl.addClass("fns-about-modal-container");
        this.titleEl.setText(this.type === 'plugin' ? "插件版本" : "服务器版本");

        this.root = createRoot(contentEl);
        this.root.render(
            <AboutView plugin={this.plugin} type={this.type} closeModal={() => this.close()} />
        );
    }

    onClose() {
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
    const [pollingCount, setPollingCount] = React.useState(0);

    const pluginCurrent = plugin.manifest.version;
    const pluginNew = plugin.localStorageManager.getMetadata("pluginVersionNewName");
    const pluginIsNew = plugin.localStorageManager.getMetadata("pluginVersionIsNew");
    const pluginNewChangelog = plugin.localStorageManager.getMetadata("pluginVersionNewChangelogContent");
    const pluginCurrentChangelog = plugin.localStorageManager.getMetadata("pluginVersionChangelogContent");

    const serverCurrent = plugin.localStorageManager.getMetadata("serverVersion");
    const serverNew = plugin.localStorageManager.getMetadata("serverVersionNewName");
    const serverIsNew = plugin.localStorageManager.getMetadata("serverVersionIsNew");
    const serverNewChangelog = plugin.localStorageManager.getMetadata("serverVersionNewChangelogContent");
    const serverCurrentChangelog = plugin.localStorageManager.getMetadata("serverVersionChangelogContent");
    const serverBaseChangelog = plugin.localStorageManager.getMetadata("serverChangelog");

    const [isAdmin, setIsAdmin] = React.useState(false);

    React.useEffect(() => {
        if (type === 'server') {
            plugin.api.checkAdmin().then(res => setIsAdmin(res));
        }
    }, [type]);

    const handleUpgrade = async () => {
        setIsUpgrading(true);
        setUpgradeStatus($("ui.version.upgrading"));

        try {
            // 1. 断开 WebSocket
            plugin.websocket.unRegister();

            // 2. 发起升级请求
            const success = await plugin.api.adminUpgrade();
            if (!success) {
                new Notice($("ui.version.upgrade_fail"));
                setIsUpgrading(false);
                plugin.websocket.register(); // 尝试恢复连接
                return;
            }

            setUpgradeStatus($("ui.version.waiting_server"));

            // 3. 轮询健康检查
            const pollInterval = window.setInterval(async () => {
                setPollingCount(prev => prev + 1);
                const isAlive = await plugin.api.checkHealth();
                if (isAlive) {
                    window.clearInterval(pollInterval);

                    // 4. 重连并完成
                    plugin.websocket.register();
                    new Notice($("ui.version.upgrade_success"));
                    closeModal();
                }
            }, 2000);

            // 设置超时保护 (如 2分钟)
            setTimeout(() => {
                window.clearInterval(pollInterval);
                if (isUpgrading) {
                    setIsUpgrading(false);
                    new Notice("Upgrade timeout or failed to detect server restart.");
                }
            }, 120000);

        } catch (e) {
            console.error("Upgrade process error:", e);
            new Notice($("ui.version.upgrade_fail"));
            setIsUpgrading(false);
            plugin.websocket.register();
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
                        canUpgrade={serverIsNew && isAdmin}
                        onUpgrade={handleUpgrade}
                        isUpgrading={isUpgrading}
                        status={upgradeStatus}
                    />
                )}
            </div>
        </div>
    );
};

const VersionItem = ({
    title, current, latest, isNew, changelog, canUpgrade, onUpgrade, isUpgrading, status, isPlugin
}: {
    title: string; current: string; latest: string; isNew: boolean; changelog?: string;
    canUpgrade?: boolean; onUpgrade?: () => void; isUpgrading?: boolean; status?: string; isPlugin: boolean
}) => {
    const changelogRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (changelogRef.current && changelog) {
            changelogRef.current.empty();
            MarkdownRenderer.render(
                //@ts-ignore
                app,
                changelog,
                changelogRef.current,
                "",
                new Component()
            );
        }
    }, [changelog]);

    return (
        <div className="fns-version-item">
            <div className="fns-version-header">
                <h3>{title}</h3>
                {isNew && <span className="fns-tag fns-tag-new">New</span>}
            </div>

            <div className="fns-version-info">
                <div className="fns-version-row">
                    <span>{$("ui.version.current")}:</span>
                    <span className="fns-version-number">v{current}</span>
                </div>
                {isNew && (
                    <div className="fns-version-row">
                        <span>{$("ui.version.latest")}:</span>
                        <span className="fns-version-number fns-new-v">v{latest}</span>
                    </div>
                )}
            </div>

            {changelog && (
                <div className="fns-changelog-container">
                    <div ref={changelogRef} className="fns-changelog-content markdown-rendered" />
                </div>
            )}

            {canUpgrade && (
                <div className="fns-upgrade-actions">
                    <button
                        className={`fns-upgrade-btn ${isUpgrading ? 'is-loading' : 'mod-cta'}`}
                        disabled={isUpgrading}
                        onClick={onUpgrade}
                    >
                        {isUpgrading ? status : $("ui.version.upgrade_server")}
                    </button>
                </div>
            )}

            {!isNew && !canUpgrade && (
                <div className="fns-version-uptodate">
                    <span className="fns-icon-check">✓</span> {$("ui.version.up_to_date")}
                </div>
            )}
        </div>
    );
};
