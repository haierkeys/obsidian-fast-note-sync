import { App, Modal, Notice, MarkdownRenderer, Component, requestUrl } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";
import JSZip from "jszip";

import type FastSync from "../main";
import { dump } from "../lib/helps";
import { showSyncNotice } from "../lib/operator";
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
                showSyncNotice($("ui.version.upgrade_fail"));
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
                    showSyncNotice($("ui.version.upgrade_success"));
                    closeModal();
                }
            }, 2000);

            // 设置超时保护 (如 2分钟)
            setTimeout(() => {
                window.clearInterval(pollInterval);
                if (isUpgrading) {
                    setIsUpgrading(false);
                    showSyncNotice("Upgrade timeout or failed to detect server restart.");
                }
            }, 120000);

        } catch (e) {
            console.error("Upgrade process error:", e);
            showSyncNotice($("ui.version.upgrade_fail"));
            setIsUpgrading(false);
            plugin.websocket.register();
        }
    };

    const handlePluginUpgrade = async () => {
        setIsUpgrading(true);
        setUpgradeStatus($("ui.version.upgrading_plugin"));
        dump("Starting plugin upgrade process...");

        const latest = pluginNew;
        if (!latest) {
            dump("Error: Latest version info not found");
            showSyncNotice("Latest version information not found.");
            setIsUpgrading(false);
            return;
        }

        const source = plugin.settings.updateSource || 'github';
        const tag = latest; // User's example: tag is the version (e.g. 1.20.12-alpha)

        // Extract version part for zip filename: 1.20.12-alpha -> 1.20.12
        const versionPart = latest.split('-')[0];
        const zipFileName = `fast-note-sync-v${versionPart}.zip`;

        const baseUrl = source === 'github'
            ? `https://github.com/haierkeys/obsidian-fast-note-sync/releases/download/${tag}`
            : `https://cnb.cool/haierkeys/obsidian-fast-note-sync/-/releases/download/${tag}`;

        const pluginDir = `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
        dump(`Upgrade info: source=${source}, tag=${tag}, zipName=${zipFileName}, dir=${pluginDir}`);

        try {
            setUpgradeStatus($("ui.version.downloading_file", { file: zipFileName }));
            const url = `${baseUrl}/${zipFileName}`;
            dump(`Downloading from: ${url}`);

            let arrayBuffer: ArrayBuffer;
            // 插件升级涉及跨域下载 (GitHub/CNB)，必须使用 requestUrl 以规避 CORS 限制
            const response = await requestUrl({
                url: url,
                method: 'GET',
            });

            if (response.status !== 200) {
                dump(`Download failed with status: ${response.status}`);
                throw new Error(`Failed to download ${zipFileName}: ${response.status}`);
            }
            arrayBuffer = response.arrayBuffer;
            dump(`Download successful, size: ${arrayBuffer.byteLength} bytes`);

            // Extract Zip
            dump("Loading zip archive...");
            const zip = await JSZip.loadAsync(arrayBuffer);

            // 自动检测根目录前缀（寻找 manifest.json 所在位置）
            let rootPrefix = "";
            const manifestFile = Object.keys(zip.files).find(f => f.endsWith("manifest.json"));
            if (manifestFile) {
                rootPrefix = manifestFile.replace("manifest.json", "");
                if (rootPrefix) dump(`Detected root prefix in zip: "${rootPrefix}"`);
            }

            const files = Object.entries(zip.files).filter(([name, file]) => !file.dir && name.startsWith(rootPrefix));
            dump(`Zip file contains ${files.length} valid items`);

            for (const [realFilename, file] of files) {
                // 剔除前缀获取相对路径
                const relativeFilename = realFilename.substring(rootPrefix.length);
                if (!relativeFilename) continue;

                const content = await file.async('arraybuffer');
                const path = `${pluginDir}/${relativeFilename}`;
                dump(`Extracting file: ${realFilename} -> ${path}`);

                // Ensure parent directory exists (recursive)
                const pathParts = relativeFilename.split('/');
                if (pathParts.length > 1) {
                    let currentPath = pluginDir;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        currentPath += `/${pathParts[i]}`;
                        if (!(await plugin.app.vault.adapter.exists(currentPath))) {
                            dump(`Creating directory: ${currentPath}`);
                            await plugin.app.vault.adapter.mkdir(currentPath);
                        }
                    }
                }

                await plugin.app.vault.adapter.writeBinary(path, content);
            }

            dump("Plugin upgrade completed successfully, starting hot reload...");
            setUpgradeStatus($("ui.version.reloading_plugin"));

            const plugins = (plugin.app as any).plugins;
            const id = plugin.manifest.id;

            // 稍微延迟一下，确保 Notice 和状态更新能被识别
            await new Promise(resolve => setTimeout(resolve, 500));

            // 执行热重载：禁用 -> 重新扫描 -> 启用
            await plugins.disablePlugin(id);
            await plugins.loadManifests();
            await plugins.enablePlugin(id);

            showSyncNotice($("ui.version.upgrade_plugin_success"), 10000);
            closeModal();
        } catch (e) {
            dump(`Upgrade failed: ${e.message}`, e);
            console.error("Plugin upgrade error:", e);
            showSyncNotice($("ui.version.upgrade_fail") + ": " + e.message);
        } finally {
            setIsUpgrading(false);
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
                        canUpgrade={pluginIsNew}
                        onUpgrade={handlePluginUpgrade}
                        isUpgrading={isUpgrading}
                        status={upgradeStatus}
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
                        {isUpgrading ? status : (isPlugin ? $("ui.version.upgrade_plugin") : $("ui.version.upgrade_server"))}
                    </button>
                </div>
            )}

        </div>
    );
};
